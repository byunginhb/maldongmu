import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { PersonaDetail } from "@maldongmu/shared";
import Avatar from "../../../components/Avatar";
import { serverGet, SITE_URL } from "../../../lib/server-api";
import { RARE } from "../../../lib/rare";
import { BackButton, StartChat } from "./PersonaActions";

const SECTIONS: { key: keyof PersonaDetail; title: string }[] = [
  { key: "culturalBackground", title: "성격과 배경" },
  { key: "professionalPersona", title: "일" },
  { key: "familyPersona", title: "가족" },
  { key: "hobbiesAndInterests", title: "취미" },
  { key: "skillsAndExpertise", title: "잘하는 것" },
  { key: "sportsPersona", title: "여가와 운동" },
  { key: "artsPersona", title: "문화 생활" },
  { key: "travelPersona", title: "여행" },
  { key: "culinaryPersona", title: "음식" },
  { key: "careerGoalsAndAmbitions", title: "앞으로의 꿈" },
];

const load = (uuid: string) => serverGet<PersonaDetail>(`/personas/${encodeURIComponent(uuid)}/detail`, 86400);

/** 페르소나 상세 — 서버 렌더(검색 색인용 본문·메타데이터). 100만 페이지 중 희소 직업만 index, 나머지는 noindex */
export async function generateMetadata({ params }: { params: Promise<{ uuid: string }> }): Promise<Metadata> {
  const { uuid } = await params;
  const p = await load(uuid);
  if (!p) return { title: "이웃을 찾지 못했어요", robots: { index: false } };
  const title = `${p.name} — ${p.age}세 ${p.occupation}, ${p.province}`;
  const description = p.oneLiner.slice(0, 150);
  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/persona/${uuid}` },
    robots: { index: RARE.has(p.occupation), follow: true },
    openGraph: { title: `${title} | 말동무`, description, type: "profile", url: `${SITE_URL}/persona/${uuid}` },
    twitter: { card: "summary", title: `${title} | 말동무`, description },
  };
}

export default async function PersonaPage({ params }: { params: Promise<{ uuid: string }> }) {
  const { uuid } = await params;
  const p = await load(uuid);
  if (!p) notFound();

  const facts = [
    p.educationLevel && `학력 · ${p.educationLevel}`,
    p.maritalStatus,
    p.familyType,
    p.housingType && `${p.housingType} 거주`,
  ].filter(Boolean) as string[];
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `${p.name} — ${p.age}세 ${p.occupation}`,
    description: p.oneLiner,
    url: `${SITE_URL}/persona/${uuid}`,
    isPartOf: { "@type": "WebSite", name: "말동무", url: SITE_URL },
    about: { "@type": "Thing", name: `${p.occupation} AI 페르소나`, description: "실제 한국 인구 통계 데이터로 만든 가상 인물" },
  };

  return (
    <main className="page" style={{ paddingBottom: "calc(140px + env(safe-area-inset-bottom))" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <BackButton />

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
        <Avatar uuid={p.uuid} sex={p.sex} age={p.age} size={96} radius={20} />
        <h1 className="dot-title" style={{ marginTop: 16 }}>{p.name}</h1>
        <p className="meta" style={{ margin: 0 }}>{p.age}세 · {p.occupation}</p>
        <p className="meta" style={{ margin: "2px 0 0" }}>{p.province} {p.district?.replace(`${p.province}-`, "")}</p>
      </div>

      {facts.length > 0 && (
        <div className="chip-row" style={{ justifyContent: "center", flexWrap: "wrap", margin: "14px 0 0" }}>
          {facts.map((f) => <span key={f} className="chip" style={{ cursor: "default" }}>{f}</span>)}
        </div>
      )}

      <div style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 16, padding: "16px 18px", marginTop: 24 }}>
        <p style={{ margin: 0, fontSize: 15 }}>{p.oneLiner}</p>
      </div>

      {SECTIONS.map(({ key, title }) => {
        const text = p[key] as string | undefined;
        if (!text) return null;
        return (
          <section key={key} style={{ marginTop: 20 }}>
            <h2 className="dot-title" style={{ marginBottom: 8 }}>{title}</h2>
            <div style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 16, padding: "14px 18px" }}>
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.7 }}>{text}</p>
            </div>
          </section>
        );
      })}

      <p className="meta" style={{ margin: "24px 0 0", textAlign: "center" }}>
        말동무의 모든 인물은 한국의 실제 인구 통계 데이터를 바탕으로 만들어진 AI 페르소나예요. 특정 실존 인물과는 무관해요.
      </p>

      <StartChat uuid={p.uuid} name={p.name} />
    </main>
  );
}
