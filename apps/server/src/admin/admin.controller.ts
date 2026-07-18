import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { AdminGuard } from "./admin.guard";
import { DbService } from "../db/db.service";
import { PersonasService } from "../personas/personas.service";

@Controller("admin")
@UseGuards(AdminGuard)
export class AdminController {
  constructor(
    private readonly dbs: DbService,
    private readonly personas: PersonasService,
  ) {}
  private get db() {
    return this.dbs.db;
  }

  @Get("stats")
  stats(@Query("days") days = "14") {
    const d = Math.min(Number(days) || 14, 90);
    const daily = this.db
      .prepare(
        `SELECT date(created_at) as date,
                COUNT(DISTINCT user_id) as activeUsers,
                SUM(CASE WHEN event = 'chat_start' THEN 1 ELSE 0 END) as conversations,
                SUM(CASE WHEN event = 'message' THEN 1 ELSE 0 END) as messages,
                SUM(tokens) as tokens
         FROM usage_events
         WHERE created_at >= datetime('now', ?)
         GROUP BY date(created_at) ORDER BY date`,
      )
      .all(`-${d} days`);
    const totals = this.db
      .prepare(
        `SELECT (SELECT COUNT(*) FROM users) as users,
                (SELECT COUNT(*) FROM conversations) as conversations,
                (SELECT COUNT(*) FROM messages) as messages,
                (SELECT COALESCE(SUM(tokens),0) FROM usage_events) as tokens`,
      )
      .get();
    return { daily, totals };
  }

  @Get("personas/ranking")
  ranking(@Query("days") days = "7") {
    return this.personas.popular(Math.min(Number(days) || 7, 90), 30);
  }

  @Get("users")
  users(@Query("page") page = "1") {
    const limit = 30;
    const offset = (Number(page) - 1) * limit;
    // 가입 유저(구글/카카오)는 항상, 게스트는 대화가 있는 경우만 노출
    const where = `WHERE u.type != 'guest'
                   OR EXISTS (SELECT 1 FROM conversations c WHERE c.user_id = u.id)`;
    const { total } = this.db
      .prepare(`SELECT COUNT(*) as total FROM users u ${where}`)
      .get() as { total: number };
    // 조인 곱셈으로 tokens가 부풀지 않도록 서브쿼리로 집계
    const rows = this.db
      .prepare(
        `SELECT u.id, u.type, u.nickname, u.email, u.created_at as createdAt,
                (SELECT COUNT(*) FROM conversations c WHERE c.user_id = u.id) as conversations,
                (SELECT COUNT(*) FROM messages m JOIN conversations c ON c.id = m.conversation_id
                 WHERE c.user_id = u.id AND m.role = 'user') as messages,
                (SELECT COALESCE(SUM(e.tokens), 0) FROM usage_events e WHERE e.user_id = u.id) as tokens
         FROM users u
         ${where}
         ORDER BY u.created_at DESC LIMIT ? OFFSET ?`,
      )
      .all(limit, offset);
    return { rows, total, page: Number(page), limit };
  }

  /** 사용자 대화 한도 조정 (피드백 답례로 증설) */
  @Post("users/:id/limit")
  setLimit(@Param("id") id: string, @Body() body: { limit: number }) {
    const limit = Math.max(0, Math.min(Number(body.limit) || 0, 1000000));
    this.db.prepare(`UPDATE users SET message_limit = ? WHERE id = ?`).run(limit, id);
    return { ok: true, limit };
  }

  /** 피드백 목록 */
  @Get("feedback")
  feedback() {
    return this.db
      .prepare(
        `SELECT f.id, f.user_id as userId, f.content, f.created_at as createdAt,
                u.type, u.nickname, u.email, u.message_limit as messageLimit,
                (SELECT COUNT(*) FROM messages m JOIN conversations c ON c.id = m.conversation_id
                 WHERE c.user_id = f.user_id AND m.role = 'user') as messagesUsed
         FROM feedback f LEFT JOIN users u ON u.id = f.user_id
         ORDER BY f.created_at DESC LIMIT 100`,
      )
      .all();
  }

  /** 유저 상세: 어떤 페르소나와 어떤 대화방을 만들었는지 */
  @Get("users/:id")
  userDetail(@Param("id") id: string) {
    const user = this.db
      .prepare(`SELECT id, type, nickname, email, created_at as createdAt FROM users WHERE id = ?`)
      .get(id);
    const conversations = this.db
      .prepare(
        `SELECT c.id, c.persona_uuid as personaUuid, c.title,
                c.created_at as createdAt, c.last_message_at as lastMessageAt,
                p.name as personaName, p.age as personaAge, p.sex as personaSex,
                p.occupation as personaOccupation,
                (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id) as messageCount,
                (SELECT COALESCE(SUM(m.tokens_in + m.tokens_out), 0) FROM messages m
                 WHERE m.conversation_id = c.id) as tokens
         FROM conversations c LEFT JOIN personas p ON p.uuid = c.persona_uuid
         WHERE c.user_id = ? ORDER BY c.last_message_at DESC`,
      )
      .all(id);
    return { user, conversations };
  }

  /** 대화 상세: 실제 주고받은 메시지 내역 */
  @Get("conversations/:id")
  conversationDetail(@Param("id") id: string) {
    const conv = this.db
      .prepare(
        `SELECT c.id, c.user_id as userId, c.persona_uuid as personaUuid, c.title,
                c.created_at as createdAt, p.name as personaName, p.age as personaAge,
                p.sex as personaSex, p.occupation as personaOccupation
         FROM conversations c LEFT JOIN personas p ON p.uuid = c.persona_uuid
         WHERE c.id = ?`,
      )
      .get(id);
    const messages = this.db
      .prepare(
        `SELECT id, role, content, tokens_in as tokensIn, tokens_out as tokensOut,
                created_at as createdAt
         FROM messages WHERE conversation_id = ? ORDER BY created_at, id`,
      )
      .all(id);
    return { ...(conv as any), messages };
  }
}
