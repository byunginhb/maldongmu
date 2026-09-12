"use client";

import { useEffect, useRef, useState } from "react";

// 점수대별 상대의 마음 단계 (0~100)
const STAGES: [number, string][] = [[80, "마음이 기울었어요"], [60, "설레는 중"], [40, "편해지는 중"], [20, "조금 궁금해요"], [0, "아직은 서먹해요"]];
export const stageOf = (score: number) => STAGES.find(([min]) => score >= min)![1];

/**
 * 가상 연애 호감도 게이지. 점수가 바뀌면 막대가 부드럽게 채워지고 숫자가 세어 올라가며 변화량이 떠오른다.
 * ponytail: 이번 턴 변화 하나만 보여준다. 턴별 추이 그래프는 필요해지면 messages.affection으로 그리면 됨.
 */
export default function AffectionMeter({ score, change, note }: { score: number; change: number; note: string }) {
  const [shown, setShown] = useState(score);
  const from = useRef(score);
  const [pulse, setPulse] = useState(0);

  useEffect(() => {
    const start = from.current;
    if (start === score) return;
    from.current = score;
    setPulse((n) => n + 1);
    const t0 = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / 900);
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(Math.round(start + (score - start) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [score]);

  return (
    <div className="affection" role="status" aria-label={`호감도 ${score}점, ${stageOf(score)}`}>
      <div className="affection-head">
        <span className="meta">호감도 · {stageOf(score)}</span>
        <span className="affection-score">
          <b key={pulse} className={pulse ? "affection-bump" : ""}>{shown}</b>
          {pulse > 0 && change !== 0 && (
            <span key={`d${pulse}`} className={`affection-delta ${change > 0 ? "up" : "down"}`} aria-hidden>
              {change > 0 ? `+${change}` : change}
            </span>
          )}
        </span>
      </div>
      <div className="affection-track" aria-hidden>
        <div className="affection-fill" style={{ width: `${score}%` }} />
      </div>
      {note && <p key={note} className="affection-note">{note}</p>}
    </div>
  );
}
