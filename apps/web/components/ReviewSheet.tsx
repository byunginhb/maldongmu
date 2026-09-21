"use client";

import { track } from "../lib/api";

const PLAY_ID = "app.maldongmu.twa";

/** 스토어 평점 유도 — 긍정 순간(호감도 60·10번째 메시지)에 한 번만. 앱이면 Play 스토어 앱으로, 웹이면 스토어 페이지로 */
export function storeUrl(): string {
  const inApp = typeof navigator !== "undefined" && navigator.userAgent.includes("maldongmuApp");
  return inApp ? `market://details?id=${PLAY_ID}` : `https://play.google.com/store/apps/details?id=${PLAY_ID}`;
}

export default function ReviewSheet({ onClose }: { onClose: () => void }) {
  const go = () => {
    track("review_click");
    window.location.href = storeUrl();
    onClose();
  };
  return (
    <div className="sheet-back" onClick={() => { track("review_dismiss"); onClose(); }}>
      <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="말동무 평가">
        <h2 className="dot-title" style={{ marginBottom: 6 }}>말동무, 마음에 드셨나요?</h2>
        <p style={{ fontSize: 14, margin: "0 0 18px", lineHeight: 1.7 }}>
          별점 하나가 더 많은 분께 말동무를 소개해줘요. 30초면 충분해요.
        </p>
        <button className="btn-cta" onClick={go}>별점 남기러 가기</button>
        <button className="btn-ghost" style={{ width: "100%", marginTop: 10, border: "none" }} onClick={() => { track("review_dismiss"); onClose(); }}>
          다음에 할게요
        </button>
      </div>
    </div>
  );
}
