"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  apiGet,
  createInterview,
  listInterviews,
  InterviewLimitError,
  type InterviewCredits,
  type InterviewListItem,
} from "../../lib/api";
import Avatar from "../../components/Avatar";
import LoginSheet from "../../components/LoginSheet";

interface Me {
  type: "guest" | "google" | "kakao";
}

const STATUS_LABEL: Record<string, string> = { active: "진행 중", done: "완료", failed: "실패", aborted: "취소됨" };

/** 게스트에게 보여줄 고정 샘플 (LLM 호출·크레딧 0). 리포트가 주인공, 하단 CTA는 고정. */
function GuestTeaser() {
  return (
    <div style={{ paddingBottom: 132 }}>
      <span className="iv-sample-tag">예시 리포트</span>
      <h2 className="dot-title" style={{ margin: "6px 0 2px" }}>무설탕 탄산음료, 살까요?</h2>
      <p className="meta" style={{ margin: "0 0 14px" }}>이웃 3명에게 물어본 결과예요</p>

      <section className="iv-report">
        <h3>한 줄 총평</h3>
        <p>필요는 느끼지만 <strong>“무설탕”이라는 말만으로는 지갑이 열리지 않는</strong> 분위기예요. 건강 이미지와 실제 맛 사이의 신뢰가 관건이에요.</p>
        <h3>핵심 인사이트</h3>
        <ul>
          <li>시니어층은 본인 소비보다 <strong>“손주 매개” 구매</strong>가 우세 (2명)</li>
          <li>가격보다 <strong>건강 이미지</strong>에 먼저 반응하지만, 맛 확인 전엔 유보 (3명)</li>
          <li>“무설탕=맛없다” 선입견을 넘을 <strong>첫 경험</strong>이 구매를 가른다 (2명)</li>
        </ul>
        <h3>대표 인용</h3>
        <div className="iv-quote">“손주가 사달라믄 사주긴 할 겨” — 김정순, 68, 해녀</div>
        <div className="iv-quote">“단 거 끊은 지 오래라 무설탕이면 반갑죠, 근데 맛은 봐야 알지” — 박대현, 34, 용접공</div>
        <h3>이렇게 해보면 어때요</h3>
        <ul>
          <li>시니어 타깃은 ‘손주 선물’ 메시지로 접근</li>
          <li>첫 구매 장벽을 낮추는 소용량·시식 옵션</li>
          <li>가격은 350원 이하 구간에서 시작</li>
        </ul>
        <p className="iv-disclaimer">이 리포트는 가상 페르소나 기반 참고 의견이며 실제 사용자 조사를 대체하지 않습니다.</p>
      </section>

      <h2 className="dot-title" style={{ marginTop: 26 }}>이런 인터뷰에서 나왔어요</h2>
      <div className="iv-block" style={{ marginTop: 10 }}>
        <div className="iv-block-head">
          <span className="bubble-avatar"><Avatar uuid="sample-haenyeo" sex="여자" age={68} size={32} radius={8} /></span>
          <span className="who">김정순 · 68세 · 해녀</span>
        </div>
        <div className="iv-answer">
          Q. 무설탕이면 사보고 싶으세요?{"\n"}
          나야 단 거보다 바닷물이 더 익숙하지. <i className="iv-nonverbal">(손사래를 치며 웃는다)</i> 근디 손주가 사달라믄 사주긴 할 겨.
        </div>
      </div>

      <h2 className="dot-title" style={{ marginTop: 26 }}>이런 주제를 던져보세요</h2>
      <div className="iv-quote" style={{ marginTop: 10 }}>“무설탕 탄산음료, 사람들이 살까요?”</div>
      <div className="iv-quote">“https://maldongmu.app 이 서비스, 사람들이 쓸까요?”</div>
    </div>
  );
}

export default function InterviewLandingPage() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [credits, setCredits] = useState<InterviewCredits | null>(null);
  const [past, setPast] = useState<InterviewListItem[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [limited, setLimited] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    apiGet<Me>("/auth/me")
      .then((m) => {
        setMe(m);
        if (m.type !== "guest") {
          apiGet<InterviewCredits>("/interviews/credits").then(setCredits).catch(() => {});
          listInterviews().then(setPast).catch(() => {});
        }
      })
      .catch(() => setMe({ type: "guest" }));
  }, []);

  const start = async () => {
    const text = input.trim();
    if (text.length < 5 || busy) return;
    setBusy(true);
    setErr("");
    try {
      const { sessionId } = await createInterview(text);
      router.push(`/interview/${sessionId}`);
    } catch (e) {
      if (e instanceof InterviewLimitError) setLimited(true);
      else setErr("잠시 문제가 생겼어요. 다시 시도해주세요.");
      setBusy(false);
    }
  };

  const isUrl = /https?:\/\//i.test(input);

  return (
    <main className="page">
      <h1 className="dot-title">이웃 인터뷰</h1>
      <p className="meta" style={{ margin: "4px 0 20px" }}>페르소나 설문조사 · 이웃 3명에게 물어보고 리포트로 받아요</p>

      {me === null ? (
        <div className="skeleton" style={{ height: 160 }} />
      ) : me.type === "guest" ? (
        <>
          <GuestTeaser />
          <div className="cta-float">
            <div>
              <button className="btn-cta" onClick={() => setShowLogin(true)}>로그인하고 내 주제로 인터뷰하기</button>
              <p className="meta" style={{ textAlign: "center", margin: "8px 0 0" }}>가입하면 2번 무료로 해볼 수 있어요</p>
            </div>
          </div>
        </>
      ) : limited || (credits && credits.remaining <= 0) ? (
        <div className="iv-block">
          <p style={{ marginTop: 0 }}>이웃 인터뷰는 계정당 2번 체험할 수 있어요. 더 해보고 싶다면 피드백을 남겨주세요 — 확인하고 열어드릴게요.</p>
          <button className="btn-ghost" onClick={() => router.push("/me")}>피드백 남기기</button>
        </div>
      ) : (
        <>
          {credits && (
            <p className="meta" style={{ margin: "0 0 8px" }}>무료 인터뷰 {credits.granted}번 중 <b>{credits.remaining}번</b> 남음</p>
          )}
          <p style={{ margin: "0 0 8px", fontWeight: 600 }}>무엇을 물어볼까요?</p>
          <div className="search-box" style={{ height: "auto", alignItems: "flex-start", padding: "12px 16px", borderRadius: 16 }}>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="예: 새로 낼 제로 슈거 음료, 사람들이 살까요? — 또는 링크를 붙여넣어 주세요"
              maxLength={500}
              rows={3}
              style={{ flex: 1, border: "none", outline: "none", background: "transparent", resize: "none", fontSize: 15, color: "var(--brown)", fontFamily: "inherit" }}
            />
          </div>
          {isUrl && <p className="meta" style={{ margin: "8px 0 0" }}>🔗 링크를 읽어 인터뷰를 준비할게요</p>}
          {err && <p style={{ color: "var(--red)", fontSize: 13, margin: "8px 0 0" }}>{err}</p>}
          <button className="btn-cta" style={{ marginTop: 16 }} onClick={start} disabled={busy || input.trim().length < 5}>
            {busy ? "인터뷰를 준비하고 있어요…" : "인터뷰 시작하기"}
          </button>
          <p className="meta" style={{ textAlign: "center", margin: "10px 0 0" }}>이웃 3명이 각자의 눈으로 답해드려요</p>

          {past.length > 0 && (
            <>
              <h2 className="dot-title" style={{ marginTop: 32 }}>지난 인터뷰</h2>
              <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                {past.map((p) => (
                  <button key={p.id} className="iv-block" style={{ textAlign: "left", cursor: "pointer", marginBottom: 0 }} onClick={() => router.push(`/interview/${p.id}`)}>
                    <p style={{ margin: 0, fontWeight: 600 }}>{p.topic || "이웃 인터뷰"}</p>
                    <p className="meta" style={{ margin: "2px 0 0" }}>{STATUS_LABEL[p.status] || p.status} · {p.createdAt?.slice(0, 10)}</p>
                  </button>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {showLogin && <LoginSheet onClose={() => setShowLogin(false)} />}
    </main>
  );
}
