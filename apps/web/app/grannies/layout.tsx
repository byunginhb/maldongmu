import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "욕쟁이 할매 — 지역별 사투리 AI 할머니와 수다",
  description: "수도권·경상·전라·충청·제주, 지역마다 다른 욕쟁이 할매. 걸쭉한 사투리로 타박하다 결국 밥부터 챙겨주는 우리 동네 할매와 이야기해보세요.",
  alternates: { canonical: "/grannies" },
  openGraph: { title: "욕쟁이 할매 — 지역별 사투리 AI 할머니와 수다 | 말동무", description: "입은 걸어도 정은 깊은 우리 동네 할매들. 지역을 골라 앉으면 한바탕 타박부터." },
};

export default function GranniesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
