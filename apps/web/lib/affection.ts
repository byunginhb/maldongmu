// 점수대별 상대의 마음 단계 (0~100). 서버 컴포넌트(공유 페이지·OG 이미지)와 클라이언트(게이지)가 함께 쓴다 — "use client" 없음
const STAGES: [number, string][] = [[80, "마음이 기울었어요"], [60, "설레는 중"], [40, "편해지는 중"], [20, "조금 궁금해요"], [0, "아직은 서먹해요"]];
export const stageOf = (score: number) => STAGES.find(([min]) => score >= min)![1];
