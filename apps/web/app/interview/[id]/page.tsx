"use client";

import { use, useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { getInterview, type InterviewSnapshot } from "../../../lib/api";
import Avatar from "../../../components/Avatar";

const STEPS = [
  { key: "reading", label: "웹사이트를 읽고 있어요" },
  { key: "finding", label: "어울리는 이웃을 찾고 있어요" },
  { key: "questioning", label: "질문지를 만들고 있어요" },
  { key: "interviewing", label: "이웃들을 인터뷰하고 있어요" },
  { key: "reporting", label: "리포트를 정리하고 있어요" },
];
const ORDER = ["reading", "finding", "questioning", "interviewing", "reporting", "done"];

/** 답변 속 괄호 (표정·몸짓) 을 이탤릭으로 구분 */
function renderInline(text: string, keyBase: string): ReactNode[] {
  return text.split(/(\([^)]*\))/g).map((p, i) =>
    p.startsWith("(") && p.endsWith(")") ? (
      <i key={`${keyBase}-${i}`} className="iv-nonverbal">{p}</i>
    ) : (
      <span key={`${keyBase}-${i}`}>{p}</span>
    ),
  );
}

/** 전사를 줄 단위로: 질문(Q.)·꼬리질문(↳)·답변을 구분해 렌더 */
function renderAnswer(text: string): ReactNode[] {
  const lines = text.split("\n");
  return lines.map((line, i) => {
    const t = line.trim();
    if (!t) return <div key={i} style={{ height: 6 }} />;
    if (t.startsWith("Q.")) return <p key={i} className="iv-q" style={{ margin: "10px 0 2px" }}>{t}</p>;
    if (t.startsWith("↳")) return <p key={i} className="iv-followup">{t}</p>;
    return <p key={i} style={{ margin: "0 0 4px" }}>{renderInline(line, String(i))}</p>;
  });
}

/** 아주 가벼운 마크다운 렌더 (## 제목, - 목록, **굵게**, 문단) */
function inlineBold(s: string, key: string): ReactNode[] {
  return s.split(/(\*\*[^*]+\*\*)/g).map((t, i) =>
    t.startsWith("**") && t.endsWith("**") ? <strong key={key + i}>{t.slice(2, -2)}</strong> : <span key={key + i}>{t}</span>,
  );
}
function renderReport(md: string): ReactNode[] {
  const lines = md.split("\n");
  const out: ReactNode[] = [];
  let list: ReactNode[] = [];
  const flush = () => {
    if (list.length) { out.push(<ul key={`ul${out.length}`}>{list}</ul>); list = []; }
  };
  lines.forEach((raw, i) => {
    const line = raw.trim();
    if (!line) { flush(); return; }
    const h = line.match(/^#{2,4}\s+(.*)$/);
    if (h) { flush(); out.push(<h3 key={i}>{h[1]}</h3>); return; }
    if (/^[-*]\s+/.test(line)) { list.push(<li key={i}>{inlineBold(line.replace(/^[-*]\s+/, ""), `l${i}`)}</li>); return; }
    flush();
    const disc = line.includes("가상 페르소나") || line.includes("대체하지 않");
    out.push(<p key={i} className={disc ? "iv-disclaimer" : undefined}>{inlineBold(line, `p${i}`)}</p>);
  });
  flush();
  return out;
}

export default function InterviewSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [snap, setSnap] = useState<InterviewSnapshot | null>(null);
  const [notFound, setNotFound] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let alive = true;
    const poll = async () => {
      try {
        const s = await getInterview(id);
        if (!alive) return;
        setSnap(s);
        if (s.status === "active") timer.current = setTimeout(poll, 2500);
      } catch {
        if (alive) setNotFound(true);
      }
    };
    poll();
    return () => {
      alive = false;
      if (timer.current) clearTimeout(timer.current);
    };
  }, [id]);

  if (notFound) {
    return (
      <main className="page">
        <p className="empty">인터뷰를 찾을 수 없어요.</p>
        <button className="btn-ghost" onClick={() => router.push("/interview")}>이웃 인터뷰로</button>
      </main>
    );
  }
  if (!snap) return <main className="page"><div className="skeleton" style={{ height: 120 }} /></main>;

  const stepIdx = ORDER.indexOf(snap.phase);
  const showSteps = ["reading", "finding", "questioning"].includes(snap.phase);
  const pct = snap.total ? Math.round((snap.interviewed / snap.total) * 100) : 0;
  const pickByUuid = new Map(snap.picks.map((p) => [p.uuid, p]));

  return (
    <main className="page" aria-live="polite">
      <button
        onClick={() => router.push("/interview")}
        style={{ background: "none", border: "none", fontSize: 18, color: "var(--brown)", padding: "0 0 8px" }}
        aria-label="뒤로"
      >
        ←
      </button>

      <h1 className="dot-title">{snap.topic || "이웃 인터뷰"}</h1>
      <p className="meta" style={{ margin: "4px 0 16px" }}>이웃 {snap.total}명에게 물어보고 있어요</p>

      {(snap.status === "aborted" || snap.status === "failed") && (
        <div className="iv-block" style={{ borderColor: "var(--line)" }}>
          <p style={{ margin: 0 }}>{snap.error || "문제가 생겼어요."}</p>
          <button className="btn-ghost" style={{ marginTop: 12 }} onClick={() => router.push("/interview")}>
            {snap.status === "aborted" ? "다시 시작하기" : "이웃 인터뷰로"}
          </button>
        </div>
      )}

      {/* 진행 단계 타임라인 — 대기 구간이 지루하지 않게 계속 표기 */}
      {snap.status === "active" && (
        <ul className="iv-steps">
          {STEPS.filter((s) => s.key !== "reading" || snap.inputKind === "url").map((s) => {
            const idx = ORDER.indexOf(s.key);
            const state = idx < stepIdx ? "done" : idx === stepIdx ? "on" : "";
            return (
              <li key={s.key} className={`iv-step ${state}`}>
                <span className="iv-step-dot">{state === "done" ? "✓" : ""}</span>
                {s.key === "interviewing" && state === "on" ? `이웃들을 인터뷰하고 있어요 (${snap.interviewed}/${snap.total})` : s.label}
              </li>
            );
          })}
        </ul>
      )}

      {/* 선정된 이웃 3명 + 근거 */}
      {snap.picks.length > 0 && !showSteps && (
        <>
          <h2 className="dot-title" style={{ marginTop: 20 }}>이런 이웃들이에요</h2>
          <div style={{ margin: "10px 0 4px" }}>
            {snap.picks.map((p) => (
              <div key={p.uuid}>
                <div className="card" style={{ marginBottom: 0 }}>
                  <Avatar uuid={p.uuid} sex={p.sex} age={p.age} />
                  <div style={{ minWidth: 0 }}>
                    <p className="card-name">{p.name} <span style={{ fontWeight: 400 }}>· {p.age}세</span></p>
                    <p className="card-meta">{p.occupation} · {p.province} {p.district}</p>
                  </div>
                </div>
                <p className="iv-pick-reason">{p.reason}</p>
              </div>
            ))}
          </div>
        </>
      )}

      {/* 인터뷰 진행 바 */}
      {(snap.phase === "interviewing" || snap.phase === "reporting") && (
        <div className="iv-bar" aria-label={`인터뷰 ${snap.interviewed}/${snap.total}`}>
          <i style={{ width: `${pct}%` }} />
        </div>
      )}

      {/* 리포트 (완료 시 상단) */}
      {snap.report && (
        <section className="iv-report" style={{ marginTop: 8 }}>
          <h2 className="dot-title" style={{ marginBottom: 4 }}>설문 리포트</h2>
          {renderReport(snap.report)}
        </section>
      )}

      {/* 인터뷰 전문 */}
      {snap.transcripts.length > 0 && (
        <>
          <h2 className="dot-title" style={{ marginTop: 24 }}>인터뷰 전문</h2>
          <div style={{ marginTop: 10 }}>
            {snap.transcripts.map((t) => {
              const active = snap.phase === "interviewing" && t.status !== "done"
                && snap.transcripts.filter((x) => x.status !== "done")[0]?.personaUuid === t.personaUuid;
              return (
                <div key={t.personaUuid} className={`iv-block ${t.status === "pending" && !active ? "pending" : ""}`}>
                  <div className="iv-block-head">
                    <span className="bubble-avatar">
                      <Avatar uuid={t.personaUuid} sex={pickByUuid.get(t.personaUuid)?.sex || "남자"} age={pickByUuid.get(t.personaUuid)?.age || 30} size={32} radius={8} />
                    </span>
                    <span className="who">{t.name} · {t.occupation}</span>
                    <span className={`tag ${t.status === "done" ? "done" : ""}`}>
                      {t.status === "done" ? "완료 ✓" : active ? "인터뷰 중…" : "차례를 기다리는 중"}
                    </span>
                  </div>
                  {t.content && <div className="iv-answer">{renderAnswer(t.content)}</div>}
                </div>
              );
            })}
          </div>
        </>
      )}
    </main>
  );
}
