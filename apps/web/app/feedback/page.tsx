"use client";

import { useState } from "react";
import Link from "next/link";
import { apiPost } from "../../lib/api";

export default function FeedbackPage() {
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async () => {
    if (!content.trim() || sending) return;
    setSending(true);
    try {
      await apiPost("/feedback", { content: content.trim() });
      setDone(true);
    } catch {
      setSending(false);
      alert("전송에 실패했어요. 잠시 후 다시 시도해주세요.");
    }
  };

  if (done) {
    return (
      <main className="page" style={{ textAlign: "center", paddingTop: 64 }}>
        <h1 className="dot-title" style={{ color: "var(--coral)" }}>고마워요!</h1>
        <p style={{ fontSize: 15, lineHeight: 1.8, margin: "12px 0 28px" }}>
          소중한 이야기 잘 받았어요.
          <br />
          확인하는 대로 대화를 더 나눌 수 있게 열어드릴게요.
          <br />
          보통 하루 안에 처리돼요. 조금만 기다려주세요!
        </p>
        <Link href="/" className="btn-ghost">홈으로 돌아가기</Link>
      </main>
    );
  }

  return (
    <main className="page">
      <h1 className="dot-title">말동무 서비스 어땠어요?</h1>
      <p className="meta" style={{ margin: "4px 0 20px", lineHeight: 1.7 }}>
        어떤 이웃과 어떤 이야기를 나눴는지, 좋았던 점이나 아쉬웠던 점을 들려주세요.
        <br />
        피드백을 남겨주시면 감사의 마음으로 대화 한도를 넉넉히 늘려드려요.
      </p>

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="예) 부산 사는 60대 이모님이랑 김장 얘기하다가 진짜 눈물날 뻔했어요. 근데 검색이 조금 아쉬워요..."
        maxLength={2000}
        rows={8}
        style={{
          width: "100%",
          background: "var(--paper)",
          border: "1px solid var(--line)",
          borderRadius: 16,
          padding: "14px 16px",
          fontSize: 15,
          lineHeight: 1.7,
          color: "var(--brown)",
          fontFamily: "var(--font-body)",
          outline: "none",
          resize: "vertical",
          marginBottom: 16,
        }}
      />

      <button className="btn-cta" onClick={submit} disabled={!content.trim() || sending}>
        {sending ? "보내는 중..." : "피드백 보내기"}
      </button>
    </main>
  );
}
