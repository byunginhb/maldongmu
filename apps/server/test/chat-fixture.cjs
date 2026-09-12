const Database = require("better-sqlite3");
const { DbService } = require("../dist/db/db.service");
const { ChatService } = require("../dist/chat/chat.service");
const { GroupChatService } = require("../dist/chat/group-chat.service");
const { AffectionService } = require("../dist/chat/affection.service");
const { ChatController } = require("../dist/chat/chat.controller");
const { EventEmitter } = require("node:events");

function fixture(stream) {
  const db = new Database(":memory:");
  db.pragma("foreign_keys = ON");
  DbService.prototype.migrate.call({ db });
  db.exec(`CREATE TABLE personas (uuid TEXT PRIMARY KEY, name TEXT, age INTEGER, sex TEXT,
    occupation TEXT, province TEXT, district TEXT, one_liner TEXT);`);
  const cards = [
    { uuid: "a", name: "김하늘", age: 27, sex: "여자", occupation: "도서관 사서", province: "서울", district: "마포", oneLiner: "작은 일에서 재미를 찾아요." },
    { uuid: "b", name: "박영수", age: 71, sex: "남자", occupation: "목수", province: "부산", district: "해운대", oneLiner: "사람들과 수다 떠는 걸 좋아해요." },
    { uuid: "c", name: "이수진", age: 42, sex: "여자", occupation: "요리사", province: "제주", district: "서귀포", oneLiner: "따뜻한 한 끼와 유쾌한 이야기." },
  ];
  for (const c of cards) db.prepare("INSERT INTO personas VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
    .run(c.uuid, c.name, c.age, c.sex, c.occupation, c.province, c.district, c.oneLiner);
  for (const [id, type] of [["owner", "google"], ["other", "google"], ["guest", "guest"]]) {
    db.prepare("INSERT INTO users (id, type) VALUES (?, ?)").run(id, type);
  }
  const personas = {
    card(uuid) {
      const card = cards.find((c) => c.uuid === uuid);
      if (!card) throw new Error("persona not found");
      return card;
    },
    detail(uuid) { return { ...this.card(uuid), cultural_background: "친구와 일상을 나누는 걸 좋아해요." }; },
  };
  const calls = [];
  const completes = [];
  let judge = () => '{"score": 33, "note": "조금 궁금해졌어요"}';
  const llm = {
    async complete(messages, model, signal) {
      completes.push({ messages, model, signal });
      return judge(messages);
    },
    async *stream(messages, options) {
      calls.push({ messages, options });
      if (stream) { yield* stream(messages, options, calls.length); return; }
      const content = messages.at(-1).content.includes("마지막 짧은 답변")
        ? "이 얘기 재미있네요. 당신은 어떻게 생각해요?" : "그러게요! 저도 그런 날이 있었어요.";
      yield { type: "delta", text: content };
      yield { type: "usage", promptTokens: 100, completionTokens: 30 };
    },
  };
  const chat = new ChatService({ db }, personas);
  const group = new GroupChatService({ db }, personas, chat, llm);
  const affection = new AffectionService({ db }, llm);
  const controller = new ChatController(chat, llm, group, affection);
  return { db, cards, personas, llm, calls, completes, setJudge: (fn) => { judge = fn; }, chat, group, affection, controller, close: () => db.close() };
}

class ResponseStub extends EventEmitter {
  writableEnded = false;
  destroyed = false;
  chunks = [];
  set() { return this; }
  flushHeaders() {}
  write(chunk) { this.chunks.push(chunk); return true; }
  end() { this.writableEnded = true; }
  events() { return this.chunks.map((s) => JSON.parse(s.trim().slice(5))); }
}

module.exports = { fixture, ResponseStub };
