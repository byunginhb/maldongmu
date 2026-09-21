import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "가상 연애 — AI 소개팅·연애 시뮬레이션",
  description: "성별과 나이대만 고르면 소개팅 자리로 안내해드려요. 말 한마디에 움직이는 호감도, 서두르지 않는 진짜 같은 AI 가상 연애. 회원가입 없이 시작.",
  alternates: { canonical: "/dating" },
  openGraph: { title: "가상 연애 — AI 소개팅·연애 시뮬레이션 | 말동무", description: "말 한마디에 움직이는 호감도. 100만 한국인 AI 페르소나와 설레는 첫 만남." },
};

export default function DatingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
