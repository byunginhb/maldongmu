import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { nanoid } from "nanoid";
import { DbService } from "../db/db.service";
import { PersonasService } from "../personas/personas.service";
import { buildSystemPrompt } from "./prompt";

// 프롬프트 캐시 효율을 위한 계단식 히스토리 윈도우:
// 항상 "최근 N개"로 자르면 매 턴 프리픽스가 바뀌어 캐시가 깨진다.
// 대신 시작점을 STEP 단위로만 이동시켜, STEP턴 동안 동일 프리픽스 유지 → 캐시 적중.
const HISTORY_MAX = 30;
const HISTORY_STEP = 10;

@Injectable()
export class ChatService {
  constructor(
    private readonly dbs: DbService,
    private readonly personas: PersonasService,
  ) {}
  private get db() {
    return this.dbs.db;
  }

  createConversation(userId: string, personaUuid: string) {
    const user = this.db.prepare(`SELECT * FROM users WHERE id = ?`).get(userId) as any;
    if (!user) throw new NotFoundException("user not found");

    if (user.type === "guest") {
      const limit = Number(process.env.GUEST_CONVERSATION_LIMIT || 3);
      const count = (
        this.db.prepare(`SELECT COUNT(*) as c FROM conversations WHERE user_id = ?`).get(userId) as any
      ).c;
      if (count >= limit) {
        throw new ForbiddenException({ code: "LOGIN_REQUIRED", message: "로그인이 필요해요" });
      }
    }

    const persona = this.personas.card(personaUuid) as any;
    const id = nanoid(12);
    this.db
      .prepare(`INSERT INTO conversations (id, user_id, persona_uuid, title) VALUES (?, ?, ?, ?)`)
      .run(id, userId, personaUuid, `${persona.name}님과의 대화`);
    this.db
      .prepare(`INSERT INTO usage_events (user_id, persona_uuid, event) VALUES (?, ?, 'chat_start')`)
      .run(userId, personaUuid);
    return { id, persona };
  }

  countUserMessages(userId: string): number {
    return (
      this.db
        .prepare(
          `SELECT COUNT(*) as c FROM messages m
           JOIN conversations c2 ON c2.id = m.conversation_id
           WHERE c2.user_id = ? AND m.role = 'user'`,
        )
        .get(userId) as any
    ).c;
  }

  saveFeedback(userId: string, content: string) {
    this.db
      .prepare(`INSERT INTO feedback (user_id, content) VALUES (?, ?)`)
      .run(userId, content.slice(0, 2000));
    return { ok: true };
  }

  listConversations(userId: string) {
    return this.db
      .prepare(
        `SELECT c.id, c.persona_uuid as personaUuid, c.title, c.created_at as createdAt,
                c.last_message_at as lastMessageAt,
                p.name, p.age, p.sex, p.occupation, p.one_liner as oneLiner
         FROM conversations c LEFT JOIN personas p ON p.uuid = c.persona_uuid
         WHERE c.user_id = ? ORDER BY c.last_message_at DESC`,
      )
      .all(userId);
  }

  getConversation(userId: string, id: string) {
    const conv = this.db
      .prepare(`SELECT * FROM conversations WHERE id = ? AND user_id = ?`)
      .get(id, userId) as any;
    if (!conv) throw new NotFoundException("conversation not found");
    const messages = this.db
      .prepare(
        `SELECT id, role, content, created_at as createdAt FROM messages
         WHERE conversation_id = ? ORDER BY created_at, id`,
      )
      .all(id);
    const persona = this.personas.card(conv.persona_uuid);
    return { ...conv, persona, messages };
  }

  buildLlmMessages(userId: string, conversationId: string, userText: string) {
    const conv = this.db
      .prepare(`SELECT * FROM conversations WHERE id = ? AND user_id = ?`)
      .get(conversationId, userId) as any;
    if (!conv) throw new NotFoundException("conversation not found");

    // 게스트는 대화방당 메시지 N개까지 → 이후 로그인 유도
    const user = this.db
      .prepare(`SELECT type, message_limit FROM users WHERE id = ?`)
      .get(userId) as any;
    if (user?.type === "guest") {
      const msgLimit = Number(process.env.GUEST_MESSAGE_LIMIT || 3);
      const sent = (
        this.db
          .prepare(`SELECT COUNT(*) as c FROM messages WHERE conversation_id = ? AND role = 'user'`)
          .get(conversationId) as any
      ).c;
      if (sent >= msgLimit) {
        throw new ForbiddenException({ code: "LOGIN_REQUIRED", message: "로그인이 필요해요" });
      }
    } else if (user) {
      // 로그인 사용자: 전체 메시지 한도(기본 100)에서 차감. 피드백을 주면 운영자가 늘려줌
      const limit = user.message_limit ?? Number(process.env.LOGIN_MESSAGE_LIMIT || 100);
      const used = this.countUserMessages(userId);
      if (used >= limit) {
        throw new ForbiddenException({ code: "QUOTA_EXCEEDED", message: "대화 한도에 도달했어요" });
      }
    }

    const detail = this.personas.detail(conv.persona_uuid);
    const total = (
      this.db.prepare(`SELECT COUNT(*) as c FROM messages WHERE conversation_id = ?`).get(conversationId) as any
    ).c;
    const start =
      total > HISTORY_MAX ? Math.ceil((total - HISTORY_MAX) / HISTORY_STEP) * HISTORY_STEP : 0;
    const history = this.db
      .prepare(
        `SELECT role, content FROM messages WHERE conversation_id = ?
         ORDER BY created_at, id LIMIT -1 OFFSET ?`,
      )
      .all(conversationId, start) as any[];

    return {
      conv,
      messages: [
        { role: "system" as const, content: buildSystemPrompt(detail) },
        ...history.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
        { role: "user" as const, content: userText },
      ],
    };
  }

  saveTurn(
    userId: string,
    conversationId: string,
    personaUuid: string,
    userText: string,
    assistantText: string,
    tokensIn: number,
    tokensOut: number,
  ) {
    this.db
      .prepare(`INSERT INTO messages (id, conversation_id, role, content) VALUES (?, ?, 'user', ?)`)
      .run(nanoid(12), conversationId, userText);
    this.db
      .prepare(
        `INSERT INTO messages (id, conversation_id, role, content, tokens_in, tokens_out)
         VALUES (?, ?, 'assistant', ?, ?, ?)`,
      )
      .run(nanoid(12), conversationId, assistantText, tokensIn, tokensOut);
    this.db
      .prepare(`UPDATE conversations SET last_message_at = datetime('now') WHERE id = ?`)
      .run(conversationId);
    this.db
      .prepare(
        `INSERT INTO usage_events (user_id, persona_uuid, event, tokens) VALUES (?, ?, 'message', ?)`,
      )
      .run(userId, personaUuid, tokensIn + tokensOut);
  }
}
