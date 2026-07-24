"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PersonaCard as Card } from "@maldongmu/shared";
import { apiGet } from "../../lib/api";
import PersonaCard from "../../components/PersonaCard";
import { SkeletonCard } from "../../components/ui";

// DB의 province 실제 값 기준
const PROVINCES = [
  "서울", "경기", "인천", "부산", "대구", "대전", "광주", "울산", "세종",
  "강원", "충청북", "충청남", "전북", "전라남", "경상북", "경상남", "제주",
];
const AGES: { label: string; min?: number; max?: number }[] = [
  { label: "전체" },
  { label: "20대", min: 20, max: 29 },
  { label: "30대", min: 30, max: 39 },
  { label: "40대", min: 40, max: 49 },
  { label: "50대", min: 50, max: 59 },
  { label: "60대+", min: 60 },
];

export default function SearchPage() {
  const [q, setQ] = useState("");
  const [province, setProvince] = useState("");
  const [sex, setSex] = useState("");
  const [ageIdx, setAgeIdx] = useState(0);
  const [items, setItems] = useState<Card[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [end, setEnd] = useState(false);
  const [searched, setSearched] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const buildQuery = useCallback(
    (p: number) => {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (province) params.set("province", province);
      if (sex) params.set("sex", sex);
      const age = AGES[ageIdx];
      if (age.min) params.set("ageMin", String(age.min));
      if (age.max) params.set("ageMax", String(age.max));
      params.set("page", String(p));
      params.set("limit", "20");
      return params.toString();
    },
    [q, province, sex, ageIdx],
  );

  const load = useCallback(
    async (p: number, replace: boolean) => {
      setLoading(true);
      try {
        const res = await apiGet<{ items: Card[] }>(`/personas/search?${buildQuery(p)}`);
        setItems((prev) => (replace ? res.items : [...prev, ...res.items]));
        setPage(p);
        setEnd(res.items.length < 20);
        setSearched(true);
      } finally {
        setLoading(false);
      }
    },
    [buildQuery],
  );

  // 검색어/필터 변경 시 디바운스 재검색
  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => load(1, true), 350);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, province, sex, ageIdx]);

  // 무한 스크롤
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const ob = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !loading && !end && searched) load(page + 1, false);
    });
    ob.observe(el);
    return () => ob.disconnect();
  }, [load, loading, end, page, searched]);

  return (
    <main className="page">
      <h1 className="dot-title">이웃 찾기</h1>
      <p className="meta" style={{ margin: "0 0 16px" }}>어떤 이웃을 찾으세요?</p>

      <div className="search-box" style={{ marginBottom: 12 }}>
        <svg width="16" height="16" viewBox="0 0 16 16" shapeRendering="crispEdges" aria-hidden>
          <path
            d="M5 1h4v1H5zM4 2h6v1H4zM3 3h3v1H3zM8 3h3v1H8zM3 4h2v3H3zM9 4h2v3H9zM3 7h3v1H3zM8 7h3v1H8zM4 8h6v1H4zM5 9h4v1H5zM9 9h2v2H9zM11 11h2v2h-2zM13 13h2v2h-2z"
            fill="var(--brown-soft)"
          />
        </svg>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="직업, 취미, 지역, 이름..."
          aria-label="검색"
        />
      </div>

      <div className="chip-row" style={{ marginBottom: 8 }}>
        <button className={`chip ${province === "" ? "on" : ""}`} onClick={() => setProvince("")}>지역 전체</button>
        {PROVINCES.map((p) => (
          <button key={p} className={`chip ${province === p ? "on" : ""}`} onClick={() => setProvince(province === p ? "" : p)}>
            {p}
          </button>
        ))}
      </div>
      <div className="chip-row" style={{ marginBottom: 8 }}>
        {AGES.map((a, i) => (
          <button key={a.label} className={`chip ${ageIdx === i ? "on" : ""}`} onClick={() => setAgeIdx(i)}>
            {a.label}
          </button>
        ))}
      </div>
      <div className="chip-row" style={{ marginBottom: 20 }}>
        {["", "남자", "여자"].map((s) => (
          <button key={s || "all"} className={`chip ${sex === s ? "on" : ""}`} onClick={() => setSex(s)}>
            {s === "" ? "성별 전체" : s}
          </button>
        ))}
      </div>

      <div className="card-grid">
        {items.map((p) => (
          <PersonaCard key={p.uuid} p={p} />
        ))}
        {loading && Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={`s${i}`} />)}
      </div>

      {searched && !loading && items.length === 0 && (
        <p className="empty">조건에 맞는 이웃을 찾지 못했어요. 검색어를 바꿔볼까요?</p>
      )}

      <div ref={sentinel} style={{ height: 1 }} />
    </main>
  );
}
