import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { DbService } from "../db/db.service";
import { PINNED_PERSONA_UUIDS } from "../db/seed";
import { LlmService } from "../llm/llm.service";

const CARD_COLS = `uuid, name, one_liner as oneLiner, age, sex, occupation, province, district`;

// 고민 카테고리 -> 후보 샘플링용 키워드 (one_liner LIKE 매칭)
const CONCERN_KEYWORDS: Record<string, string[]> = {
  "일·직장": ["회사", "직장", "사업"],
  "연애·썸": ["연애", "결혼", "다정"],
  가족: ["가족", "부모", "자녀"],
  "친구·관계": ["친구", "모임", "사람들"],
  "돈·미래": ["재테크", "투자", "안정"],
  "건강·체력": ["건강", "운동", "체력"],
  "공부·진로": ["진로", "공부", "학생"],
  "외로움·수다": ["위로", "이야기", "유쾌"],
};

// "만나기 어려운 직업" 큐레이션 (DB 실측 완료, occupation 정확 매칭)
const OCCUPATION_GROUPS: { key: string; label: string; occupations: string[]; blurb: string }[] = [
  { key: "judge", label: "판사", occupations: ["판사"], blurb: "법정 밖에서 듣는 판사의 이야기" },
  { key: "firefighter", label: "소방관", occupations: ["소방관"], blurb: "현장을 지키는 사람의 하루" },
  { key: "haenyeo", label: "해녀", occupations: ["해녀"], blurb: "바다와 함께 살아온 삶" },
  { key: "pilot", label: "비행기 조종사", occupations: ["비행기 조종사"], blurb: "하늘 위에서 보낸 시간들" },
  { key: "navigator", label: "항해사", occupations: ["항해사"], blurb: "먼 바다를 건너는 사람" },
  { key: "gugak", label: "국악인", occupations: ["국악인", "국악 연주가"], blurb: "우리 소리를 지키는 사람" },
  { key: "monk", label: "승려", occupations: ["승려"], blurb: "마음을 다스리는 이야기" },
  { key: "astronomer", label: "천문학 연구원", occupations: ["천문 및 우주 과학 연구원"], blurb: "별을 보며 사는 사람" },
  { key: "actor", label: "배우", occupations: ["배우"], blurb: "무대 뒤의 진짜 얼굴" },
  { key: "writer", label: "문학작가", occupations: ["문학작가"], blurb: "글로 세상을 담는 사람" },
];

@Injectable()
export class PersonasService {
  // 직업 큐레이션 그룹 캐시 (occupation 무인덱스 풀스캔을 하루 1회로 제한)
  private occupationsCache: { date: string; groups: Record<string, any[]> } | null = null;

  constructor(
    private readonly dbs: DbService,
    private readonly llm: LlmService,
  ) {}
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

  /** 고민 기반 페르소나 추천: 키워드 샘플링 + LLM 1회 호출로 3명 선정 */
  async recommend(userId: string, concern: string, detail?: string) {
    const used = (
      this.db
        .prepare(
          `SELECT COUNT(*) as c FROM usage_events WHERE user_id = ? AND event = 'recommend' AND created_at >= date('now')`,
        )
        .get(userId) as any
    ).c;
    if (used >= 20) {
      throw new ForbiddenException({ code: "RECOMMEND_LIMIT", message: "오늘은 추천을 많이 받았어요" });
    }
    // 한도 검사와 같은 동기 블록에서 선기록 — LLM 호출(await) 중 동시요청이 한도를 우회하지 못함
    this.db.prepare(`INSERT INTO usage_events (user_id, event) VALUES (?, 'recommend')`).run(userId);

    // 후보 샘플링: 키워드당 최대 8명 + 완전 랜덤 6명, uuid 기준 dedupe, 최대 30명
    const keywords = CONCERN_KEYWORDS[concern] || [];
    const total = (this.db.prepare(`SELECT COUNT(*) as c FROM personas`).get() as any).c;
    const seen = new Set<string>();
    const pool: any[] = [];

    for (const kw of keywords) {
      const rows = this.db
        .prepare(
          `SELECT ${CARD_COLS} FROM personas WHERE rowid >= (abs(random()) % 900000) AND one_liner LIKE ? LIMIT 8`,
        )
        .all(`%${kw}%`) as any[];
      for (const r of rows) {
        if (!seen.has(r.uuid)) { seen.add(r.uuid); pool.push(r); }
      }
    }
    for (let i = 0; i < 6; i++) {
      const rowid = Math.floor(Math.random() * total) + 1;
      const r = this.db.prepare(`SELECT ${CARD_COLS} FROM personas WHERE rowid = ?`).get(rowid) as any;
      if (r && !seen.has(r.uuid)) { seen.add(r.uuid); pool.push(r); }
    }
    const candidates = pool.slice(0, 30);

    const list = candidates
      .map((p, i) => `${i + 1}. ${p.name} (${p.age}세 ${p.sex}, ${p.occupation}, ${p.province} ${p.district}) - ${p.oneLiner}`)
      .join("\n");
    const prompt = `사용자의 고민: ${concern}${detail ? ` - ${detail}` : ""}

후보 목록:
${list}

이 고민을 가진 사람에게 말동무로 어울리는 3명을 골라 JSON으로만 응답: {"picks":[{"idx":번호,"reason":"..."}]}. reason은 이 사람이 왜 어울리는지 다정한 존댓말 1문장으로 작성해줘.`;

    let picks: { idx: number; reason: string }[] = [];
    try {
      const raw = await this.llm.complete([{ role: "user", content: prompt }]);
      const cleaned = raw.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(cleaned);
      picks = (parsed.picks || []).filter(
        (p: any) => Number.isInteger(p.idx) && p.idx >= 1 && p.idx <= candidates.length,
      );
    } catch {
      /* LLM 응답 파싱 실패 시 아래 폴백으로 채움 */
    }

    const items: any[] = [];
    const pickedIdx = new Set<number>();
    for (const p of picks) {
      if (items.length >= 3 || pickedIdx.has(p.idx)) continue;
      pickedIdx.add(p.idx);
      const persona = candidates[p.idx - 1];
      items.push({ ...persona, reason: p.reason || `${persona.name} 이야기를 나누기 좋은 분이에요` });
    }
    for (let i = 0; items.length < 3 && i < candidates.length; i++) {
      if (pickedIdx.has(i + 1)) continue;
      pickedIdx.add(i + 1);
      const persona = candidates[i];
      items.push({ ...persona, reason: `${persona.name} 이야기를 나누기 좋은 분이에요` });
    }

    return { items };
  }

  /** 만나기 어려운 직업 대표 페르소나: 날짜 시드로 매일 교체, 하루 단위 캐시 */
  occupations() {
    const day = new Date().toISOString().slice(0, 10);
    if (!this.occupationsCache || this.occupationsCache.date !== day) {
      const allLabels = OCCUPATION_GROUPS.flatMap((g) => g.occupations);
      const placeholders = allLabels.map(() => "?").join(",");
      const rows = this.db
        .prepare(`SELECT ${CARD_COLS} FROM personas WHERE occupation IN (${placeholders})`)
        .all(...allLabels) as any[];
      const groups: Record<string, any[]> = {};
      for (const g of OCCUPATION_GROUPS) groups[g.key] = [];
      for (const r of rows) {
        for (const g of OCCUPATION_GROUPS) {
          if (g.occupations.includes(r.occupation)) groups[g.key].push(r);
        }
      }
      this.occupationsCache = { date: day, groups };
    }

    let daySeed = 0;
    for (const c of day) daySeed = (daySeed * 31 + c.charCodeAt(0)) >>> 0;

    const items = OCCUPATION_GROUPS.map((g) => {
      const members = this.occupationsCache!.groups[g.key];
      if (!members.length) return null;
      let seed = daySeed;
      for (const c of g.key) seed = (seed * 31 + c.charCodeAt(0)) >>> 0;
      const persona = members[seed % members.length];
      return { key: g.key, label: g.label, blurb: g.blurb, count: members.length, persona };
    }).filter(Boolean);

    return { items };
  }
}
