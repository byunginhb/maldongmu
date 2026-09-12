// Local browser QA only: isolated in-memory DB, simulated LLM, no credentials or production writes.
require("reflect-metadata");
const { NestFactory } = require("@nestjs/core");
const { Module } = require("@nestjs/common");
const { setTimeout: delay } = require("node:timers/promises");
const { ChatController } = require("../dist/chat/chat.controller");
const { ChatService } = require("../dist/chat/chat.service");
const { GroupChatService } = require("../dist/chat/group-chat.service");
const { AffectionService } = require("../dist/chat/affection.service");
const { LlmService } = require("../dist/llm/llm.service");
const { AuthService } = require("../dist/auth/auth.service");
const { fixture } = require("./chat-fixture.cjs");

const f = fixture(async function* (messages, options) {
  const last = messages.at(-1).content.includes("마지막 짧은 답변");
  const content = last ? "한 가지 음식만 고르라니 어렵네요. 당신은 어떤 음식을 고를 거예요?"
    : messages[0].content.includes("이름: 김하늘")
      ? "저는 따끈한 국수요! 영수님 이야기를 들으니까 바닷가에서 먹던 국수가 떠올라요."
      : "허허, 나는 김치찌개 한 냄비면 되지요. 하늘님 국수도 한 젓가락 얻어먹고요.";
  for (const part of content.match(/.{1,4}/gu)) {
    await delay(120, undefined, { signal: options.signal });
    yield { type: "delta", text: part };
  }
  yield { type: "usage", promptTokens: 100, completionTokens: 40 };
});
class PreviewModule {}
Module({
  controllers: [ChatController],
  providers: [
    { provide: ChatService, useValue: f.chat },
    { provide: GroupChatService, useValue: f.group },
    { provide: AffectionService, useValue: f.affection },
    { provide: LlmService, useValue: f.llm },
    { provide: AuthService, useValue: { verify: (token) => token === "preview-owner" ? { sub: "owner" } : null, userExists: () => true } },
  ],
})(PreviewModule);

(async () => {
  const app = await NestFactory.create(PreviewModule, { logger: false });
  app.setGlobalPrefix("api");
  app.enableCors({ origin: ["http://localhost:3000", "http://127.0.0.1:3000"] });
  const http = app.getHttpAdapter().getInstance();
  http.post("/api/auth/guest", (_, res) => res.json({ token: "preview-owner" }));
  http.get("/api/auth/me", (_, res) => res.json({ id: "owner", type: "google", messageLimit: 100, messagesUsed: f.chat.countUserMessages("owner") }));
  http.get("/api/personas/featured", (_, res) => res.json(f.cards));
  http.get("/api/personas/popular", (_, res) => res.json([]));
  http.get("/api/personas/search", (req, res) => res.json({ items: f.cards.filter((p) => JSON.stringify(p).includes(req.query.q || "")) }));
  http.get("/api/personas/:uuid", (req, res) => res.json(f.personas.card(req.params.uuid)));
  http.get("/api/preview/stats", (_, res) => res.json({ calls: f.calls.length }));
  const solo = f.chat.createConversation("owner", "a");
  await app.listen(4000, "127.0.0.1");
  console.log(`Local preview ready. 1:1 chat: http://localhost:3000/chat/${solo.id}`);
  const close = async () => { await app.close(); f.close(); process.exit(0); };
  process.on("SIGTERM", close);
  process.on("SIGINT", close);
})().catch((error) => { console.error(error); process.exit(1); });
