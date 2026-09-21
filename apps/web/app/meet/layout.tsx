import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "만나보고 싶던 사람들 — 판사·소방관·해녀 AI 페르소나와 대화",
  description: "판사, 소방관, 해녀, 비행기 조종사, 승려, 천문학 연구원… 평소엔 만나기 어려운 직업의 AI 페르소나와 이야기해보세요. 매일 새로운 분이 인사드려요.",
  alternates: { canonical: "/meet" },
};

export default function MeetLayout({ children }: { children: React.ReactNode }) {
  return children;
}
