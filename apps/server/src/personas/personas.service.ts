import { Injectable, NotFoundException } from "@nestjs/common";
import { DbService } from "../db/db.service";
import { PINNED_PERSONA_UUIDS } from "../db/seed";

const CARD_COLS = `uuid, name, one_liner as oneLiner, age, sex, occupation, province, district`;

@Injectable()
export class PersonasService {
  constructor(private readonly dbs: DbService) {}
  private get db() {
    return this.dbs.db;
  }

  featured(count = 8) {
    // 고정 페르소나(커스텀)는 항상 맨 앞에 노출
    const pinned = PINNED_PERSONA_UUIDS.map((uuid) =>
      this.db.prepare(`SELECT ${CARD_COLS} FROM personas WHERE uuid = ?`).get(uuid),
    ).filter(Boolean);

    // 날짜 시드 기반 "오늘의 이웃": 매일 같은 얼굴, 다음날 바뀜
    const day = new Date().toISOString().slice(0, 10);
    let seed = 0;
    for (const c of day) seed = (seed * 31 + c.charCodeAt(0)) >>> 0;
    const total = (this.db.prepare(`SELECT COUNT(*) as c FROM personas`).get() as any).c;
    const rows: any[] = [];
    while (rows.length < count) {
      seed = (seed * 1103515245 + 12345) >>> 0;
      const rowid = (seed % total) + 1;
      const row = this.db
        .prepare(`SELECT ${CARD_COLS} FROM personas WHERE rowid = ?`)
        .get(rowid) as any;
      if (row && !PINNED_PERSONA_UUIDS.includes(row.uuid) && !rows.some((r) => r.uuid === row.uuid)) {
        rows.push(row);
      }
    }
    return [...pinned, ...rows];
  }

  random() {
    const total = (this.db.prepare(`SELECT COUNT(*) as c FROM personas`).get() as any).c;
    const rowid = Math.floor(Math.random() * total) + 1;
    return this.db.prepare(`SELECT ${CARD_COLS} FROM personas WHERE rowid = ?`).get(rowid);
  }

  search(f: {
    q?: string;
    province?: string;
    sex?: string;
    ageMin?: number;
    ageMax?: number;
    page?: number;
    limit?: number;
  }) {
    const limit = Math.min(f.limit || 20, 50);
    const offset = ((f.page || 1) - 1) * limit;
    const where: string[] = [];
    const params: any[] = [];

    if (f.province) { where.push(`p.province = ?`); params.push(f.province); }
    if (f.sex) { where.push(`p.sex = ?`); params.push(f.sex); }
    if (f.ageMin) { where.push(`p.age >= ?`); params.push(f.ageMin); }
    if (f.ageMax) { where.push(`p.age <= ?`); params.push(f.ageMax); }

    if (f.q && f.q.trim()) {
      // FTS5 trigram: 한글 부분일치. 3자 미만은 LIKE 폴백
      const q = f.q.trim();
      if (q.length >= 3) {
        where.push(`p.uuid IN (SELECT uuid FROM persona_fts WHERE persona_fts MATCH ?)`);
        params.push(`"${q.replace(/"/g, '""')}"`);
      } else {
        where.push(`(p.one_liner LIKE ? OR p.occupation LIKE ? OR p.name LIKE ?)`);
        params.push(`%${q}%`, `%${q}%`, `%${q}%`);
      }
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const items = this.db
      .prepare(`SELECT ${CARD_COLS.replace(/uuid,/, "p.uuid,")} FROM personas p ${whereSql} LIMIT ? OFFSET ?`)
      .all(...params, limit, offset);
    return { items, page: f.page || 1, limit };
  }

  card(uuid: string) {
    const row = this.db.prepare(`SELECT ${CARD_COLS} FROM personas WHERE uuid = ?`).get(uuid);
    if (!row) throw new NotFoundException("persona not found");
    return row;
  }

  detail(uuid: string) {
    const card = this.card(uuid) as any;
    const d = this.db.prepare(`SELECT * FROM persona_details WHERE uuid = ?`).get(uuid) as any;
    if (!d) throw new NotFoundException("persona detail not found");
    return { ...card, ...d };
  }

  /** 웹 상세 화면용 — camelCase로 정리한 공개 상세 */
  detailPublic(uuid: string) {
    const d = this.detail(uuid);
    return {
      uuid: d.uuid,
      name: d.name,
      oneLiner: d.oneLiner,
      age: d.age,
      sex: d.sex,
      occupation: d.occupation,
      province: d.province,
      district: d.district,
      professionalPersona: d.professional_persona,
      sportsPersona: d.sports_persona,
      artsPersona: d.arts_persona,
      travelPersona: d.travel_persona,
      culinaryPersona: d.culinary_persona,
      familyPersona: d.family_persona,
      culturalBackground: d.cultural_background,
      skillsAndExpertise: d.skills_and_expertise,
      hobbiesAndInterests: d.hobbies_and_interests,
      careerGoalsAndAmbitions: d.career_goals_and_ambitions,
      maritalStatus: d.marital_status,
      educationLevel: d.education_level,
      familyType: d.family_type,
      housingType: d.housing_type,
    };
  }

  popular(days = 7, count = 10) {
    const rows = this.db
      .prepare(
        `SELECT persona_uuid, COUNT(*) as chats FROM usage_events
         WHERE event = 'chat_start' AND created_at >= datetime('now', ?)
         GROUP BY persona_uuid ORDER BY chats DESC LIMIT ?`,
      )
      .all(`-${days} days`, count) as any[];
    return rows
      .map((r) => {
        const card = this.db.prepare(`SELECT ${CARD_COLS} FROM personas WHERE uuid = ?`).get(r.persona_uuid);
        return card ? { ...card, chats: r.chats } : null;
      })
      .filter(Boolean);
  }
}
