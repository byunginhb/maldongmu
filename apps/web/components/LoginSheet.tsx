"use client";

import Link from "next/link";
import { socialLoginUrl } from "../lib/api";

export default function LoginSheet({ onClose }: { onClose: () => void }) {
  return (
    <div className="sheet-back" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <h2 className="dot-title" style={{ marginBottom: 6 }}>
          가입하고 계속 이야기 나눠요
        </h2>
        <p className="meta" style={{ margin: "0 0 18px" }}>
          가입하면 지금까지 나눈 대화가 그대로 저장돼요. 아직은 모두 무료니까,
          가입하고 이웃들과 마음껏 이야기를 이어가세요.
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
