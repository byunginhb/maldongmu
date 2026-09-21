"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiPost, LoginRequiredError } from "../../../lib/api";
import LoginSheet from "../../../components/LoginSheet";

/** 페르소나 페이지의 상호작용 부분 — 뒤로가기·대화 시작·로그인 시트. 본문은 서버에서 렌더(SEO) */
export function BackButton() {
  const router = useRouter();
  return (
    <button className="btn-ghost" style={{ height: 36, padding: "0 14px", marginBottom: 20 }} onClick={() => router.back()}>
      ← 뒤로
    </button>
  );
}

export function StartChat({ uuid, name }: { uuid: string; name: string }) {
  const router = useRouter();
  const [starting, setStarting] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const startChat = async () => {
    setStarting(true);
    try {
      const res = await apiPost<{ id: string }>("/conversations", { personaUuid: uuid });
      router.push(`/chat/${res.id}`);
    } catch (e) {
      if (e instanceof LoginRequiredError) setShowLogin(true);
      setStarting(false);
    }
  };
  return (
    <>
      <div className="cta-float">
        <div>
          <button className="btn-cta" onClick={startChat} disabled={starting}>
            {starting ? "연결하는 중..." : `${name}님과 대화 시작하기`}
          </button>
        </div>
      </div>
      {showLogin && <LoginSheet onClose={() => setShowLogin(false)} />}
    </>
  );
}
