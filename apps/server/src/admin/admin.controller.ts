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
        `SELECT date(created_at, '+9 hours') as date,
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

  /** 퍼널: 기간 내 가입(게스트 포함) 코호트가 어디까지 갔는지 + 유입 경로 (visit 이벤트) */
  @Get("funnel")
  funnel(@Query("days") days = "14") {
    const since = `-${Math.min(Number(days) || 14, 90)} days`;
    const one = (sql: string) => (this.db.prepare(sql).get(since) as any).n as number;
    const cohort = `SELECT id FROM users WHERE created_at >= datetime('now', ?)`;
    const sent = `SELECT c.user_id AS uid, COUNT(*) AS n, COUNT(DISTINCT date(m.created_at)) AS days
                  FROM messages m JOIN conversations c ON c.id = m.conversation_id
                  WHERE m.role = 'user' AND c.user_id IN (${cohort}) GROUP BY c.user_id`;
    const steps = {
      users: one(`SELECT COUNT(*) AS n FROM (${cohort})`),
      startedConversation: one(`SELECT COUNT(DISTINCT user_id) AS n FROM conversations WHERE user_id IN (${cohort})`),
      sent1: one(`SELECT COUNT(*) AS n FROM (${sent})`),
      sent5: one(`SELECT COUNT(*) AS n FROM (${sent}) WHERE n >= 5`),
      sent20: one(`SELECT COUNT(*) AS n FROM (${sent}) WHERE n >= 20`),
      returned: one(`SELECT COUNT(*) AS n FROM (${sent}) WHERE days >= 2`),
      loggedIn: one(`SELECT COUNT(*) AS n FROM users WHERE created_at >= datetime('now', ?) AND type != 'guest'`),
      dating: one(`SELECT COUNT(DISTINCT c.user_id) AS n FROM conversations c WHERE c.mode = 'dating' AND c.user_id IN (${cohort})
                   AND EXISTS (SELECT 1 FROM messages m WHERE m.conversation_id = c.id AND m.role = 'user')`),
    };
    // 유입 경로: visit 이벤트의 source(utm_source > referrer host > direct) × app 여부
    const sources = this.db
      .prepare(
        `SELECT COALESCE(NULLIF(json_extract(props, '$.utm_source'), ''), NULLIF(json_extract(props, '$.referrer'), ''), 'direct') AS source,
                CASE WHEN json_extract(props, '$.app') THEN 'app' ELSE 'web' END AS surface,
                COUNT(DISTINCT user_id) AS users
         FROM events WHERE name = 'visit' AND created_at >= datetime('now', ?)
         GROUP BY source, surface ORDER BY users DESC LIMIT 20`,
      )
      .all(since);
    return { days: Number(days) || 14, steps, sources };
  }

  @Get("personas/ranking")
  ranking(@Query("days") days = "7") {
    return this.personas.popular(Math.min(Number(days) || 7, 90), 30);
  }

  @Get("users")
  users(@Query("page") page = "1", @Query("type") type = "") {
    const limit = 30;
    const offset = (Number(page) - 1) * limit;
    // type=google|kakao|guest 필터, 없으면 기존 기본(가입자 전체 + 대화 있는 게스트)
    const params: any[] = [];
    let where: string;
    if (type === "google" || type === "kakao" || type === "guest") {
      where = `WHERE u.type = ?`;
      params.push(type);
    } else {
      where = `WHERE u.type != 'guest'
               OR EXISTS (SELECT 1 FROM conversations c WHERE c.user_id = u.id)`;
    }
    const { total } = this.db
      .prepare(`SELECT COUNT(*) as total FROM users u ${where}`)
      .get(...params) as { total: number };
    // 조인 곱셈으로 tokens가 부풀지 않도록 서브쿼리로 집계
    const rows = this.db
      .prepare(
        `SELECT u.id, u.type, u.nickname, u.email, u.created_at as createdAt,
                u.interview_limit as interviewLimit,
                (SELECT COUNT(*) FROM conversations c WHERE c.user_id = u.id) as conversations,
                (SELECT COUNT(*) FROM messages m JOIN conversations c ON c.id = m.conversation_id
                 WHERE c.user_id = u.id AND m.role = 'user') as messages,
                (SELECT COUNT(*) FROM interview_sessions s WHERE s.user_id = u.id AND s.status != 'aborted') as interviewUsed,
                (SELECT COALESCE(SUM(e.tokens), 0) FROM usage_events e WHERE e.user_id = u.id) as tokens,
                (SELECT MAX(c.last_message_at) FROM conversations c WHERE c.user_id = u.id) as lastActiveAt
         FROM users u
         ${where}
         ORDER BY COALESCE(lastActiveAt, u.created_at) DESC LIMIT ? OFFSET ?`,
      )
      .all(...params, limit, offset);
    return { rows, total, page: Number(page), limit };
  }

  /** 사용자 대화 한도 조정 (피드백 답례로 증설) */
  @Post("users/:id/limit")
  setLimit(@Param("id") id: string, @Body() body: { limit: number }) {
    const limit = Math.max(0, Math.min(Number(body.limit) || 0, 1000000));
    const before = (this.db.prepare(`SELECT message_limit FROM users WHERE id = ?`).get(id) as any)?.message_limit ?? 100;
    // 변경 시각을 남겨 사용자가 다음에 열 때 "한도가 늘었어요" 안내를 띄운다
    this.db.prepare(`UPDATE users SET message_limit = ?, limit_changed_at = datetime('now') WHERE id = ?`).run(limit, id);
    // 같은 사용자의 미처리 피드백(한도 요청)은 한 번의 증액으로 모두 처리된 것
    const handled = this.db
      .prepare(`UPDATE feedback SET handled_at = datetime('now'), handled_note = ? WHERE user_id = ? AND handled_at IS NULL`)
      .run(`한도 ${before} → ${limit}`, id).changes;
    return { ok: true, limit, handled };
  }

  /** 한도 변경 없이 피드백만 처리 완료로 표시 */
  @Post("feedback/:id/handle")
  handleFeedback(@Param("id") id: string, @Body() body: { note?: string }) {
    this.db.prepare(`UPDATE feedback SET handled_at = datetime('now'), handled_note = ? WHERE id = ?`)
      .run(String(body?.note || "확인함").slice(0, 100), Number(id));
    return { ok: true };
  }

  /** 이웃 인터뷰 크레딧 부여 (기본 2, 어드민 증설). 양수·상한 클램프 */
  @Post("users/:id/interview-limit")
  setInterviewLimit(@Param("id") id: string, @Body() body: { limit: number }) {
    const limit = Math.max(0, Math.min(Math.floor(Number(body.limit) || 0), 100));
    this.db.prepare(`UPDATE users SET interview_limit = ? WHERE id = ?`).run(limit, id);
    return { ok: true, interviewLimit: limit };
  }

  /** AI 답변 신고 목록 (정책 대응 증적) */
  @Get("reports")
  reports() {
    return this.db
      .prepare(
        `SELECT r.id, r.user_id as userId, r.conversation_id as conversationId, r.message_id as messageId,
                r.reason, r.detail, r.content, r.created_at as createdAt,
                u.type, u.nickname, u.email, p.name as personaName
         FROM reports r LEFT JOIN users u ON u.id = r.user_id LEFT JOIN personas p ON p.uuid = r.persona_uuid
         ORDER BY r.created_at DESC LIMIT 100`,
      )
      .all();
  }

  /** 피드백 목록 */
  @Get("feedback")
  feedback() {
    return this.db
      .prepare(
        `SELECT f.id, f.user_id as userId, f.content, f.created_at as createdAt,
                f.handled_at as handledAt, f.handled_note as handledNote,
                u.type, u.nickname, u.email, u.message_limit as messageLimit,
                (SELECT COUNT(*) FROM messages m JOIN conversations c ON c.id = m.conversation_id
                 WHERE c.user_id = f.user_id AND m.role = 'user') as messagesUsed,
                (SELECT COUNT(*) FROM feedback f2 WHERE f2.user_id = f.user_id AND f2.handled_at IS NULL) as pendingSameUser
         FROM feedback f LEFT JOIN users u ON u.id = f.user_id
         ORDER BY (f.handled_at IS NULL) DESC, f.created_at DESC LIMIT 100`,
      )
      .all();
  }

  /** 유저 상세: 어떤 페르소나와 어떤 대화방을 만들었는지 */
  @Get("users/:id")
  userDetail(@Param("id") id: string) {
    const user = this.db
      .prepare(
        `SELECT id, type, nickname, email, created_at as createdAt, interview_limit as interviewLimit,
                (SELECT COUNT(*) FROM interview_sessions s WHERE s.user_id = users.id AND s.status != 'aborted') as interviewUsed
         FROM users WHERE id = ?`,
      )
      .get(id);
    const conversations = this.db
      .prepare(
        `SELECT c.id, c.persona_uuid as personaUuid, c.title, c.mode,
                c.created_at as createdAt, c.last_message_at as lastMessageAt,
                p.name as personaName, p.age as personaAge, p.sex as personaSex,
                p.occupation as personaOccupation,
                (SELECT m.affection FROM messages m WHERE m.conversation_id = c.id AND m.affection IS NOT NULL
                 ORDER BY m.created_at DESC, m.rowid DESC LIMIT 1) as affection,
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
        `SELECT c.id, c.user_id as userId, c.persona_uuid as personaUuid, c.title, c.mode,
                c.created_at as createdAt, p.name as personaName, p.age as personaAge,
                p.sex as personaSex, p.occupation as personaOccupation
         FROM conversations c LEFT JOIN personas p ON p.uuid = c.persona_uuid
         WHERE c.id = ?`,
      )
      .get(id);
    const messages = this.db
      .prepare(
        `SELECT id, role, content, tokens_in as tokensIn, tokens_out as tokensOut,
                affection, affection_note as affectionNote, created_at as createdAt
         FROM messages WHERE conversation_id = ? ORDER BY created_at, rowid`,
      )
      .all(id);
    return { ...(conv as any), messages };
  }
}
