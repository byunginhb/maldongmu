"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { PersonaDetail } from "@maldongmu/shared";
import { apiGet, apiPost, LoginRequiredError } from "../../../lib/api";
import Avatar from "../../../components/Avatar";
import LoginSheet from "../../../components/LoginSheet";

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

export default function PersonaPage({ params }: { params: Promise<{ uuid: string }> }) {
  const { uuid } = use(params);
  const router = useRouter();
  const [p, setP] = useState<PersonaDetail | null>(null);
  const [starting, setStarting] = useState(false);
  const [showLogin, setShowLogin] = useState(false);

  useEffect(() => {
    apiGet<PersonaDetail>(`/personas/${uuid}/detail`).then(setP).catch(() => {});
  }, [uuid]);

  const startChat = async () => {
    setStarting(true);
    try {
      const res = await apiPost<{ id: string }>("/conversations", { personaUuid: uuid });
      router.push(`/chat/${res.id}`);
    } catch (e) {
      if (e instanceof LoginRequiredError) setShowLogin(true);
      setStarting(false);
    }
  };

  if (!p) {
    return (
      <main className="page">
        <div className="skeleton" style={{ height: 200 }} />
      </main>
    );
  }

  const facts = [
    p.educationLevel && `학력 · ${p.educationLevel}`,
    p.maritalStatus && `${p.maritalStatus}`,
    p.familyType && `${p.familyType}`,
    p.housingType && `${p.housingType} 거주`,
  ].filter(Boolean) as string[];

  return (
    <main className="page" style={{ paddingBottom: "calc(140px + env(safe-area-inset-bottom))" }}>
      <button className="btn-ghost" style={{ height: 36, padding: "0 14px", marginBottom: 20 }} onClick={() => router.back()}>
        ← 뒤로
      </button>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
        <Avatar uuid={p.uuid} sex={p.sex} age={p.age} size={96} radius={20} />
        <h1 className="dot-title" style={{ marginTop: 16 }}>{p.name}</h1>
        <p className="meta" style={{ margin: 0 }}>
          {p.age}세 · {p.occupation}
        </p>
        <p className="meta" style={{ margin: "2px 0 0" }}>
          {p.province} {p.district?.replace(`${p.province}-`, "")}
        </p>
      </div>

      {facts.length > 0 && (
        <div className="chip-row" style={{ justifyContent: "center", flexWrap: "wrap", margin: "14px 0 0" }}>
          {facts.map((f) => (
            <span key={f} className="chip" style={{ cursor: "default" }}>{f}</span>
          ))}
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

      <div className="cta-float">
        <div>
          <button className="btn-cta" onClick={startChat} disabled={starting}>
            {starting ? "연결하는 중..." : `${p.name}님과 대화 시작하기`}
          </button>
        </div>
      </div>

      {showLogin && <LoginSheet onClose={() => setShowLogin(false)} />}
    </main>
  );
}
