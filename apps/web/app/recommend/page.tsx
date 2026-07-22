"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { recommendPersonas, RecommendLimitError, type RecommendedPersona } from "../../lib/api";
import PersonaCard from "../../components/PersonaCard";
import Avatar from "../../components/Avatar";

// 홈과 동일한 고민 칩 (concern 없이 진입했을 때 다시 보여줌)
const CONCERNS = ["일·직장", "연애·썸", "가족", "친구·관계", "돈·미래", "건강·체력", "공부·진로", "외로움·수다"];

// 추천을 기다리는 동안 순환하는 문구
const FINDING_MESSAGES = [
  "어울리는 이웃을 찾고 있어요...",
  "고민을 함께해줄 분을 기다리고 있어요...",
  "동네를 한 바퀴 둘러보는 중이에요...",
  "골목골목 발품 팔며 다니는 중이에요...",
  "이야기가 잘 통할 분을 고르고 있어요...",
];

/** 로딩 연출: 픽셀 아바타 3개가 번갈아 다른 얼굴로 바뀌며 "찾는 중"을 표현 */
function FindingLoader() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((v) => v + 1), 450);
    return () => clearInterval(t);
  }, []);
  const msg = FINDING_MESSAGES[Math.floor(tick / 5) % FINDING_MESSAGES.length];
  return (
    <div className="finding">
      <div className="finding-faces">
        {[0, 1, 2].map((i) => {
          // 슬롯마다 3틱 주기로 어긋나게 얼굴 교체 (한 번에 하나씩만 바뀜)
          const seed = Math.floor((tick + i) / 3);
          const uuid = `finding-${i}-${seed}`;
          return (
            <span key={uuid} className="finding-face">
              <Avatar uuid={uuid} sex={(seed + i) % 2 ? "여자" : "남자"} age={20 + ((seed * 7 + i * 13) % 55)} size={48} radius={12} />
            </span>
          );
        })}
      </div>
      <p key={msg} className="finding-msg">{msg}</p>
    </div>
  );
}

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
      <p className="meta" style={{ margin: "4px 0 20px" }}>어울리는 말동무를 찾아드릴게요</p>

      {loading && <FindingLoader />}

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
