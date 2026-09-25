const { test } = require("node:test");
const assert = require("node:assert/strict");
const { fixture, ResponseStub } = require("./chat-fixture.cjs");
const { AdminController } = require("../dist/admin/admin.controller");

test("raising a limit marks that user's pending feedback handled and stamps limit_changed_at", (t) => {
  const f = fixture(); t.after(f.close);
  const admin = new AdminController({ db: f.db }, f.personas);
  f.chat.saveFeedback("owner", "한도 늘려주세요");
  f.chat.saveFeedback("owner", "또 부탁드려요");
  f.chat.saveFeedback("other", "잘 쓰고 있어요");
  let rows = admin.feedback();
  assert.equal(rows.filter((r) => r.handledAt === null).length, 3);
  assert.equal(rows.find((r) => r.userId === "owner").pendingSameUser, 2);
  const res = admin.setLimit("owner", { limit: 300 });
  assert.deepEqual(res, { ok: true, limit: 300, handled: 2 });
  rows = admin.feedback();
  assert.equal(rows.filter((r) => r.userId === "owner" && r.handledNote === "한도 100 → 300").length, 2);
  assert.equal(rows[0].userId, "other", "unhandled first");
  assert.ok(f.db.prepare("SELECT limit_changed_at FROM users WHERE id = 'owner'").get().limit_changed_at);
  admin.handleFeedback(String(rows[0].id), { note: "확인" });
  assert.equal(admin.feedback().filter((r) => r.handledAt === null).length, 0);
});

test("events are validated and the admin funnel counts the cohort and sources", async (t) => {
  const f = fixture(); t.after(f.close);
  assert.deepEqual(f.controller.event({ userId: "owner" }, { name: "visit", props: { referrer: "instagram.com", app: false } }), { ok: true });
  f.controller.event({ userId: "guest" }, { name: "visit", props: { utm_source: "reels", app: true } });
  f.controller.event({ userId: "guest" }, { name: "visit", props: {} });
  assert.throws(() => f.controller.event({ userId: "owner" }, { name: "Bad Name!" }), (e) => e.getStatus() === 400);
  assert.equal(f.db.prepare("SELECT COUNT(*) AS n FROM events").get().n, 3);

  const c = f.chat.createConversation("owner", "a");
  for (let i = 0; i < 5; i++) await f.controller.send({ userId: "owner" }, c.id, { message: `메시지 ${i}` }, new ResponseStub());
  f.chat.createConversation("guest", "b");
  const admin = new AdminController({ db: f.db }, f.personas);
  const { steps, sources } = admin.funnel("14");
  assert.equal(steps.users, 3);
  assert.equal(steps.startedConversation, 2);
  assert.equal(steps.sent1, 1);
  assert.equal(steps.sent5, 1);
  assert.equal(steps.sent20, 0);
  assert.equal(steps.loggedIn, 2, "owner/other are google, guest is guest");
  assert.deepEqual(sources.map((s) => [s.source, s.surface, s.users]).sort(),
    [["direct", "web", 1], ["instagram.com", "web", 1], ["reels", "app", 1]]);
});
