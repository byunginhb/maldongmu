import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { PersonaCard as Card } from "@maldongmu/shared";
import PersonaCard from "../../../components/PersonaCard";
import { serverGet, SITE_URL } from "../../../lib/server-api";

interface Group { key: string; label: string; blurb: string; count: number; items: Card[] }
const load = (key: string) => serverGet<Group>(`/personas/occupations/${encodeURIComponent(key)}?limit=24`, 86400);

/** 직업 큐레이션 페이지 — "판사와 대화하기" 같은 검색 유입용 랜딩. 서버 렌더 + 메타데이터 + JSON-LD */
export async function generateMetadata({ params }: { params: Promise<{ key: string }> }): Promise<Metadata> {
  const { key } = await params;
  const g = await load(key);
  if (!g) return { title: "이웃을 찾지 못했어요", robots: { index: false } };
  const title = `${g.label}와 대화하기 — AI ${g.label} 페르소나 ${g.count.toLocaleString()}명`;
  const description = `${g.blurb}. 실제 인구 데이터로 만든 ${g.label} AI 페르소나와 지금 바로 이야기해보세요. 회원가입 없이 시작.`;
  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/meet/${key}` },
    openGraph: { title: `${title} | 말동무`, description, url: `${SITE_URL}/meet/${key}`, type: "website" },
    twitter: { card: "summary_large_image", title: `${title} | 말동무`, description },
  };
}

export default async function OccupationPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const g = await load(key);
  if (!g) notFound();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${g.label}와 대화하기`,
    description: g.blurb,
    url: `${SITE_URL}/meet/${key}`,
    isPartOf: { "@type": "WebSite", name: "말동무", url: SITE_URL },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: g.items.length,
      itemListElement: g.items.map((p, i) => ({ "@type": "ListItem", position: i + 1, name: `${p.name} (${p.age}세 ${p.occupation})`, url: `${SITE_URL}/persona/${p.uuid}` })),
    },
  };
  return (
    <main className="page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <p className="meta" style={{ margin: "0 0 6px" }}><Link href="/meet">만나보고 싶던 사람들</Link> › {g.label}</p>
      <h1 className="dot-title">{g.label}와 대화하기</h1>
      <p style={{ margin: "6px 0 4px", fontSize: 15 }}>{g.blurb}</p>
      <p className="meta" style={{ margin: "0 0 20px" }}>
        실제 한국 인구 데이터로 만든 {g.label} AI 페르소나 {g.count.toLocaleString()}명 중 {g.items.length}명이에요. 마음에 드는 분을 골라 바로 이야기해보세요.
      </p>
      <div className="card-grid">
        {g.items.map((p) => <PersonaCard key={p.uuid} p={p} />)}
      </div>
      <p className="meta" style={{ margin: "28px 0 0", textAlign: "center" }}>
        평소엔 만나기 어려운 다른 직업의 이웃도 있어요 → <Link href="/meet" style={{ fontWeight: 600 }}>전체 보기</Link>
      </p>
    </main>
  );
}
