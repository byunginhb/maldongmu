const { test } = require("node:test");
const assert = require("node:assert/strict");
const { setTimeout: delay } = require("node:timers/promises");
const { fixture, ResponseStub } = require("./chat-fixture.cjs");
const { DbService } = require("../dist/db/db.service");
const { GROUP_LIMITS, cleanGroupReply } = require("../dist/chat/group-chat.service");

test("additive migration is repeatable and keeps existing 1:1 history", (t) => {
  const f = fixture(); t.after(f.close);
  const c = f.chat.createConversation("owner", "a");
  f.chat.saveTurn("owner", c.id, "a", "기존 이야기", "기억하고 있어요", 10, 5);
  f.db.exec("ALTER TABLE conversations DROP COLUMN second_persona_uuid; ALTER TABLE messages DROP COLUMN speaker_uuid;");
  DbService.prototype.migrate.call({ db: f.db });
  DbService.prototype.migrate.call({ db: f.db });
  assert.equal(f.chat.getConversation("owner", c.id).messages.length, 2);
  assert.equal(f.chat.getConversation("owner", c.id).personas.length, 1);
});

test("daily pair is stable, distinct, and still uses the guest conversation limit", (t) => {
  const f = fixture(); t.after(f.close);
  const a = f.group.today("owner");
  const b = f.group.today("other");
  assert.equal(a.personas.length, 2);
  assert.notEqual(a.personas[0].uuid, a.personas[1].uuid);
  assert.deepEqual(a.personas, b.personas);
  for (let i = 0; i < Number(process.env.GUEST_CONVERSATION_LIMIT || 5); i++) f.group.today("guest");
  assert.throws(() => f.group.today("guest"), (e) => e.getStatus() === 403);
});

test("invitation keeps history, records the joining speaker, and forbids duplicate/third/foreign invitations", (t) => {
  const f = fixture(); t.after(f.close);
  const c = f.chat.createConversation("owner", "a");
  f.chat.saveTurn("owner", c.id, "a", "오늘 힘들었어", "같이 이야기해요", 10, 5);
  assert.throws(() => f.group.invite("other", c.id, "b"), (e) => e.getStatus() === 404);
  assert.throws(() => f.group.invite("owner", c.id, "a"), (e) => e.getStatus() === 400);
  assert.throws(() => f.group.invite("owner", c.id, "missing"));
  assert.equal(f.chat.getConversation("owner", c.id).personas.length, 1);
  const joined = f.group.invite("owner", c.id, "b");
  assert.equal(joined.messages.length, 3);
  assert.equal(joined.messages[0].content, "오늘 힘들었어");
  assert.equal(joined.messages[2].speakerUuid, "b");
  assert.throws(() => f.group.invite("owner", c.id, "b"), (e) => e.getStatus() === 409);
  assert.throws(() => f.group.invite("owner", c.id, "c"), (e) => e.getStatus() === 409);
  assert.equal(f.chat.listConversations("owner")[0].secondName, "박영수");
  assert.equal(f.calls.length, 0);
});

test("group greetings cost no calls and do not duplicate on reconnect", (t) => {
  const f = fixture(); t.after(f.close);
  const c = f.chat.createConversation("owner", "a", "b");
  const first = f.controller.greeting({ userId: "owner" }, c.id, {});
  assert.equal(first.messages.length, 2);
  assert.deepEqual(first.messages.map((m) => m.speakerUuid), ["a", "b"]);
  assert.equal(f.controller.greeting({ userId: "owner" }, c.id, {}).messages.length, 2);
  assert.equal(f.calls.length, 0);
});

test("one user message produces exactly four alternating bounded replies, then waits", async (t) => {
  const f = fixture(); t.after(f.close);
  const c = f.chat.createConversation("owner", "a", "b");
  const res = new ResponseStub();
  await f.controller.send({ userId: "owner" }, c.id, { message: "오늘 뭐 먹었어?" }, res);
  assert.equal(f.calls.length, 4);
  assert.deepEqual(res.events().filter((e) => e.type === "speaker").map((e) => e.speakerUuid), ["a", "b", "a", "b"]);
  assert.deepEqual(res.events().at(-1), { type: "done", waitingForUser: true });
  assert.ok(f.calls.every((call) => call.options.maxTokens === 180));
  assert.ok(f.calls[1].messages.some((m) => m.content.startsWith("[김하늘]")));
  assert.match(f.calls[3].messages.at(-1).content, /사용자에게 직접/);
  const stored = f.chat.getConversation("owner", c.id).messages;
  assert.equal(stored.filter((m) => m.role === "user").length, 1);
  assert.equal(stored.filter((m) => m.role === "assistant").length, 4);
  assert.equal(f.db.prepare("SELECT SUM(tokens) AS total FROM usage_events WHERE event = 'message'").get().total, 520);
  f.group.assertIdle("owner");
});

test("interrupt aborts the upstream stream, persists partial output and releases the user gate", async (t) => {
  let signal;
  let started;
  const ready = new Promise((resolve) => { started = resolve; });
  const f = fixture(async function* (_, options) {
    signal = options.signal;
    yield { type: "delta", text: "그러니까 저는" };
    started();
    await delay(20_000, undefined, { signal });
    yield { type: "delta", text: "이건 나오면 안 돼요" };
  });
  t.after(f.close);
  const c = f.chat.createConversation("owner", "a", "b");
  const request = f.controller.send({ userId: "owner" }, c.id, { message: "재미있는 얘기" }, new ResponseStub());
  await ready;
  assert.throws(() => f.group.acquire("owner", "another-room"), (e) => e.getStatus() === 409);
  const solo = f.chat.createConversation("owner", "c");
  assert.throws(() => f.group.invite("owner", solo.id, "a"), (e) => e.getStatus() === 409);
  await assert.rejects(f.group.stop("other", c.id), (e) => e.getStatus() === 404);
  assert.equal(signal.aborted, false);
  const snapshot = await f.group.stop("owner", c.id);
  await request;
  assert.equal(signal.aborted, true);
  assert.equal(f.calls.length, 1);
  assert.deepEqual(snapshot.messages.map((m) => m.content), ["재미있는 얘기", "그러니까 저는"]);
  assert.equal(f.chat.countUserMessages("owner"), 1);
  f.group.assertIdle("owner");
});

test("disconnect cancels the round and never starts another speaker", async (t) => {
  let started;
  const ready = new Promise((resolve) => { started = resolve; });
  const f = fixture(async function* (_, options) {
    yield { type: "delta", text: "잠깐" };
    started();
    await delay(20_000, undefined, { signal: options.signal });
  });
  t.after(f.close);
  const c = f.chat.createConversation("owner", "a", "b");
  const res = new ResponseStub();
  const pending = f.controller.send({ userId: "owner" }, c.id, { message: "안녕" }, res);
  await ready;
  res.destroyed = true;
  res.emit("close");
  await pending;
  assert.equal(f.calls.length, 1);
  assert.equal(f.chat.getConversation("owner", c.id).messages.at(-1).content, "잠깐");
  f.group.assertIdle("owner");
});

test("quota/daily/empty-message rejection happens before generation and does not leave a lock", async (t) => {
  const f = fixture(); t.after(f.close);
  const c = f.chat.createConversation("owner", "a", "b");
  f.db.prepare("UPDATE users SET message_limit = 0 WHERE id = 'owner'").run();
  await assert.rejects(f.controller.send({ userId: "owner" }, c.id, { message: "안녕" }, new ResponseStub()), (e) => e.getStatus() === 403);
  f.group.assertIdle("owner");
  f.db.prepare("UPDATE users SET message_limit = 100 WHERE id = 'owner'").run();
  await assert.rejects(f.controller.send({ userId: "owner" }, c.id, { message: "  " }, new ResponseStub()), (e) => e.getStatus() === 400);
  for (let i = 0; i < GROUP_LIMITS.dailyRounds; i++) f.group.reserve("owner", c.id, "반가워");
  await assert.rejects(f.controller.send({ userId: "owner" }, c.id, { message: "또" }, new ResponseStub()), /하루 20번/);
  f.group.assertIdle("owner");
  assert.equal(f.calls.length, 0);
  assert.equal(f.chat.countUserMessages("owner"), 20);
});

test("guest message cap also applies after inviting a friend", (t) => {
  const f = fixture(); t.after(f.close);
  const c = f.chat.createConversation("guest", "a");
  for (let i = 0; i < Number(process.env.GUEST_MESSAGE_LIMIT || 5); i++) f.chat.saveTurn("guest", c.id, "a", "안녕", "반가워", 0, 0);
  f.group.invite("guest", c.id, "b");
  assert.throws(() => f.group.reserve("guest", c.id, "더"), (e) => e.getStatus() === 403);
});

test("history keeps the latest topic, speaker identity and a bounded character budget", (t) => {
  const f = fixture(); t.after(f.close);
  const c = f.chat.createConversation("owner", "a");
  for (let i = 0; i < 40; i++) f.chat.saveTurn("owner", c.id, "a", "가".repeat(1900), "기존 답변", 0, 0);
  f.group.invite("owner", c.id, "b");
  f.group.reserve("owner", c.id, "이번 주말에는 어디 갈까?");
  const messages = f.group.buildMessages(c.id, f.cards[1], f.cards[0], false);
  const history = messages.slice(1, -1);
  assert.ok(history.reduce((n, m) => n + m.content.length, 0) <= GROUP_LIMITS.historyChars);
  assert.ok(history.some((m) => m.content === "[사용자] 이번 주말에는 어디 갈까?"));
  assert.ok(history.some((m) => m.content === "[김하늘] 기존 답변"));
  assert.ok(messages.reduce((n, m) => n + m.content.length, 0) < 11000);
});

test("provider failure persists partial text, consumes one reservation, and stops without retry", async (t) => {
  const f = fixture(async function* () {
    yield { type: "delta", text: "한마디만" };
    throw new Error("simulated provider failure");
  });
  t.after(f.close);
  const c = f.chat.createConversation("owner", "a", "b");
  const res = new ResponseStub();
  await f.controller.send({ userId: "owner" }, c.id, { message: "안녕" }, res);
  assert.equal(f.calls.length, 1);
  assert.ok(res.events().some((e) => e.error));
  assert.equal(f.chat.getConversation("owner", c.id).messages.at(-1).content, "한마디만");
  assert.equal(f.chat.countUserMessages("owner"), 1);
  f.group.assertIdle("owner");
});

test("old 1:1 stream contract still works", async (t) => {
  const f = fixture(); t.after(f.close);
  const c = f.chat.createConversation("owner", "a");
  const res = new ResponseStub();
  await f.controller.send({ userId: "owner" }, c.id, { message: "반가워" }, res);
  assert.equal(f.calls.length, 1);
  assert.ok(res.events()[0].delta);
  assert.deepEqual(res.events().at(-1), { done: true });
  assert.equal(f.chat.getConversation("owner", c.id).messages.length, 2);
});

test("split speaker labels are hidden and an omitted final question is added without another model call", async (t) => {
  assert.equal(cleanGroupReply("[박영", "박영수"), null);
  assert.equal(cleanGroupReply("[박영수] 반가워요", "박영수"), "반가워요");
  assert.equal(cleanGroupReply("(인물: 김하늘, 27세) 안녕", "김하늘"), "안녕");
  assert.equal(cleanGroupReply("(웃으며) 안녕", "김하늘"), "(웃으며) 안녕");
  const f = fixture(async function* () {
    yield { type: "delta", text: "[친구" };
    yield { type: "delta", text: "] 나는 국수." };
    yield { type: "usage", promptTokens: 10, completionTokens: 10 };
  });
  t.after(f.close);
  const c = f.chat.createConversation("owner", "a", "b");
  const res = new ResponseStub();
  await f.controller.send({ userId: "owner" }, c.id, { message: "무슨 음식 좋아해?" }, res);
  assert.equal(f.calls.length, 4);
  assert.equal(f.chat.getConversation("owner", c.id).messages.at(-1).content, "나는 국수. 당신은 어떻게 생각해요?");
  assert.ok(!res.events().filter((e) => e.type === "delta").some((e) => e.delta.includes("[")));
});

test("oversized provider output is capped per bubble including the final handoff", async (t) => {
  const f = fixture(async function* () { yield { type: "delta", text: "가".repeat(1000) }; });
  t.after(f.close);
  const c = f.chat.createConversation("owner", "a", "b");
  await f.controller.send({ userId: "owner" }, c.id, { message: "무슨 이야기 할까?" }, new ResponseStub());
  const messages = f.chat.getConversation("owner", c.id).messages.filter((m) => m.role === "assistant");
  assert.equal(messages.length, 4);
  assert.ok(messages.every((m) => m.content.length <= GROUP_LIMITS.messageChars));
  assert.match(messages.at(-1).content, /당신은 어떻게 생각해요\?$/);
  assert.equal(f.calls.length, 4);
});
