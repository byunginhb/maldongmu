"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { recommendPersonas, RecommendLimitError, type RecommendedPersona } from "../../lib/api";
import PersonaCard from "../../components/PersonaCard";

// 홈과 동일한 고민 칩 (concern 없이 진입했을 때 다시 보여줌)
const CONCERNS = ["일·직장", "연애·썸", "가족", "친구·관계", "돈·미래", "건강·체력", "공부·진로", "외로움·수다"];

function ConcernPicker({ onPick }: { onPick: (c: string) => void }) {
  return (
    <main className="page">
      <h1 className="dot-title">요즘 이런 고민이 있다면</h1>
      <p className="meta" style={{ margin: "4px 0 14px" }}>골라주시면 어울리는 말동무를 찾아드려요</p>
      <div className="chip-wrap">
        {CONCERNS.map((c) => (
          <button key={c} className="chip" onClick={() => onPick(c)}>
            {c}
          </button>
        ))}
      </div>
    </main>
  );
}

function RecommendContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const concern = searchParams.get("concern") || "";
  const [detail, setDetail] = useState("");
  const [items, setItems] = useState<RecommendedPersona[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [limited, setLimited] = useState(false);
  const [error, setError] = useState(false);

  const fetchRecommend = useCallback(async (c: string, d?: string) => {
    setLoading(true);
    setLimited(false);
    setError(false);
    try {
      const res = await recommendPersonas(c, d);
      setItems(res.items);
    } catch (e) {
      if (e instanceof RecommendLimitError) setLimited(true);
      else setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (concern) fetchRecommend(concern);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [concern]);

  if (!concern) {
    return <ConcernPicker onPick={(c) => router.push(`/recommend?concern=${encodeURIComponent(c)}`)} />;
  }

  return (
    <main className="page">
      <h1 className="dot-title">{concern}</h1>
      <p className="meta" style={{ margin: "4px 0 20px" }}>
        {loading ? "어울리는 이웃을 찾고 있어요..." : "어울리는 말동무를 찾아드릴게요"}
      </p>

      {loading && (
        <div className="card-grid">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton" />)}
        </div>
      )}

      {!loading && limited && (
        <p className="empty">오늘은 추천을 많이 받으셨어요. 내일 다시 만나요!</p>
      )}

      {!loading && error && (
        <p className="empty">잠시 문제가 생겼어요. 곧 다시 시도해주세요.</p>
      )}

      {!loading && !limited && !error && items && items.length === 0 && (
        <p className="empty">어울리는 분을 찾지 못했어요. 잠시 후 다시 시도해주세요.</p>
      )}

      {!loading && !limited && !error && items && items.length > 0 && (
        <>
          <div className="card-grid">
            {items.map((p) => (
              <div key={p.uuid}>
                <PersonaCard p={p} />
                <p className="meta" style={{ margin: "6px 4px 0" }}>{p.reason}</p>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 28 }}>
            <p className="meta" style={{ margin: "0 0 8px" }}>조금 더 들려주시면 다시 찾아드려요 (선택)</p>
            <div className="search-box" style={{ marginBottom: 10 }}>
              <input
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
                placeholder="예: 요즘 이직을 고민 중이에요"
                aria-label="추가로 들려주고 싶은 이야기 (선택)"
              />
            </div>
            <button className="btn-ghost" onClick={() => fetchRecommend(concern, detail.trim() || undefined)}>
              다시 추천받기
            </button>
          </div>
        </>
      )}
    </main>
  );
}

export default function RecommendPage() {
  return (
    <Suspense fallback={<main className="page"><div className="skeleton" style={{ height: 200 }} /></main>}>
      <RecommendContent />
    </Suspense>
  );
}
