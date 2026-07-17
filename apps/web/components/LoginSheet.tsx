"use client";

import Link from "next/link";
import { socialLoginUrl } from "../lib/api";

export default function LoginSheet({ onClose }: { onClose: () => void }) {
  return (
    <div className="sheet-back" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <h2 className="dot-title" style={{ marginBottom: 6 }}>
          더 많은 이웃과 얘기해볼까요?
        </h2>
        <p className="meta" style={{ margin: "0 0 18px" }}>
          로그인하면 대화를 계속 이어갈 수 있어요. 지금까지의 대화도 그대로 옮겨드릴게요.
        </p>
        <button className="btn-social btn-kakao" onClick={() => (window.location.href = socialLoginUrl("kakao"))}>
          카카오로 계속하기
        </button>
        <button className="btn-social btn-google" onClick={() => (window.location.href = socialLoginUrl("google"))}>
          구글로 계속하기
        </button>
        <p className="meta" style={{ fontSize: 12, margin: "12px 0 0", textAlign: "center" }}>
          로그인하면 <Link href="/terms" style={{ textDecoration: "underline" }}>이용약관</Link>과{" "}
          <Link href="/privacy" style={{ textDecoration: "underline" }}>개인정보처리방침</Link>에 동의하게 돼요.
        </p>
        <button
          className="btn-ghost"
          style={{ width: "100%", marginTop: 8, border: "none" }}
          onClick={onClose}
        >
          다음에 할게요
        </button>
      </div>
    </div>
  );
}
