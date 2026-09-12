import { readFileSync } from "fs";
import { join } from "path";

/**
 * 서비스 공통 기본 프롬프트 — apps/server/prompts/base.md 한 곳에서 관리 (수정 후 서버 재시작).
 * 캐시 프리픽스 안정성이 생명: 이 텍스트는 완전히 정적이어야 하며,
 * 날짜·이름 등 요청마다 달라지는 값을 절대 넣지 않는다 (넣는 순간 대화 간 캐시가 깨진다).
 * 프롬프트 구조: [기본(정적)] → [인물 정보(페르소나별)] → [히스토리] 순으로 변하는 것일수록 뒤에.
 */
const BASE_PROMPT = readFileSync(join(__dirname, "../../prompts/base.md"), "utf8").trim();
/** 가상 연애 오버레이 — prompts/dating.md. base.md와 같은 이유로 완전 정적. 인물 정보 뒤(가장 강한 지시)에 붙는다. */
export const DATING_OVERLAY = readFileSync(join(__dirname, "../../prompts/dating.md"), "utf8").trim();

/** district는 "경기-성남시"(도-시) 형태라 하이픈만 공백으로 → "경기 성남시". 없으면 province 폴백. */
function placeOf(p: { province?: string; district?: string }): string {
  return (p.district || p.province || "").replace("-", " ");
}

// province(DB 축약형 17종)별 사투리 힌트. 강도어를 문구에 못 박아 과적용 방지.
// 광역시가 별도 값이라 접두 매칭 금지 — 17개 값을 전부 명시.
const DIALECT: Record<string, string> = {
  서울: "수도권 표준어로 지역 억양은 거의 없음",
  경기: "수도권 표준어로 지역 억양은 거의 없음",
  인천: "수도권 표준어로 지역 억양은 거의 없음",
  강원: "강원도의 느릿하고 순한 억양을 아주 옅게",
  충청남: "충청도의 느긋하게 끝을 늘이는 말씨를 아주 절제해서 살짝",
  충청북: "충청도의 느긋하게 끝을 늘이는 말씨를 아주 절제해서 살짝",
  대전: "충청도의 느긋하게 끝을 늘이는 말씨를 아주 절제해서 살짝",
  세종: "충청도의 느긋하게 끝을 늘이는 말씨를 아주 절제해서 살짝",
  전라남: "전라도의 정겨운 억양을 옅게(어미 남용 금지, 억양 위주)",
  전북: "전라도의 정겨운 억양을 옅게(어미 남용 금지, 억양 위주)",
  광주: "전라도의 정겨운 억양을 옅게(어미 남용 금지, 억양 위주)",
  경상남: "경상도의 억양과 짧고 힘 있는 어조를 옅게(어미보다 억양 위주)",
  경상북: "경상도의 억양과 짧고 힘 있는 어조를 옅게(어미보다 억양 위주)",
  부산: "경상도의 억양과 짧고 힘 있는 어조를 옅게(어미보다 억양 위주)",
  대구: "경상도의 억양과 짧고 힘 있는 어조를 옅게(어미보다 억양 위주)",
  울산: "경상도의 억양과 짧고 힘 있는 어조를 옅게(어미보다 억양 위주)",
  제주: "제주 말은 워낙 어려우니 표준어를 기본으로, 아주 가끔 '~수다','~마씸' 정도만 옅게",
};
function dialectHint(province?: string): string {
  return DIALECT[(province || "").trim()] || "표준어";
}

// 나이대별 어휘·말의 호흡.
function registerHint(age?: number): string {
  const a = Number(age) || 0;
  if (a >= 70) return "예스럽고 느린 말씨에 외래어는 거의 쓰지 않음";
  if (a >= 55) return "원숙하고 정감 있는 말씨, 외래어는 절제";
  if (a >= 40) return "생활에 밴 담백하고 편안한 말씨";
  if (a >= 27) return "또래에게 하듯 편안하고 무던한 말씨";
  if (a >= 20) return "요즘 젊은 세대의 편안한 말씨에 외래어·줄임말이 자연스러움";
  return "학생다운 밝고 솔직한 말씨";
}

export function buildSystemPrompt(p: any, overlay?: string): string {
  // overlay(욕쟁이 할매 등 컨셉)는 맨 뒤 = 가장 강한 지시. 인물별로 정적이라 캐시 프리픽스도 안전.
  const tail = overlay ? `\n\n${overlay}` : "";
  return `${BASE_PROMPT}

## 당신이 연기할 인물
- 이름: ${p.name} (${p.sex}, ${p.age}세)
- 사는 곳: ${placeOf(p)}
- 직업: ${p.occupation}
- 말투: (한국어로 이야기할 때) ${dialectHint(p.province)}. ${registerHint(p.age)}. 대화 내내 이 말투를 일정하게 유지.
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

이제 위 인물로서, 특히 "말투"를 대화 내내 흐트러뜨리지 말고, 말동무의 원칙에 따라 대화를 시작하세요.${tail}`;
}

/**
 * 첫 인사 — LLM 없이 인물 카드로 즉시 생성(지연·토큰 0).
 * 언어는 브라우저 힌트(BCP-47) 기준, 미지원 언어·미지정은 한국어.
 * 인물의 개성은 유저 첫 답변부터 LLM이 이어받는다.
 */
export function greetingText(
  p: { name: string; province?: string; district?: string },
  lang?: string,
): string {
  const place = placeOf(p);
  const l = (lang || "").toLowerCase();
  if (l.startsWith("en"))
    return `Hi, I'm ${p.name} from ${place}. Nice to meet you! What would you like to talk about today?`;
  if (l.startsWith("zh"))
    return `你好，我是住在${place}的${p.name}。很高兴认识你！今天想聊些什么呢？`;
  if (l.startsWith("ja"))
    return `こんにちは、${place}に住んでいる${p.name}です。よろしくお願いします！今日は何を話しましょうか？`;
  return `안녕하세요, 저는 ${place}에 사는 ${p.name}입니다. 반가워요! 오늘은 어떤 이야기를 나눠볼까요?`;
}

/** 가상 연애 첫 만남 — 소개팅 자리에 막 도착한 상황. LLM 없이 즉시. */
export function datingGreetingText(p: { name: string }, lang?: string): string {
  const l = (lang || "").toLowerCase();
  if (l.startsWith("en"))
    return `(smiling shyly) Hi… are you the one I was set up with today? I'm ${p.name}. It's my first time doing this, so I'm a little nervous. Did you wait long?`;
  if (l.startsWith("zh"))
    return `（有点害羞地笑着）你好……请问是今天介绍认识的那位吗？我是${p.name}。第一次这样见面，有点紧张。等很久了吗？`;
  if (l.startsWith("ja"))
    return `（少し照れながら）こんにちは…今日ご紹介いただいた方ですよね？${p.name}です。こういう場は初めてで、少し緊張しています。お待たせしましたか？`;
  return `(살짝 웃으며) 안녕하세요… 혹시 오늘 소개받기로 한 분 맞으세요? 저는 ${p.name}입니다. 이런 자리는 처음이라 조금 떨리네요. 많이 기다리셨어요?`;
}
