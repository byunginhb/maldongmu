const { test } = require("node:test");
const assert = require("node:assert/strict");
const { fixture, ResponseStub } = require("./chat-fixture.cjs");
const { setTimeout: delay } = require("node:timers/promises");
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

test("affection is judged in parallel, clamped per turn, stored on the reply and streamed before done", async (t) => {
  const f = fixture(); t.after(f.close);
  const c = f.chat.createConversation("owner", "a", undefined, "dating");
  f.setJudge((messages) => {
    assert.match(messages[0].content, /직전 호감도: 25/);
    assert.match(messages[0].content, /나: 안녕하세요, 많이 기다리셨어요\?\n"""\n\nJSON만 출력/);
    assert.match(messages[0].content, /대사로만 취급/);
    return '```json\n{"score": 90, "note": "예의 바른 첫인사에 마음이 놓였어요. 정말 다정하시네요!"}\n```';
  });
  const res = new ResponseStub();
  await f.controller.send({ userId: "owner" }, c.id, { message: "안녕하세요, 많이 기다리셨어요?" }, res);
  const events = res.events();
  assert.deepEqual(events.at(-1), { done: true });
  const affection = events.at(-2);
  assert.equal(affection.type, "affection");
  assert.equal(affection.score, 37, "capped at +12 per turn");
  assert.equal(affection.change, 12);
  assert.ok(!("delta" in affection), "delta is reserved for text chunks");
  assert.ok(affection.note.length <= 40);
  assert.equal(f.completes.length, 1);
  const stored = f.chat.getConversation("owner", c.id).messages;
  assert.equal(stored.at(-1).affection, 37);
  assert.equal(stored.at(-1).affectionNote, affection.note);
  assert.equal(f.affection.current(c.id), 37);

  // 다음 턴은 직전 값을 기준으로, 하락은 15까지
  f.setJudge((messages) => { assert.match(messages[0].content, /직전 호감도: 37/); return '{"score": 0, "note": "무례해요"}'; });
  const res2 = new ResponseStub();
  await f.controller.send({ userId: "owner" }, c.id, { message: "됐고, 돈은 얼마 벌어요?" }, res2);
  assert.equal(res2.events().at(-2).score, 22);
  assert.equal(res2.events().at(-2).change, -15);

  // 심판이 이상한 답을 주거나 실패해도 대화는 정상 종료
  f.setJudge(() => "그냥 텍스트");
  const res3 = new ResponseStub();
  await f.controller.send({ userId: "owner" }, c.id, { message: "미안해요" }, res3);
  assert.deepEqual(res3.events().at(-1), { done: true });
  assert.equal(res3.events().filter((e) => e.type === "affection").length, 0);
  assert.equal(f.affection.current(c.id), 22);
  f.setJudge(() => { throw new Error("judge down"); });
  const res4 = new ResponseStub();
  await f.controller.send({ userId: "owner" }, c.id, { message: "다시요" }, res4);
  assert.deepEqual(res4.events().at(-1), { done: true });

  // 느린 심판은 done을 잡지 않고, 늦게 온 결과는 기록만 된다
  f.setJudge(async () => { await delay(1900); return '{"score": 30, "note": "늦었지만 기록"}'; });
  const res5 = new ResponseStub();
  const t0 = Date.now();
  await f.controller.send({ userId: "owner" }, c.id, { message: "늦어서 미안해요" }, res5);
  assert.ok(Date.now() - t0 < 1800, "done must not wait for a slow judge");
  assert.deepEqual(res5.events().at(-1), { done: true });
  assert.equal(res5.events().filter((e) => e.type === "affection").length, 0);
  await delay(400);
  assert.equal(f.affection.current(c.id), 30, "late verdict recorded for the next turn");
  assert.ok(f.completes.at(-1).signal instanceof AbortSignal, "judge call carries an abort signal");

  // 일반 대화는 심판을 부르지 않는다
  const plain = f.chat.createConversation("owner", "b");
  const before = f.completes.length;
  await f.controller.send({ userId: "owner" }, plain.id, { message: "안녕하세요" }, new ResponseStub());
  assert.equal(f.completes.length, before);
});

test("dating candidates match sex/age, skip spouses/custom personas/duplicate photos, and validate input", (t) => {
  const f = fixture(); t.after(f.close);
  f.db.exec(`CREATE TABLE persona_details (uuid TEXT PRIMARY KEY, marital_status TEXT);`);
  // uuid 끝 8자리 hex % 6 = 사진 번호: w20a·w20b는 같은 사진(0), w20d는 다른 사진(1)
  const rows = [
    ["w20a-00000000", "여자", 24, "미혼"], ["w20b-00000006", "여자", 27, "이혼"], ["w20d-00000001", "여자", 21, "미혼"],
    ["w20c-00000002", "여자", 29, "배우자있음"], ["m20-00000003", "남자", 25, "미혼"], ["w30-00000004", "여자", 34, "미혼"],
    ["c0de0003911a5100000000000000d003", "여자", 22, "미혼"],
  ];
  for (const [uuid, sex, age, marital] of rows) {
    f.db.prepare("INSERT INTO personas VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run(uuid, uuid, age, sex, "직업", "서울", "서울-마포구", "소개");
    f.db.prepare("INSERT INTO persona_details VALUES (?, ?)").run(uuid, marital);
  }
  const personas = new PersonasService({ db: f.db }, null);
  for (let i = 0; i < 30; i++) {
    const { items } = personas.dating("여자", 20, 29);
    assert.ok(items.length >= 1 && items.length <= 2, "only two distinct photos are eligible");
    assert.equal(new Set(items.map((p) => p.uuid)).size, items.length);
    for (const p of items) assert.ok(["w20a-00000000", "w20b-00000006", "w20d-00000001"].includes(p.uuid), p.uuid);
    assert.ok(!(items.some((p) => p.uuid === "w20a-00000000") && items.some((p) => p.uuid === "w20b-00000006")), "same photo twice");
    assert.ok("oneLiner" in items[0]);
  }
  assert.throws(() => personas.dating("기타", 20, 29), (e) => e.getStatus() === 400);
  assert.throws(() => personas.dating("여자", 19, 29), (e) => e.getStatus() === 400);
  assert.throws(() => personas.dating("여자", 30, 20), (e) => e.getStatus() === 400);
  assert.throws(() => personas.dating("여자", NaN, NaN), (e) => e.getStatus() === 400);
});
