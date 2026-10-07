"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiGet, clearToken, socialLoginUrl } from "../../lib/api";
import Avatar from "../../components/Avatar";
import DotDivider from "../../components/DotDivider";
import { Skeleton } from "../../components/ui";
import { RARE } from "../../lib/rare";
import { useT } from "../../components/LangProvider";

interface ConvItem {
  id: string;
  personaUuid: string;
  title: string;
  createdAt: string;
  lastMessageAt: string;
  userMsgs: number;
  name: string;
  age: number;
  sex: string;
  occupation: string;
  oneLiner: string;
  mode?: "dating" | null;
  secondPersonaUuid?: string | null;
  secondName?: string;
  secondSex?: string;
  secondAge?: number;
}

interface Me {
  id: string;
  type: "guest" | "google" | "kakao";
  nickname: string | null;
  conversationCount: number;
  guestMessageLimit: number;
  messageLimit: number;
  messagesUsed: number;
}


const todayUTC = () => new Date().toISOString().slice(0, 10);

export default function MePage() {
  const { t, lang } = useT();
  const [convs, setConvs] = useState<ConvItem[] | null>(null);
  const [error, setError] = useState(false);
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    apiGet<ConvItem[]>("/conversations").then(setConvs).catch(() => setError(true));
    apiGet<Me>("/auth/me").then(setMe).catch(() => {});
  }, []);

  const logout = () => {
    clearToken();
    window.location.href = "/";
  };

  // 실제로 대화한(내가 말 건넨) 이웃만, 인물 단위로 묶어 최근 대화방으로 연결
  const groups = (convs ?? []).filter((c) => c.secondPersonaUuid);
  // 가상 연애: 실제로 말을 건넨 방만, 인물당 최근 방 하나 (후보 3명을 눌러보기만 한 빈 방은 숨김)
  const seenDate = new Set<string>();
  const dates = (convs ?? []).filter((c) => c.mode === "dating" && !c.secondPersonaUuid && c.userMsgs > 0
    && !seenDate.has(c.personaUuid) && !!seenDate.add(c.personaUuid));
  const solo = (convs ?? []).filter((c) => !c.secondPersonaUuid && c.mode !== "dating");
  const talked = new Set(solo.filter((c) => c.userMsgs > 0).map((c) => c.personaUuid));
  const seen = new Set<string>();
  const neighbors = solo.filter((c) => {
    if (!talked.has(c.personaUuid) || seen.has(c.personaUuid)) return false;
    seen.add(c.personaUuid);
    return true; // 목록은 lastMessageAt DESC → 인물별 최근 대화방
  });
  // 오늘 새로 만난 이웃 수 (인물별 가장 이른 대화 생성일이 오늘)
  const firstMet: Record<string, string> = {};
  for (const c of solo) {
    if (!talked.has(c.personaUuid)) continue;
    if (!firstMet[c.personaUuid] || c.createdAt < firstMet[c.personaUuid]) firstMet[c.personaUuid] = c.createdAt;
  }
  const newToday = Object.values(firstMet).filter((d) => d?.slice(0, 10) === todayUTC()).length;

  return (
    <main className="page">
      <h1 className="dot-title">{t("이웃 수첩")}</h1>
      <p className="meta" style={{ margin: "6px 0 20px" }}>
        {me?.type === "guest"
          ? t("둘러보는 중이에요 (메시지 {used}/{limit}개, 로그인하면 계속)", { used: me.messagesUsed, limit: me.guestMessageLimit })
          : convs === null
            ? " "
            : neighbors.length > 0
              ? (me?.nickname ? t("{nick}님, 지금까지 {n}명의 이웃을 만났어요", { nick: me.nickname, n: neighbors.length }) : t("지금까지 {n}명의 이웃을 만났어요", { n: neighbors.length }))
              : groups.length || dates.length ? t("나눈 이야기를 이어가볼까요?") : t("아직 만난 이웃이 없어요")}
      </p>

      {newToday > 0 && (
        <p className="meta" style={{ margin: "-10px 0 18px", color: "var(--coral)", fontWeight: 600 }}>
          {t("오늘 {n}명의 이웃을 새로 만났어요", { n: newToday })}
        </p>
      )}

      {me && me.type !== "guest" && me.messagesUsed >= me.messageLimit && (
        <div style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 16, padding: "16px 18px", marginBottom: 24 }}>
          <p style={{ margin: "0 0 12px", fontSize: 14, lineHeight: 1.7 }}>
            {t("대화를 정말 많이 나누셨네요! 서비스가 어땠는지 들려주시면 더 나눌 수 있게 열어드릴게요.")}
          </p>
          <Link href="/feedback" className="btn-cta" style={{ display: "flex" }}>
            {t("피드백 남기고 더 대화하기")}
          </Link>
        </div>
      )}

      {me?.type === "guest" && (
        <div style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 16, padding: "16px 18px", marginBottom: 24 }}>
          <p style={{ margin: "0 0 12px", fontSize: 14 }}>{t("로그인하면 만난 이웃과 대화를 무제한으로 이어갈 수 있어요.")}</p>
          <button className="btn-social btn-kakao" style={{ marginTop: 0 }} onClick={() => (window.location.href = socialLoginUrl("kakao"))}>
            {t("카카오로 계속하기")}
          </button>
          <button className="btn-social btn-google" onClick={() => (window.location.href = socialLoginUrl("google"))}>
            {t("구글로 계속하기")}
          </button>
        </div>
      )}

      {/* 로딩 */}
      {convs === null && !error && (
        <div className="notebook-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <Skeleton w={64} h={64} radius={14} />
              <Skeleton w="70%" h={12} />
            </div>
          ))}
        </div>
      )}

      {/* 에러 (빈 상태와 구분) */}
      {error && (
        <div className="empty">
          {t("이웃 수첩을 잠시 불러오지 못했어요.")}
          <br />
          <button className="btn-ghost" style={{ marginTop: 12 }} onClick={() => window.location.reload()}>{t("다시 시도")}</button>
        </div>
      )}

      {groups.length > 0 && <section className="notebook-groups">
        <h2 className="dot-title">{t("셋이서 수다")}</h2>
        <p className="meta">{t("함께 놀던 친구들이 기다리고 있어요.")}</p>
        {groups.map((c) => <Link key={c.id} href={`/chat/${c.id}`} className="group-conversation-card">
          <span className="chat-faces">
            <Avatar uuid={c.personaUuid} sex={c.sex} age={c.age} size={40} />
            <Avatar uuid={c.secondPersonaUuid!} sex={c.secondSex} age={c.secondAge} size={40} />
          </span>
          <span><b>{c.name} · {c.secondName}</b><span className="meta">{t("나까지 셋이서 · 이어서 이야기하기")}</span></span>
          <span aria-hidden>→</span>
        </Link>)}
      </section>}

      {dates.length > 0 && <section className="notebook-groups">
        <h2 className="dot-title">{t("가상 연애")}</h2>
        <p className="meta">{t("설레는 이야기를 이어가볼까요?")}</p>
        {dates.map((c) => <Link key={c.id} href={`/chat/${c.id}`} className="group-conversation-card">
          <Avatar uuid={c.personaUuid} sex={c.sex} age={c.age} size={40} />
          <span><b>{c.name}</b><span className="meta">{t("{age}세 · {job} · 이어서 만나기", { age: c.age, job: c.occupation })}</span></span>
          <span aria-hidden>→</span>
        </Link>)}
      </section>}

      {/* 만난 이웃 그리드 */}
      {neighbors.length > 0 && (
        <div className="notebook-grid">
          {neighbors.map((c) => (
            <Link key={c.personaUuid} href={`/chat/${c.id}`} className="notebook-cell" aria-label={t("{name}님과 이어서 이야기하기", { name: c.name })}>
              <Avatar uuid={c.personaUuid} sex={c.sex} age={c.age} size={64} radius={14} />
              <p className="notebook-name">{c.name}</p>
              <p className="notebook-job">{c.occupation}</p>
              {RARE.has(c.occupation) && <span className="notebook-rare">{t("귀한 이웃")}</span>}
            </Link>
          ))}
          <Link href="/" className="notebook-cell" aria-label={t("새 이웃 만나러 가기")}>
            <span className="notebook-add">?</span>
            <p className="notebook-name" style={{ color: "var(--brown-soft)" }}>{t("새 이웃")}</p>
            <p className="notebook-job">{t("추가해볼까요?")}</p>
          </Link>
        </div>
      )}

      {/* 빈 상태 (로딩·에러 아님) */}
      {convs !== null && !error && neighbors.length === 0 && groups.length === 0 && dates.length === 0 && (
        <div className="empty">
          {t("아직 만난 이웃이 없어요.")}
          <br />
          <Link href="/" style={{ color: "var(--coral)", fontWeight: 600 }}>{t("오늘의 이웃을 만나러 가볼까요?")}</Link>
        </div>
      )}

      {/* 재방문 유도: 아직 못 만난 귀한 이웃 (절제) */}
      {neighbors.length > 0 && (
        <>
          <DotDivider />
          <Link href="/meet" className="meta" style={{ display: "block", textAlign: "center", fontWeight: 600 }}>
            {t("아직 만나지 못한 이웃도 있어요 →")}
          </Link>
        </>
      )}

      {me && me.type !== "guest" && (
        <>
          <DotDivider />
          <button className="btn-ghost" onClick={logout}>{t("로그아웃")}</button>
        </>
      )}
    </main>
  );
}
