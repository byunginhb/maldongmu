import { Injectable, OnModuleDestroy } from "@nestjs/common";
import Database from "better-sqlite3";
import { join } from "path";
import { seedCustomPersonas } from "./seed";

@Injectable()
export class DbService implements OnModuleDestroy {
  readonly db: Database.Database;

  constructor() {
    const path = process.env.DATABASE_PATH || join(process.cwd(), "data", "maldongmu.db");
    this.db = new Database(path);
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("foreign_keys = ON");
    this.migrate();
    seedCustomPersonas(this.db);
  }

  private migrate() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL DEFAULT 'guest',
        email TEXT,
        nickname TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id),
        persona_uuid TEXT NOT NULL,
        title TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        last_message_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_conv_user ON conversations(user_id, last_message_at DESC);
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL REFERENCES conversations(id),
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        tokens_in INTEGER DEFAULT 0,
        tokens_out INTEGER DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_msg_conv ON messages(conversation_id, created_at);
      CREATE TABLE IF NOT EXISTS usage_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT,
        persona_uuid TEXT,
        event TEXT NOT NULL,
        tokens INTEGER DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_usage_persona ON usage_events(persona_uuid, created_at);
      CREATE INDEX IF NOT EXISTS idx_usage_created ON usage_events(created_at);
      CREATE TABLE IF NOT EXISTS feedback (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      -- 이웃 인터뷰(페르소나 설문조사) 세션. 세션 행 = 크레딧 단위.
      CREATE TABLE IF NOT EXISTS interview_sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id),
        status TEXT NOT NULL DEFAULT 'active',        -- active | done | failed | aborted
        input_kind TEXT NOT NULL,                     -- text | url
        input_raw TEXT NOT NULL,
        source_url TEXT,
        source_text TEXT,
        topic TEXT,
        picks_json TEXT,                              -- [{uuid,reason}] × 3
        questions_json TEXT,                          -- ["...", ...] 5문항
        report_md TEXT,
        error TEXT,
        retries INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_interview_user ON interview_sessions(user_id, created_at DESC);
      -- 이웃별 인터뷰 전문 (완료 단위 저장 → 멱등 재개)
      CREATE TABLE IF NOT EXISTS interview_transcripts (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL REFERENCES interview_sessions(id),
        persona_uuid TEXT NOT NULL,
        order_idx INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',        -- pending | done | failed
        content TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE UNIQUE INDEX IF NOT EXISTS idx_interview_tr ON interview_transcripts(session_id, persona_uuid);
    `);
    // 기존 DB 마이그레이션: 로그인 사용자 메시지 한도 (기본 100)
    try {
      this.db.exec(`ALTER TABLE users ADD COLUMN message_limit INTEGER DEFAULT 100`);
    } catch {
      /* 이미 있음 */
    }
    // 이웃 인터뷰 크레딧 (기본 2, 어드민이 증설)
    try {
      this.db.exec(`ALTER TABLE users ADD COLUMN interview_limit INTEGER DEFAULT 2`);
    } catch {
      /* 이미 있음 */
    }
    // 인터뷰 시도 레이트리밋용 per-user 조회 인덱스 (환불불가 카운터)
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_usage_user ON usage_events(user_id, event, created_at)`);
  }

  onModuleDestroy() {
    this.db.close();
  }
}
