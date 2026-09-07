const { test } = require("node:test");
const assert = require("node:assert/strict");
const { LlmService } = require("../dist/llm/llm.service");

test("group requests carry max_tokens and cancel the provider reader when the consumer stops", async (t) => {
  const original = global.fetch;
  t.after(() => { global.fetch = original; });
  let cancelled = false;
  const signal = new AbortController().signal;
  global.fetch = async (_, options) => {
    const body = JSON.parse(options.body);
    assert.equal(options.signal, signal);
    assert.equal(body.max_tokens, 180);
    assert.equal(body.model, "google/gemini-2.5-flash");
    assert.deepEqual(body.reasoning, { effort: "none" });
    return new Response(new ReadableStream({
      start(controller) { controller.enqueue(new TextEncoder().encode('data: {"choices":[{"delta":{"content":"한마디"}}]}\n\n')); },
      cancel() { cancelled = true; },
    }));
  };
  for await (const event of new LlmService().stream([{ role: "user", content: "안녕" }], { maxTokens: 180, signal, model: "google/gemini-2.5-flash" })) {
    assert.equal(event.text, "한마디");
    break;
  }
  assert.equal(cancelled, true);
});

test("upstream in-stream errors are not swallowed and custom models keep their reasoning defaults", async (t) => {
  const original = global.fetch;
  t.after(() => { global.fetch = original; });
  global.fetch = async (_, options) => {
    assert.equal(JSON.parse(options.body).reasoning, undefined);
    return new Response('data: {"error":{"message":"provider unavailable"}}\n\n');
  };
  await assert.rejects(async () => {
    for await (const _ of new LlmService().stream([{ role: "user", content: "안녕" }], { maxTokens: 180, model: "custom/model" })) {}
  }, /provider unavailable/);
});
