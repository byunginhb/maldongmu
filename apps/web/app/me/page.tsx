"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiGet, clearToken, socialLoginUrl } from "../../lib/api";
import Avatar from "../../components/Avatar";
import DotDivider from "../../components/DotDivider";

interface ConvItem {
  id: string;
  personaUuid: string;
  title: string;
  lastMessageAt: string;
  name: string;
  age: number;
  sex: string;
  occupation: string;
  oneLiner: string;
}

interface Me {
  id: string;
  type: "guest" | "google" | "kakao";
  nickname: string | null;
  conversationCount: number;
  guestLimit: number;
  messageLimit: number;
  messagesUsed: number;
}

export default function MePage() {
  const [convs, setConvs] = useState<ConvItem[] | null>(null);
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    apiGet<ConvItem[]>("/conversations").then(setConvs).catch(() => setConvs([]));
    apiGet<Me>("/auth/me").then(setMe).catch(() => {});
  }, []);

  const logout = () => {
    clearToken();
    window.location.href = "/";
  };

  return (
    <main className="page">
      <h1 className="dot-title">내 대화</h1>
      <p className="meta" style={{ margin: "0 0 20px" }}>
        {me?.type === "guest"
          ? `둘러보는 중이에요 (대화 ${me.conversationCount}/${me.guestLimit}회)`
          : me
            ? `${me.nickname || "이웃"}님, 어서오세요 · 남은 대화 ${Math.max(0, me.messageLimit - me.messagesUsed)}번`
            : ""}
      </p>

      {me && me.type !== "guest" && me.messagesUsed >= me.messageLimit && (
        <div style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 16, padding: "16px 18px", marginBottom: 24 }}>
          <p style={{ margin: "0 0 12px", fontSize: 14, lineHeight: 1.7 }}>
            대화를 정말 많이 나누셨네요! 서비스가 어땠는지 들려주시면 더 나눌 수 있게 열어드릴게요.
          </p>
          <Link href="/feedback" className="btn-cta" style={{ display: "flex" }}>
            피드백 남기고 더 대화하기
          </Link>
        </div>
      )}

      {me?.type === "guest" && (
        <div style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 16, padding: "16px 18px", marginBottom: 24 }}>
          <p style={{ margin: "0 0 12px", fontSize: 14 }}>
            로그인하면 대화를 무제한으로 이어갈 수 있어요.
          </p>
          <button className="btn-social btn-kakao" style={{ marginTop: 0 }} onClick={() => (window.location.href = socialLoginUrl("kakao"))}>
            카카오로 계속하기
          </button>
          <button className="btn-social btn-google" onClick={() => (window.location.href = socialLoginUrl("google"))}>
            구글로 계속하기
          </button>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {convs === null && Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton" />)}
        {convs?.map((c) => (
          <Link key={c.id} href={`/chat/${c.id}`} className="card">
            <Avatar uuid={c.personaUuid} sex={c.sex} age={c.age} />
            <div style={{ minWidth: 0 }}>
              <p className="card-name">{c.name}</p>
              <p className="card-meta">{c.occupation}</p>
              <p className="card-oneliner">{c.oneLiner}</p>
            </div>
          </Link>
        ))}
      </div>

      {convs?.length === 0 && (
        <div className="empty">
          아직 나눈 대화가 없어요.
          <br />
          <Link href="/" style={{ color: "var(--coral)", fontWeight: 600 }}>
            오늘의 이웃을 만나러 가볼까요?
          </Link>
        </div>
      )}

      {me && me.type !== "guest" && (
        <>
          <DotDivider />
          <button className="btn-ghost" onClick={logout}>로그아웃</button>
        </>
      )}
    </main>
  );
}
