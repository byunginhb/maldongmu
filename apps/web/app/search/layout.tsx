import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "이웃 찾기 — 지역·나이·성별·직업으로 AI 페르소나 검색",
  description: "100만 명의 한국인 AI 페르소나를 지역, 나이, 성별, 직업, 취미로 검색하고 바로 대화해보세요.",
  alternates: { canonical: "/search" },
};

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return children;
}
