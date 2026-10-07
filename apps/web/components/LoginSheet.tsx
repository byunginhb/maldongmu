"use client";

import Link from "next/link";
import { socialLoginUrl } from "../lib/api";
import { useT } from "./LangProvider";

export default function LoginSheet({ onClose }: { onClose: () => void }) {
  const { t } = useT();
  return (
    <div className="sheet-back" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <h2 className="dot-title" style={{ marginBottom: 6 }}>
          {t("가입하고 계속 이야기 나눠요")}
        </h2>
        <p className="meta" style={{ margin: "0 0 18px" }}>
          {t("가입하면 지금까지 나눈 대화와 가상 연애의 호감도가 그대로 저장되고, 이웃 수첩에서 언제든 이어서 만날 수 있어요. 아직은 모두 무료예요.")}
        </p>
        <button className="btn-social btn-kakao" onClick={() => (window.location.href = socialLoginUrl("kakao"))}>
          {t("카카오로 계속하기")}
        </button>
        <button className="btn-social btn-google" onClick={() => (window.location.href = socialLoginUrl("google"))}>
          {t("구글로 계속하기")}
        </button>
        <p className="meta" style={{ fontSize: 12, margin: "12px 0 0", textAlign: "center" }}>
          {t("로그인하면 {terms}과 {privacy}에 동의하게 돼요.", { terms: "\u0000", privacy: "\u0001" }).split(/(\u0000|\u0001)/).map((part, i) =>
            part === "\u0000" ? <Link key={i} href="/terms" style={{ textDecoration: "underline" }}>{t("이용약관")}</Link>
            : part === "\u0001" ? <Link key={i} href="/privacy" style={{ textDecoration: "underline" }}>{t("개인정보처리방침")}</Link> : part)}
        </p>
        <button
          className="btn-ghost"
          style={{ width: "100%", marginTop: 8, border: "none" }}
          onClick={onClose}
        >
          {t("다음에 할게요")}
        </button>
      </div>
    </div>
  );
}
