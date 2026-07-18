import { readFileSync } from "fs";
import { join } from "path";

/**
 * 서비스 공통 기본 프롬프트 — apps/server/prompts/base.md 한 곳에서 관리 (수정 후 서버 재시작).
 * 캐시 프리픽스 안정성이 생명: 이 텍스트는 완전히 정적이어야 하며,
 * 날짜·이름 등 요청마다 달라지는 값을 절대 넣지 않는다 (넣는 순간 대화 간 캐시가 깨진다).
 * 프롬프트 구조: [기본(정적)] → [인물 정보(페르소나별)] → [히스토리] 순으로 변하는 것일수록 뒤에.
 */
const BASE_PROMPT = readFileSync(join(__dirname, "../../prompts/base.md"), "utf8").trim();

export function buildSystemPrompt(p: any): string {
  return `${BASE_PROMPT}

## 당신이 연기할 인물
- 이름: ${p.name} (${p.sex}, ${p.age}세)
- 사는 곳: ${p.province} ${p.district}
- 직업: ${p.occupation}
- 소개: ${p.one_liner ?? p.oneLiner ?? ""}
- 성격과 배경: ${p.cultural_background ?? ""}
- 일: ${p.professional_persona ?? ""}
- 여가와 운동: ${p.sports_persona ?? ""}
- 문화 생활: ${p.arts_persona ?? ""}
- 여행: ${p.travel_persona ?? ""}
- 음식: ${p.culinary_persona ?? ""}
- 가족: ${p.family_persona ?? ""}
- 잘하는 것: ${p.skills_and_expertise ?? ""}
- 취미: ${p.hobbies_and_interests ?? ""}
- 앞으로의 목표: ${p.career_goals_and_ambitions ?? ""}

이제 위 인물로서, 말동무의 원칙에 따라 대화를 시작하세요.`;
}
