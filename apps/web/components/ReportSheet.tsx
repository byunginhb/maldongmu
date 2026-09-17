"use client";

import { useState } from "react";
import { reportMessage } from "../lib/api";

const REASONS = ["성적인 내용", "폭력·혐오 표현", "개인정보·사칭", "기타"];

/** AI 답변 신고 시트 — 앱을 나가지 않고 불쾌한 AI 콘텐츠를 바로 알릴 수 있게 (Play AI 생성 콘텐츠 정책) */
export default function ReportSheet({ conversationId, messageId, excerpt, onClose }:
  { conversationId: string; messageId: string; excerpt: string; onClose: () => void }) {
  const [reason, setReason] = useState("");
  const [detail, setDetail] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (!reason || busy) return;
    setBusy(true);
    setError("");
    try {
      await reportMessage(conversationId, messageId, reason, detail.trim() || undefined);
      setDone(true);
    } catch {
      setError("신고를 보내지 못했어요. 잠시 후 다시 시도해주세요.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="sheet-back" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="AI 답변 신고">
        {done ? (
          <>
            <h2 className="dot-title" style={{ marginBottom: 6 }}>신고가 접수됐어요</h2>
            <p style={{ fontSize: 14, margin: "0 0 18px", lineHeight: 1.7 }}>알려주셔서 고마워요. 확인 후 필요한 조치를 할게요.</p>
            <button className="btn-cta" onClick={onClose}>닫기</button>
          </>
        ) : (
          <>
            <h2 className="dot-title" style={{ marginBottom: 6 }}>이 답변을 신고할까요?</h2>
            <p className="meta" style={{ margin: "0 0 12px" }}>불쾌하거나 부적절한 AI 답변을 알려주시면 확인 후 조치할게요.</p>
            <p className="card-oneliner" style={{ background: "var(--sand)", borderRadius: 12, padding: "10px 12px", fontSize: 13, margin: "0 0 14px" }}>{excerpt}</p>
            <div className="chip-wrap" style={{ marginBottom: 12 }}>
              {REASONS.map((r) => (
                <button key={r} className={`chip${reason === r ? " on" : ""}`} onClick={() => setReason(r)} aria-pressed={reason === r}>{r}</button>
              ))}
            </div>
            <div className="search-box" style={{ marginBottom: 14 }}>
              <input value={detail} onChange={(e) => setDetail(e.target.value)} maxLength={500} placeholder="자세한 내용 (선택)" aria-label="신고 상세 (선택)" />
            </div>
            {error && <p className="chat-error" style={{ padding: "0 0 8px" }} role="alert">{error}</p>}
            <button className="btn-cta" onClick={submit} disabled={!reason || busy}>{busy ? "보내는 중..." : "신고하기"}</button>
            <button className="btn-ghost" style={{ width: "100%", marginTop: 10, border: "none" }} onClick={onClose}>취소</button>
          </>
        )}
      </div>
    </div>
  );
}
