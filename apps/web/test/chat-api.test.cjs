const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const Module = require("node:module");
const ts = require("typescript");

function api(t, fetch) {
  const originalFetch = global.fetch;
  const originalWindow = global.window;
  const originalStorage = global.localStorage;
  global.fetch = fetch;
  global.window = { localStorage: { getItem: () => "test-token" } };
  global.localStorage = global.window.localStorage;
  // Compile in memory so production API code is exercised without adding a test runtime dependency.
  const filename = join(__dirname, "../lib/api.ts");
  const source = ts.transpileModule(readFileSync(filename, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const mod = new Module(filename, module);
  mod._compile(source, filename);
  t.after(() => { global.fetch = originalFetch; global.window = originalWindow; global.localStorage = originalStorage; });
  return mod.exports;
}

function stream(events, chunkBytes = 7) {
  const bytes = new TextEncoder().encode(events.map((e) => `data: ${JSON.stringify(e)}\n\n`).join(""));
  return new Response(new ReadableStream({ start(controller) {
    for (let i = 0; i < bytes.length; i += chunkBytes) controller.enqueue(bytes.slice(i, i + chunkBytes));
    controller.close();
  } }));
}

test("group SSE preserves speaker boundaries even when Korean UTF-8 bytes split across packets", async (t) => {
  const events = [
    { type: "speaker", speakerUuid: "a", messageId: "one", turn: 1, maxTurns: 4 },
    { type: "delta", delta: "안녕, 반가워요!" }, { type: "messageEnd" },
    { type: "speaker", speakerUuid: "b", messageId: "two", turn: 2, maxTurns: 4 },
    { type: "delta", delta: "같이 놀아요." }, { type: "messageEnd" },
    { type: "done", waitingForUser: true },
  ];
  const client = api(t, async () => stream(events));
  const received = [];
  await client.streamChat("room", "안녕", (delta) => received.push({ type: "delta", delta }), { onEvent: (e) => received.push(e) });
  assert.deepEqual(received, events);
});

test("existing 1:1 SSE still returns deltas with legacy done marker", async (t) => {
  const client = api(t, async () => stream([{ delta: "반가워요" }, { done: true }]));
  let content = "";
  await client.streamChat("room", "안녕", (delta) => { content += delta; });
  assert.equal(content, "반가워요");
});

test("truncated and failed streams surface an error instead of silently succeeding", async (t) => {
  let fail = false;
  const client = api(t, async () => stream(fail ? [{ error: "잠시 멈췄어요" }] : [{ delta: "부분 답변" }]));
  await assert.rejects(client.streamChat("room", "안녕", () => {}), /연결이 끊겼어요/);
  fail = true;
  await assert.rejects(client.streamChat("room", "안녕", () => {}), /잠시 멈췄어요/);
});

test("abort signal is forwarded to fetch, and older servers hide the feature", async (t) => {
  const controller = new AbortController();
  const client = api(t, async (url, options) => {
    if (url.endsWith("/chat/features")) return new Response("{}", { status: 404 });
    assert.equal(options.signal, controller.signal);
    return stream([{ done: true }]);
  });
  await client.streamChat("room", "안녕", () => {}, { signal: controller.signal });
  assert.deepEqual(await client.chatFeatures(), { groupChat: false });
});

test("concurrent guest bootstrap requests share a single account", async (t) => {
  let requests = 0;
  const client = api(t, async () => { requests++; return Response.json({ token: "same-guest" }); });
  global.window.localStorage.getItem = () => null;
  global.localStorage.setItem = () => {};
  const tokens = await Promise.all([client.ensureGuest(), client.ensureGuest(), client.ensureGuest()]);
  assert.deepEqual(tokens, ["same-guest", "same-guest", "same-guest"]);
  assert.equal(requests, 1);
});
