import { ForbiddenException, Injectable, NotFoundException, OnModuleInit } from "@nestjs/common";
import { nanoid } from "nanoid";
import { DbService } from "../db/db.service";
import { PersonasService } from "../personas/personas.service";
import { LlmService } from "../llm/llm.service";
import { fetchUrlText } from "./url";
import {
  extractPrompt,
  selectPrompt,
  questionsPrompt,
  interviewMessages,
  reportPrompt,
  parseJsonLoose,
  FALLBACK_QUESTIONS,
} from "./interview.prompt";

const CARD_COLS = `uuid, name, one_liner as oneLiner, age, sex, occupation, province, district`;
const N_PERSONAS = 3;
const N_CANDIDATES = 12;
const ATTEMPT_LIMIT_PER_HOUR = 5;
const MAX_RETRIES = 3;

@Injectable()
export class InterviewService implements OnModuleInit {
  // 동일 세션 중복 실행 방지(단일 프로세스 in-memory 가드)
  private running = new Set<string>();

  constructor(
    private readonly dbs: DbService,
    private readonly personas: PersonasService,
    private readonly llm: LlmService,
  ) {}
  private get db() {
    return this.dbs.db;
  }

  /** 부팅 시: 중단된(active) 세션을 정리/재개해 durable 보장 */
  onModuleInit() {
    const rows = this.db
      .prepare(`SELECT id FROM interview_sessions WHERE status = 'active'`)
      .all() as any[];
    for (const r of rows) this.resumeOrReap(r.id);
  }

  private touch(id: string) {
    this.db.prepare(`UPDATE interview_sessions SET updated_at = datetime('now') WHERE id = ?`).run(id);
  }
  private setStatus(id: string, status: string, error?: string) {
    this.db
      .prepare(`UPDATE interview_sessions SET status = ?, error = ?, updated_at = datetime('now') WHERE id = ?`)
      .run(status, error ?? null, id);
  }

  private session(id: string): any {
    return this.db.prepare(`SELECT * FROM interview_sessions WHERE id = ?`).get(id);
  }

  credits(userId: string) {
    const user = this.db.prepare(`SELECT interview_limit FROM users WHERE id = ?`).get(userId) as any;
    const granted = user?.interview_limit ?? 2;
    const used = (
      this.db
        .prepare(`SELECT COUNT(*) as c FROM interview_sessions WHERE user_id = ? AND status != 'aborted'`)
        .get(userId) as any
    ).c;
    return { used, granted, remaining: Math.max(0, granted - used) };
  }

  /** 새 인터뷰 시작: 게스트 거부 → 크레딧 원자 게이트 → 시도 기록 → 백그라운드 실행 */
  create(userId: string, rawInput: string, kind?: "text" | "url") {
    const user = this.db.prepare(`SELECT type FROM users WHERE id = ?`).get(userId) as any;
    if (!user) throw new NotFoundException("user not found");
    if (user.type === "guest") throw new ForbiddenException({ code: "LOGIN_REQUIRED", message: "로그인이 필요해요" });

    const input = (rawInput || "").trim().slice(0, 1000);
    if (input.length < 5) throw new ForbiddenException({ code: "INPUT_TOO_SHORT", message: "조금 더 자세히 적어주세요" });
    const resolvedKind: "text" | "url" = kind || (/^https?:\/\/\S+$/i.test(input) ? "url" : "text");

    // 시도 레이트리밋(환불 불가): 크레딧 환불 우회로 무한 fetch/LLM 호출 차단
    const attempts = (
      this.db
        .prepare(
          `SELECT COUNT(*) as c FROM usage_events WHERE user_id = ? AND event = 'interview_attempt' AND created_at >= datetime('now','-1 hour')`,
        )
        .get(userId) as any
    ).c;
    if (attempts >= ATTEMPT_LIMIT_PER_HOUR)
      throw new ForbiddenException({ code: "TOO_MANY_ATTEMPTS", message: "잠시 후 다시 시도해주세요" });

    const id = nanoid(12);
    // 크레딧 확인 + 세션 예약을 단일 트랜잭션으로 원자화 (2탭 동시/멀티워커 경합 방지)
    const reserve = this.db.transaction(() => {
      const limit = (this.db.prepare(`SELECT interview_limit FROM users WHERE id = ?`).get(userId) as any)
        ?.interview_limit ?? 2;
      const used = (
        this.db
          .prepare(`SELECT COUNT(*) as c FROM interview_sessions WHERE user_id = ? AND status != 'aborted'`)
          .get(userId) as any
      ).c;
      if (used >= limit)
        throw new ForbiddenException({ code: "INTERVIEW_LIMIT", message: "이웃 인터뷰는 계정당 2번 체험할 수 있어요" });
      this.db
        .prepare(
          `INSERT INTO interview_sessions (id, user_id, status, input_kind, input_raw) VALUES (?, ?, 'active', ?, ?)`,
        )
        .run(id, userId, resolvedKind, input);
    });
    reserve();

    this.db.prepare(`INSERT INTO usage_events (user_id, event) VALUES (?, 'interview_attempt')`).run(userId);
    void this.runPipeline(id);
    return { sessionId: id, ...this.credits(userId) };
  }

  /** durable 백그라운드 파이프라인 — 각 단계 완료 시 저장, 멱등(완료분 skip)해서 재개 가능 */
  async runPipeline(id: string) {
    if (this.running.has(id)) return;
    this.running.add(id);
    try {
      let s = this.session(id);
      if (!s || s.status !== "active") return;
      this.touch(id);

      // 1) URL 본문 추출 (선정 前 실패 = 환불)
      if (s.input_kind === "url" && !s.source_text) {
        const text = await fetchUrlText(s.input_raw);
        this.db.prepare(`UPDATE interview_sessions SET source_text = ?, updated_at = datetime('now') WHERE id = ?`).run(text, id);
        s = this.session(id);
      }
      const subject = s.input_kind === "url" ? s.source_text : s.input_raw;

      // 2) 주제/키워드/필터 추출 → 후보 → 3명 선정 (여기까지 성공 = 크레딧 확정 의미)
      if (!s.picks_json) {
        const parsed = parseJsonLoose(await this.llm.complete([{ role: "user", content: extractPrompt(subject) }])) || {};
        const topic = String(parsed.topic || subject).slice(0, 120).trim();
        const keywords = (Array.isArray(parsed.keywords) ? parsed.keywords : [])
          .filter((k: any) => typeof k === "string" && k.trim().length >= 2)
          .map((k: string) => k.trim().slice(0, 20))
          .slice(0, 5);
        const filters = this.cleanFilters(parsed.filters);
        const candidates = this.sampleCandidates(keywords, filters);
        if (!candidates.length) throw new Error("no candidates");
        const picks = this.pickThree(topic, candidates, await this.llm.complete([{ role: "user", content: selectPrompt(topic, candidates) }]));
        this.db
          .prepare(`UPDATE interview_sessions SET topic = ?, picks_json = ?, updated_at = datetime('now') WHERE id = ?`)
          .run(topic, JSON.stringify(picks), id);
        s = this.session(id);
      }
      const topic = s.topic as string;
      const picks: { uuid: string; reason: string }[] = JSON.parse(s.picks_json);

      // 3) 질문지
      if (!s.questions_json) {
        const parsed = parseJsonLoose(await this.llm.complete([{ role: "user", content: questionsPrompt(topic) }]));
        let questions: string[] = Array.isArray(parsed?.questions)
          ? parsed.questions.filter((q: any) => typeof q === "string" && q.trim()).map((q: string) => q.trim().slice(0, 200))
          : [];
        if (questions.length < 3) questions = FALLBACK_QUESTIONS;
        questions = questions.slice(0, 5);
        this.db.prepare(`UPDATE interview_sessions SET questions_json = ?, updated_at = datetime('now') WHERE id = ?`).run(JSON.stringify(questions), id);
        s = this.session(id);
      }
      const questions: string[] = JSON.parse(s.questions_json);

      // 4) 이웃별 인터뷰 (멱등: 완료된 이웃 skip)
      for (let i = 0; i < picks.length; i++) {
        const done = this.db
          .prepare(`SELECT 1 FROM interview_transcripts WHERE session_id = ? AND persona_uuid = ? AND status = 'done'`)
          .get(id, picks[i].uuid);
        if (done) continue;
        const detail = this.personas.detail(picks[i].uuid);
        const answer = await this.llm.complete(interviewMessages(detail, topic, questions));
        this.db
          .prepare(
            `INSERT INTO interview_transcripts (id, session_id, persona_uuid, order_idx, status, content)
             VALUES (?, ?, ?, ?, 'done', ?)
             ON CONFLICT(session_id, persona_uuid) DO UPDATE SET status = 'done', content = excluded.content`,
          )
          .run(nanoid(12), id, picks[i].uuid, i + 1, answer);
        this.touch(id);
      }

      // 5) 리포트
      if (!s.report_md) {
        const trs = this.transcriptsFor(id, picks);
        const report = await this.llm.complete([{ role: "user", content: reportPrompt(topic, trs) }]);
        this.db.prepare(`UPDATE interview_sessions SET report_md = ?, updated_at = datetime('now') WHERE id = ?`).run(report, id);
      }

      this.setStatus(id, "done");
    } catch (e: any) {
      this.handleFailure(id, e);
    } finally {
      this.running.delete(id);
    }
  }

  private handleFailure(id: string, e: any) {
    const s = this.session(id);
    if (!s || s.status !== "active") return;
    if (!s.picks_json) {
      // 선정 前 실패 → 환불(aborted)
      this.setStatus(id, "aborted", "준비 중 문제가 생겼어요");
      return;
    }
    const retries = (s.retries ?? 0) + 1;
    this.db.prepare(`UPDATE interview_sessions SET retries = ?, updated_at = datetime('now') WHERE id = ?`).run(retries, id);
    if (retries > MAX_RETRIES) {
      this.setStatus(id, "failed", "인터뷰를 마치지 못했어요");
    } else {
      // 잠시 후 재개 (transient 오류 대비). 이미 완료된 단계는 skip.
      setTimeout(() => this.runPipeline(id), 3000);
    }
  }

  /** active 세션을 상황에 맞게 재개 또는 정리(리퍼) */
  private resumeOrReap(id: string) {
    if (this.running.has(id)) return;
    const s = this.session(id);
    if (!s || s.status !== "active") return;
    const ageMin = (this.db.prepare(`SELECT (julianday('now') - julianday(updated_at)) * 1440 AS m FROM interview_sessions WHERE id = ?`).get(id) as any)?.m ?? 0;
    if (!s.picks_json && ageMin > 3) {
      this.setStatus(id, "aborted", "준비 중 문제가 생겼어요"); // 선정 前 좀비 → 환불
      return;
    }
    if (s.picks_json && (s.retries ?? 0) >= MAX_RETRIES && ageMin > 1) {
      this.setStatus(id, "failed", "인터뷰를 마치지 못했어요");
      return;
    }
    void this.runPipeline(id);
  }

  private cleanFilters(f: any): { sexes?: string[]; ageMin?: number; ageMax?: number } {
    if (!f || typeof f !== "object") return {};
    const out: any = {};
    if (Array.isArray(f.sexes)) {
      const s = f.sexes.filter((x: any) => x === "남자" || x === "여자");
      if (s.length) out.sexes = s;
    }
    if (Number.isInteger(f.ageMin) && f.ageMin > 0 && f.ageMin < 120) out.ageMin = f.ageMin;
    if (Number.isInteger(f.ageMax) && f.ageMax > 0 && f.ageMax < 120) out.ageMax = f.ageMax;
    return out;
  }

  /** 키워드 FTS + 인구필터로 후보 좁힘, 부족분 랜덤 채움 */
  private sampleCandidates(keywords: string[], filters: { sexes?: string[]; ageMin?: number; ageMax?: number }): any[] {
    const seen = new Set<string>();
    const pool: any[] = [];
    const filterSql: string[] = [];
    const filterParams: any[] = [];
    if (filters.sexes?.length) {
      filterSql.push(`p.sex IN (${filters.sexes.map(() => "?").join(",")})`);
      filterParams.push(...filters.sexes);
    }
    if (filters.ageMin) { filterSql.push(`p.age >= ?`); filterParams.push(filters.ageMin); }
    if (filters.ageMax) { filterSql.push(`p.age <= ?`); filterParams.push(filters.ageMax); }
    const fw = filterSql.length ? ` AND ${filterSql.join(" AND ")}` : "";

    for (const kw of keywords) {
      let rows: any[] = [];
      try {
        if (kw.length >= 3) {
          rows = this.db
            .prepare(
              `SELECT ${CARD_COLS.replace(/uuid,/, "p.uuid,")} FROM personas p
               WHERE p.uuid IN (SELECT uuid FROM persona_fts WHERE persona_fts MATCH ?)${fw} LIMIT 8`,
            )
            .all(`"${kw.replace(/"/g, '""')}"`, ...filterParams) as any[];
        } else {
          rows = this.db
            .prepare(`SELECT ${CARD_COLS.replace(/uuid,/, "p.uuid,")} FROM personas p WHERE p.one_liner LIKE ?${fw} LIMIT 8`)
            .all(`%${kw}%`, ...filterParams) as any[];
        }
      } catch {
        rows = [];
      }
      for (const r of rows) if (!seen.has(r.uuid)) { seen.add(r.uuid); pool.push(r); }
    }
    // 부족분 랜덤 채움
    const total = (this.db.prepare(`SELECT COUNT(*) as c FROM personas`).get() as any).c;
    let guard = 0;
    while (pool.length < N_CANDIDATES && guard < 60) {
      guard++;
      const rowid = Math.floor(Math.random() * total) + 1;
      const r = this.db.prepare(`SELECT ${CARD_COLS} FROM personas WHERE rowid = ?`).get(rowid) as any;
      if (r && !seen.has(r.uuid)) { seen.add(r.uuid); pool.push(r); }
    }
    return pool.slice(0, N_CANDIDATES);
  }

  /** LLM 픽 → 정확히 3명 (범위검증·dedupe·부족분 보충) */
  private pickThree(topic: string, candidates: any[], raw: string): { uuid: string; reason: string }[] {
    const parsed = parseJsonLoose(raw);
    const out: { uuid: string; reason: string }[] = [];
    const usedIdx = new Set<number>();
    const picks = Array.isArray(parsed?.picks) ? parsed.picks : [];
    for (const p of picks) {
      if (out.length >= N_PERSONAS) break;
      const idx = Number(p?.idx);
      if (!Number.isInteger(idx) || idx < 1 || idx > candidates.length || usedIdx.has(idx)) continue;
      usedIdx.add(idx);
      out.push({
        uuid: candidates[idx - 1].uuid,
        reason: typeof p.reason === "string" && p.reason.trim() ? p.reason.trim().slice(0, 200) : `${candidates[idx - 1].name}님과 이야기 나눠볼 만해요`,
      });
    }
    for (let i = 0; out.length < N_PERSONAS && i < candidates.length; i++) {
      if (usedIdx.has(i + 1)) continue;
      usedIdx.add(i + 1);
      out.push({ uuid: candidates[i].uuid, reason: `${candidates[i].name}님과 이야기 나눠볼 만해요` });
    }
    return out;
  }

  private transcriptsFor(id: string, picks: { uuid: string }[]) {
    return picks.map((p) => {
      const card = this.personas.card(p.uuid) as any;
      const tr = this.db
        .prepare(`SELECT content FROM interview_transcripts WHERE session_id = ? AND persona_uuid = ?`)
        .get(id, p.uuid) as any;
      return { name: card.name, occupation: card.occupation, content: tr?.content || "" };
    });
  }

  /** 스냅샷 (폴링용). active면 재개 시도(연결 끊김·재시작에도 유지). owner 스코프 강제. */
  getSnapshot(userId: string, id: string) {
    const s = this.db.prepare(`SELECT * FROM interview_sessions WHERE id = ? AND user_id = ?`).get(id, userId) as any;
    if (!s) throw new NotFoundException("interview not found");
    if (s.status === "active") this.resumeOrReap(id);

    const picksRaw: { uuid: string; reason: string }[] = s.picks_json ? JSON.parse(s.picks_json) : [];
    const picks = picksRaw.map((p) => ({ ...(this.personas.card(p.uuid) as any), reason: p.reason }));
    const trRows = this.db
      .prepare(`SELECT persona_uuid as personaUuid, order_idx as "order", status, content FROM interview_transcripts WHERE session_id = ? ORDER BY order_idx`)
      .all(id) as any[];
    const trById = new Map(trRows.map((t) => [t.personaUuid, t]));
    const transcripts = picksRaw.map((p, i) => {
      const card = this.personas.card(p.uuid) as any;
      const t = trById.get(p.uuid);
      return { personaUuid: p.uuid, order: i + 1, name: card.name, occupation: card.occupation, status: t?.status || "pending", content: t?.content || "" };
    });
    const interviewed = transcripts.filter((t) => t.status === "done").length;
    return {
      id: s.id,
      status: s.status,
      inputKind: s.input_kind,
      topic: s.topic,
      error: s.error,
      phase: this.phaseOf(s, interviewed, picksRaw.length),
      picks,
      questions: s.questions_json ? JSON.parse(s.questions_json) : [],
      transcripts,
      report: s.report_md || null,
      interviewed,
      total: picksRaw.length || N_PERSONAS,
      createdAt: s.created_at,
    };
  }

  private phaseOf(s: any, interviewed: number, total: number): string {
    if (s.status === "aborted") return "aborted";
    if (s.status === "failed") return "failed";
    if (s.report_md) return "done";
    if (s.picks_json && s.questions_json) return interviewed >= total ? "reporting" : "interviewing";
    if (s.picks_json) return "questioning";
    if (s.input_kind === "url" && !s.source_text) return "reading";
    return "finding";
  }

  list(userId: string) {
    return this.db
      .prepare(
        `SELECT id, topic, status, input_kind as inputKind, created_at as createdAt FROM interview_sessions
         WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`,
      )
      .all(userId);
  }
}
