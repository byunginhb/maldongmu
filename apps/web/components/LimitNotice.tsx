"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiGet, getToken, track } from "../lib/api";

/** 어드민이 대화 한도를 늘렸을 때, 사용자가 다음에 열면 한 번 안내 (users.limit_changed_at 기준) */
export default function LimitNotice() {
  const router = useRouter();
  const [notice, setNotice] = useState<{ limit: number; at: string } | null>(null);
  useEffect(() => {
    if (!getToken()) return; // 토큰 없는 첫 방문은 게스트 발급을 유발하지 않도록 조회 안 함
    apiGet<{ messageLimit: number; limitChangedAt: string | null }>("/auth/me").then((me) => {
      if (!me.limitChangedAt) return;
      try {
        if (localStorage.getItem("mdm_limit_seen") === me.limitChangedAt) return;
        localStorage.setItem("mdm_limit_seen", me.limitChangedAt);
      } catch { return; }
      track("limit_notice", { limit: me.messageLimit });
      setNotice({ limit: me.messageLimit, at: me.limitChangedAt });
    }).catch(() => {});
  }, []);
  if (!notice) return null;
  return (
    <div className="sheet-back" onClick={() => setNotice(null)}>
      <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="대화 한도 안내">
        <h2 className="dot-title" style={{ marginBottom: 6 }}>대화 한도가 늘었어요</h2>
        <p style={{ fontSize: 14, margin: "0 0 18px", lineHeight: 1.7 }}>
          피드백 고마워요! 이제 메시지를 <b>{notice.limit.toLocaleString()}개</b>까지 나눌 수 있어요.
          기다리던 이웃들이 있을 거예요.
        </p>
        <button className="btn-cta" onClick={() => { setNotice(null); router.push("/me"); }}>이어서 이야기하기</button>
        <button className="btn-ghost" style={{ width: "100%", marginTop: 10, border: "none" }} onClick={() => setNotice(null)}>닫기</button>
      </div>
    </div>
  );
}
