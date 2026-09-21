import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Avatar from "../../../components/Avatar";
import { stageOf } from "../../../lib/affection";
import { getShareCard } from "../../../lib/share";

export const dynamic = "force-dynamic";

/** 호감도 결과 카드 공유 페이지 — 공개. 카톡·SNS에서 들어온 사람이 바로 소개팅을 시작하게 하는 유입 랜딩 */
export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params;
  const card = await getShareCard(token);
  if (!card) return { title: "말동무" };
  const title = `${card.persona.name}님의 호감도 ${card.score} · ${stageOf(card.score)}`;
  return {
    title,
    robots: { index: false }, // 사용자 생성 카드 — 색인 대신 소셜 미리보기만
    description: card.line ? `"${card.line}" — 말동무 가상 연애` : "말동무 가상 연애 결과",
    openGraph: { title, description: card.line || "말동무 가상 연애", type: "website" },
    twitter: { card: "summary_large_image", title, description: card.line || "말동무 가상 연애" },
  };
}

export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const card = await getShareCard(token);
  if (!card) notFound();
  const p = card.persona;
  return (
    <main className="page" style={{ textAlign: "center" }}>
      <p className="meta" style={{ margin: "8px 0 18px" }}>말동무 가상 연애 결과</p>
      <div style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 20, padding: "24px 20px" }}>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <Avatar uuid={p.uuid} sex={p.sex} age={p.age} size={96} radius={22} />
        </div>
        <h1 className="dot-title" style={{ margin: "14px 0 2px" }}>{p.name}님의 호감도 {card.score}</h1>
        <p className="meta" style={{ margin: 0 }}>{p.age}세 · {p.occupation} · {p.province}</p>
        <div className="affection-track" style={{ margin: "16px 0 6px" }} aria-hidden>
          <div className="affection-fill" style={{ width: `${card.score}%` }} />
        </div>
        <p style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 600 }}>{stageOf(card.score)}</p>
        {card.line && <p style={{ margin: 0, fontSize: 15, lineHeight: 1.7 }}>“{card.line}”</p>}
        {card.note && <p className="meta" style={{ margin: "8px 0 0" }}>속마음: {card.note}</p>}
      </div>
      <p style={{ margin: "24px 0 12px", fontSize: 15 }}>성별과 나이대만 고르면 나도 소개팅 시작</p>
      <Link href="/?ref=share" className="btn-cta">나도 소개받기</Link>
      <p className="meta" style={{ marginTop: 14 }}>100만 한국인 AI 페르소나와 진짜 같은 대화 · 말동무</p>
    </main>
  );
}
