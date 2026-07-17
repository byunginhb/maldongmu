"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { PersonaCard as Card } from "@maldongmu/shared";
import { apiGet } from "../lib/api";
import PersonaCard from "../components/PersonaCard";
import DotDivider from "../components/DotDivider";
import Avatar from "../components/Avatar";

// 헤더 장식용 아바타 시드 (고정 — 서버/클라 렌더 일치)
const HERO_SEEDS = [
  { uuid: "hero-haenyeo", sex: "여자", age: 68 },
  { uuid: "hero-farmer", sex: "남자", age: 55 },
  { uuid: "hero-poet", sex: "여자", age: 27 },
  { uuid: "hero-welder", sex: "남자", age: 34 },
  { uuid: "hero-gukak", sex: "여자", age: 45 },
];

// 컨셉 스트립 메시지 (방문할 때마다 번갈아 노출)
const HERO_MESSAGES = [
  <>제주의 해녀부터 여든의 시인까지 — <b>평소엔 만나기 어려운 100만 명의 이웃</b>이 기다리고 있어요</>,
  <>스무 살의 고민부터 일흔의 지혜까지 — <b>다른 세대와의 대화</b>가 여기선 어렵지 않아요</>,
];

export default function Home() {
  const router = useRouter();
  const [featured, setFeatured] = useState<Card[] | null>(null);
  const [popular, setPopular] = useState<(Card & { chats: number })[]>([]);
  const [randomLoading, setRandomLoading] = useState(false);
  const [heroIdx, setHeroIdx] = useState(0);

  useEffect(() => {
    apiGet<Card[]>("/personas/featured").then(setFeatured).catch(() => setFeatured([]));
    apiGet<(Card & { chats: number })[]>("/personas/popular").then(setPopular).catch(() => {});
    // 방문마다 다른 컨셉 문구 (hydration mismatch 방지를 위해 mount 후 선택)
    setHeroIdx(Math.floor(Math.random() * HERO_MESSAGES.length));
  }, []);

  const meetRandom = async () => {
    setRandomLoading(true);
    try {
      const p = await apiGet<Card>("/personas/random");
      router.push(`/persona/${p.uuid}`);
    } finally {
      setRandomLoading(false);
    }
  };

  return (
    <main className="page">
      <header style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          <h1 className="dot-title" style={{ color: "var(--coral)", margin: 0 }}>말동무</h1>
          <div className="hero-avatars" aria-hidden>
            {HERO_SEEDS.map((s) => (
              <span key={s.uuid}>
                <Avatar uuid={s.uuid} sex={s.sex} age={s.age} size={26} radius={0} />
              </span>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "6px 0 12px" }}>
          <p style={{ margin: 0, fontSize: 16 }}>오늘은 누구랑 얘기할까요?</p>
          <Link href="/about" className="meta" style={{ fontWeight: 600, flexShrink: 0 }}>
            서비스 소개 →
          </Link>
        </div>
        <div className="hero-strip">
          <i aria-hidden />
          <span>{HERO_MESSAGES[heroIdx]}</span>
        </div>
      </header>

      <h2 className="dot-title">오늘의 이웃</h2>
      <p className="meta" style={{ margin: "4px 0 14px" }}>매일 새로운 이웃을 소개해드려요</p>
      <div className="card-grid">
        {featured === null
          ? Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton" />)
          : featured.map((p) => <PersonaCard key={p.uuid} p={p} />)}
      </div>

      <DotDivider />

      {popular.length > 0 && (
        <>
          <h2 className="dot-title">요즘 인기</h2>
          <p className="meta" style={{ margin: "2px 0 12px" }}>이번 주에 대화가 많았던 이웃들이에요</p>
          <div className="card-grid">
            {popular.slice(0, 6).map((p) => (
              <PersonaCard key={p.uuid} p={p} />
            ))}
          </div>
          <DotDivider />
        </>
      )}

      <button className="btn-cta" onClick={meetRandom} disabled={randomLoading}>
        {randomLoading ? "찾는 중..." : "아무나 만나기"}
      </button>
    </main>
  );
}
