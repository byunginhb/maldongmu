const { test } = require("node:test");
const assert = require("node:assert/strict");
const { fixture } = require("./chat-fixture.cjs");
const { DbService } = require("../dist/db/db.service");
const { PersonasService } = require("../dist/personas/personas.service");

test("mode column migration is repeatable and old rows stay plain 1:1", (t) => {
  const f = fixture(); t.after(f.close);
  const plain = f.chat.createConversation("owner", "a");
  f.db.exec("ALTER TABLE conversations DROP COLUMN mode;");
  DbService.prototype.migrate.call({ db: f.db });
  DbService.prototype.migrate.call({ db: f.db });
  assert.equal(f.chat.getConversation("owner", plain.id).mode, null);
});

test("dating conversation gets its title, greeting, overlay and blocks friend invites", (t) => {
  const f = fixture(); t.after(f.close);
  const c = f.chat.createConversation("owner", "a", undefined, "dating");
  assert.equal(f.chat.getConversation("owner", c.id).mode, "dating");
  assert.equal(f.chat.listConversations("owner")[0].mode, "dating");
  assert.match(f.chat.listConversations("owner")[0].title, /가상 연애/);

  const greeting = f.controller.greeting({ userId: "owner" }, c.id, { lang: "ko-KR" });
  assert.match(greeting.greeting, /소개받기로 한 분/);
  assert.match(greeting.greeting, /김하늘/);
  assert.equal(f.calls.length, 0);

  const dating = f.chat.buildLlmMessages("owner", c.id, "안녕하세요");
  assert.match(dating.messages[0].content, /## 가상 연애/);
  assert.ok(dating.messages[0].content.indexOf("당신이 연기할 인물") < dating.messages[0].content.indexOf("## 가상 연애"));
  const plain = f.chat.createConversation("owner", "a");
  assert.doesNotMatch(f.chat.buildLlmMessages("owner", plain.id, "안녕하세요").messages[0].content, /## 가상 연애/);
  assert.doesNotMatch(f.controller.greeting({ userId: "owner" }, plain.id, {}).greeting, /소개받기로/);

  assert.throws(() => f.group.invite("owner", c.id, "b"), (e) => e.getStatus() === 400);
  assert.equal(f.chat.getConversation("owner", c.id).personas.length, 1);
  assert.throws(() => f.chat.createConversation("owner", "c0de0003911a5100000000000000d003", undefined, "dating"), (e) => e.getStatus() === 400);
});

test("dating candidates match sex/age, skip spouses and custom personas, and validate input", (t) => {
  const f = fixture(); t.after(f.close);
  f.db.exec(`CREATE TABLE persona_details (uuid TEXT PRIMARY KEY, marital_status TEXT);`);
  const rows = [
    ["w20a", "여자", 24, "미혼"], ["w20b", "여자", 27, "이혼"], ["w20c", "여자", 29, "배우자있음"],
    ["m20", "남자", 25, "미혼"], ["w30", "여자", 34, "미혼"], ["c0de0003911a5100000000000000d003", "여자", 22, "미혼"],
  ];
  for (const [uuid, sex, age, marital] of rows) {
    f.db.prepare("INSERT INTO personas VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run(uuid, uuid, age, sex, "직업", "서울", "서울-마포구", "소개");
    f.db.prepare("INSERT INTO persona_details VALUES (?, ?)").run(uuid, marital);
  }
  const personas = new PersonasService({ db: f.db }, null);
  for (let i = 0; i < 20; i++) {
    const { items } = personas.dating("여자", 20, 29);
    assert.ok(items.length >= 1 && items.length <= 3);
    assert.equal(new Set(items.map((p) => p.uuid)).size, items.length);
    for (const p of items) assert.ok(["w20a", "w20b"].includes(p.uuid), p.uuid);
    assert.ok("oneLiner" in items[0]);
  }
  assert.throws(() => personas.dating("기타", 20, 29), (e) => e.getStatus() === 400);
  assert.throws(() => personas.dating("여자", 19, 29), (e) => e.getStatus() === 400);
  assert.throws(() => personas.dating("여자", 30, 20), (e) => e.getStatus() === 400);
  assert.throws(() => personas.dating("여자", NaN, NaN), (e) => e.getStatus() === 400);
});
