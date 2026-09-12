"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { PersonaCard as Card } from "@maldongmu/shared";
import { apiGet } from "../lib/api";
import PersonaCard from "../components/PersonaCard";
import DotDivider from "../components/DotDivider";
import Avatar from "../components/Avatar";
import { SkeletonCard } from "../components/ui";
import TodayFriends from "../components/TodayFriends";

// 헤더 장식용 아바타 시드 (고정 — 같은 인물은 항상 같은 사진)
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

// 히어로 CTA 위 "누굴 만날지 모르는" 미스터리 얼굴 (고정 시드)
const MEET_FACES = [
  { uuid: "meet-a", sex: "여자", age: 31 },
  { uuid: "meet-b", sex: "남자", age: 58 },
  { uuid: "meet-c", sex: "여자", age: 24 },
];

// 가상 연애 배너 장식 얼굴 (고정 시드)
const DATING_FACES = [
  { uuid: "dating-a", sex: "여자", age: 28 },
  { uuid: "dating-b", sex: "남자", age: 33 },
];

// 고민 기반 추천 진입 칩
const CONCERNS = ["일·직장", "연애·썸", "가족", "친구·관계", "돈·미래", "건강·체력", "공부·진로", "외로움·수다"];

// 욕쟁이 할매 배너 장식 얼굴 (server granny uuid와 동일 시드 → 얼굴 일치)
const GRANNY_FACES = [
  { uuid: "c0de0003911a5100000000000000d003", age: 68 },
  { uuid: "c0de0004911a5100000000000000d004", age: 71 },
  { uuid: "c0de0005911a5100000000000000d005", age: 70 },
  { uuid: "c0de0006911a5100000000000000d006", age: 69 },
  { uuid: "c0de0007911a5100000000000000d007", age: 72 },
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
          <h1 className="dot-title" style={{ color: "var(--coral)", margin: 0, display: "flex", alignItems: "center", gap: 9 }}>
            <svg width="26" height="26" viewBox="0 0 16 16" shapeRendering="crispEdges" aria-hidden style={{ flexShrink: 0 }}>
              <path
                d="M4 1h8v1H4zM2 2h12v1H2zM2 3h12v6H2zM2 9h12v1H2zM4 10h8v1H4zM4 11h2v1H4zM4 12h1v1H4z"
                fill="var(--coral)"
              />
              <path d="M5 5h1v1H5zM8 5h1v1H8zM11 5h1v1h-1z" fill="var(--paper)" />
            </svg>
            말동무
          </h1>
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

      {/* 상단 메뉴: 욕쟁이 할매 (coral CTA 아님 — 화면당 coral 1개 원칙 유지) */}
      <Link href="/grannies" className="granny-banner">
        <span className="granny-banner-faces" aria-hidden>
          {GRANNY_FACES.map((f) => (
            <span key={f.uuid}><Avatar uuid={f.uuid} sex="여자" age={f.age} size={34} radius={10} /></span>
          ))}
        </span>
        <span className="granny-banner-text">
          <b>욕쟁이 할매</b>
          <span className="meta">지역별 할매한테 한바탕 타박 들으러 가기</span>
        </span>
        <span className="granny-banner-go" aria-hidden>→</span>
      </Link>

      {/* 가상 연애 (배너 스타일은 욕쟁이 할매와 동일 → 클래스 재사용) */}
      <Link href="/dating" className="granny-banner">
        <span className="granny-banner-faces" aria-hidden>
          {DATING_FACES.map((f) => (
            <span key={f.uuid}><Avatar uuid={f.uuid} sex={f.sex} age={f.age} size={34} radius={10} /></span>
          ))}
        </span>
        <span className="granny-banner-text">
          <b>가상 연애 해보기</b>
          <span className="meta">성별과 나이대만 고르면 소개팅 자리로 안내해드려요</span>
        </span>
        {/* 화면당 coral 강조 1개 원칙: 두 번째 배너 화살표는 톤 다운 */}
        <span className="granny-banner-go" style={{ color: "var(--brown-soft)" }} aria-hidden>→</span>
      </Link>

      {/* 히어로: 첫 화면에서 바로 대화 진입 (화면당 coral CTA 1개) */}
      <div className="hero-cta">
        <div className="hero-cta-faces" aria-hidden>
          {MEET_FACES.map((f) => (
            <span key={f.uuid}><Avatar uuid={f.uuid} sex={f.sex} age={f.age} size={36} radius={11} /></span>
          ))}
          <span className="hero-q">?</span>
        </div>
        <button className="btn-cta btn-hero" onClick={meetRandom} disabled={randomLoading}>
          {randomLoading ? (
            "인연을 찾는 중..."
          ) : (
            <>
              <svg width="17" height="17" viewBox="0 0 16 16" shapeRendering="crispEdges" aria-hidden>
                <path d="M7 2h2v5H7zM7 9h2v5H7zM2 7h5v2H2zM9 7h5v2H9z" fill="#fff" />
              </svg>
              오늘의 인연 만나기
            </>
          )}
        </button>
        <p className="meta" style={{ textAlign: "center", margin: "10px 0 30px" }}>
          어떤 이웃을 만날지는 눌러봐야 알아요
        </p>
      </div>

      <TodayFriends />

      <h2 className="dot-title">오늘의 이웃</h2>
      <p className="meta" style={{ margin: "4px 0 14px" }}>매일 새로운 이웃을 소개해드려요</p>
      <div className="card-grid">
        {featured === null
          ? Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)
          : featured.slice(0, 5).map((p) => <PersonaCard key={p.uuid} p={p} />)}
      </div>

      <DotDivider />

      <h2 className="dot-title">요즘 이런 고민이 있다면</h2>
      <p className="meta" style={{ margin: "4px 0 14px" }}>골라주시면 어울리는 말동무를 찾아드려요</p>
      <div className="chip-wrap" style={{ marginBottom: 32 }}>
        {CONCERNS.map((c) => (
          <button key={c} className="chip" onClick={() => router.push(`/recommend?concern=${encodeURIComponent(c)}`)}>
            {c}
          </button>
        ))}
      </div>

      {popular.length > 0 && (
        <>
          <h2 className="dot-title">요즘 인기</h2>
          <p className="meta" style={{ margin: "2px 0 12px" }}>이번 주에 대화가 많았던 이웃들이에요</p>
          <div className="card-grid">
            {popular.slice(0, 3).map((p) => (
              <PersonaCard key={p.uuid} p={p} />
            ))}
          </div>
        </>
      )}
    </main>
  );
}
