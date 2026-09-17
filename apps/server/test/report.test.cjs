const { test } = require("node:test");
const assert = require("node:assert/strict");
const { fixture, ResponseStub } = require("./chat-fixture.cjs");

test("a streamed reply announces its saved id and can be reported in-app; foreign/user messages cannot", async (t) => {
  const f = fixture(); t.after(f.close);
  const c = f.chat.createConversation("owner", "a");
  const res = new ResponseStub();
  await f.controller.send({ userId: "owner" }, c.id, { message: "안녕하세요" }, res);
  const events = res.events();
  const saved = events.find((e) => e.type === "saved");
  assert.ok(saved?.messageId, "saved event carries the assistant message id");
  assert.deepEqual(events.at(-1), { done: true });
  const stored = f.chat.getConversation("owner", c.id).messages;
  assert.equal(stored.at(-1).id, saved.messageId);

  assert.deepEqual(f.chat.saveReport("owner", c.id, saved.messageId, "성적인 내용", "  너무 노골적이에요  "), { ok: true });
  const row = f.db.prepare("SELECT * FROM reports").get();
  assert.equal(row.content, stored.at(-1).content);
  assert.equal(row.detail, "너무 노골적이에요");
  assert.equal(row.persona_uuid, "a");
  assert.throws(() => f.chat.saveReport("other", c.id, saved.messageId, "기타"), (e) => e.getStatus() === 404);
  assert.throws(() => f.chat.saveReport("owner", c.id, stored.at(-2).id, "기타"), (e) => e.getStatus() === 404, "user messages are not reportable");
  assert.throws(() => f.chat.saveReport("owner", c.id, saved.messageId, "  "), (e) => e.getStatus() === 400);
  assert.equal(f.db.prepare("SELECT COUNT(*) AS n FROM reports").get().n, 1);
});
