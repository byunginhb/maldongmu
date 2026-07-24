"use client";

import { useEffect, useState, type ReactNode } from "react";
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

/** 지난 인터뷰 목록 — 입력 화면·크레딧 소진 화면 양쪽에서 공유 */
function PastList({ past, onOpen }: { past: InterviewListItem[]; onOpen: (id: string) => void }) {
  if (past.length === 0) return null;
  return (
    <>
      <h2 className="dot-title" style={{ marginTop: 32 }}>지난 인터뷰</h2>
      <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
        {past.map((p) => (
          <button key={p.id} className="iv-block" style={{ textAlign: "left", cursor: "pointer", marginBottom: 0 }} onClick={() => onOpen(p.id)}>
            <p style={{ margin: 0, fontWeight: 600 }}>{p.topic || "이웃 인터뷰"}</p>
            <p className="meta" style={{ margin: "2px 0 0" }}>{STATUS_LABEL[p.status] || p.status} · {p.createdAt?.slice(0, 10)}</p>
          </button>
        ))}
      </div>
    </>
  );
}

/** 괄호 (표정·몸짓) 을 이탤릭으로 구분 */
function renderNv(text: string): ReactNode[] {
  return text.split(/(\([^)]*\))/g).map((p, i) =>
    p.startsWith("(") && p.endsWith(")") ? <i key={i} className="iv-nonverbal">{p}</i> : <span key={i}>{p}</span>,
  );
}

const SAMPLE_Q = [
  "무설탕 탄산음료, 사보고 싶으세요?",
  "가장 망설여지는 점은 무엇인가요?",
  "가격이 얼마면 적당할까요?",
  "주변의 누구에게 어울릴 것 같아요?",
  "어떤 점이 더 있으면 사시겠어요?",
];
const SAMPLE_PERSONAS = [
  {
    uuid: "sample-haenyeo", name: "김정순", age: 68, sex: "여자", role: "해녀 · 제주 성산",
    stance: "neu", stanceLabel: "조건부 수용",
    summary: "본인 소비는 낮지만 손주를 위해서라면 구매. ‘건강한 선물’ 프레임에 반응.",
    answers: [
      "나야 단 거보다 바닷물이 더 익숙하지. (손사래를 치며 웃는다) 근디 손주가 사달라믄 사주긴 할 겨.",
      "요즘 것들은 뭐가 들었는지 알 수가 있어야지. 무설탕이라 캐도 딴 게 잔뜩 들었으믄 그게 더 무섭지.",
      "물질하고 나면 시원한 거 한 병에 천 원이믄 비싼 거라. (잠시 생각하다) 오백 원 언저리믄 하나 집을랑가.",
      "우리 딸이 살 안 찐다고 물마냥 마시는디, 걔한테 딱이겄네. 나는 그냥 물이 젤 낫고.",
      "맛이나 봐야 알지. 달지도 않고 맹숭맹숭하믄 안 사. 시원하고 개운하믄 또 몰라.",
    ],
  },
  {
    uuid: "sample-welder", name: "박대현", age: 34, sex: "남자", role: "용접공 · 울산",
    stance: "pos", stanceLabel: "수용",
    summary: "현장 갈증 해소가 핵심. 강한 탄산감·가성비가 맞으면 매일 구매.",
    answers: [
      "현장에선 시원한 게 최고죠. 단 건 오히려 나른해져서 안 마셔요. 무설탕이면 (고개를 끄덕이며) 오히려 반갑네.",
      "단 거 뺐다고 맛까지 뺀 건 아닌가, 그게 걱정이죠. 밍밍하면 손 안 가요.",
      "편의점 천오백 원이면 좀 그렇고, 천 원 안쪽이면 매일 하나씩 집죠.",
      "저처럼 몸 쓰는 사람들이요. 헬스장 다니는 형들이 제일 좋아할걸요.",
      "탄산이 좀 쎘으면. (손으로 목을 탁 치며) 목 때리는 그 느낌, 그게 있어야 무설탕이라도 사요.",
    ],
  },
  {
    uuid: "sample-marketer", name: "이서윤", age: 27, sex: "여자", role: "마케터 · 서울 마포",
    stance: "pos", stanceLabel: "수용",
    summary: "이미 제로 음료 습관 보유. 성분 투명성·패키지·SNS 인증 요소가 결정타.",
    answers: [
      "요즘 제로 아니면 잘 안 사요. 칼로리 부담이 없으니까 (눈을 반짝이며) 오히려 더 자주 마시죠.",
      "인공감미료 뒷맛이요. 그거 남으면 리뷰에서 바로 까여요. 성분표 꼭 봐요.",
      "편의점 천오백 원까진 내는데, 브랜드 이미지가 별로면 그 돈은 아깝죠.",
      "저랑 제 친구들, 다이어트하는 사람들 다요. 예쁜 패키지면 인증샷도 올리고요.",
      "성분이 깔끔하고 디자인이 예쁘면요. (핸드폰을 들어 보이며) SNS에 올릴 맛이 나야 진짜 사요.",
    ],
  },
];

/** 게스트에게 보여줄 고정 샘플 (LLM 호출·크레딧 0). 실무 리포트 + 인터뷰 전문 아코디언. */
function GuestTeaser() {
  const [openIdx, setOpenIdx] = useState(0);
  return (
    <div style={{ paddingBottom: 132 }}>
      <span className="iv-sample-tag">예시 리포트</span>
      <h2 className="dot-title" style={{ margin: "6px 0 4px" }}>무설탕 탄산음료, 살까요?</h2>
      <div className="iv-meta-row">
        <span>대상 · 이웃 3명 (20·30·60대)</span>
        <span>방식 · 1:1 심층 인터뷰 · 각 5문항</span>
      </div>

      <section className="iv-report">
        <h3>요약</h3>
        <p>‘무설탕’은 매력적인 진입점이지만, 그 자체로 구매를 만들지는 못했습니다. 세 명 모두 <strong>맛에 대한 신뢰</strong>와 <strong>나에게 맞는 이유</strong>가 확인돼야 지갑을 열었고, 구매 동기는 세대별로 뚜렷이 갈렸습니다.</p>

        <h3>핵심 발견</h3>
        <div className="iv-finding"><b>1. ‘무설탕=구매’가 아니다</b>진입 관심은 높지만, 맛을 확인하기 전까지 구매를 유보했습니다. <span className="meta">3명 모두 언급</span></div>
        <div className="iv-finding"><b>2. 세대별 구매 동기 분화</b>시니어는 ‘손주 선물’, 30대는 ‘현장 갈증 해소’, 20대는 ‘자기관리·SNS 인증’. <span className="meta">3명</span></div>
        <div className="iv-finding"><b>3. 신뢰 장벽은 ‘뒷맛·성분’</b>인공감미료 뒷맛과 불투명한 성분이 가장 큰 이탈 요인이었습니다. <span className="meta">2명</span></div>
        <div className="iv-finding"><b>4. 가격 저항선이 세그먼트별로 다르다</b>시니어 ~500원, 현장직 ~1,000원, 20대 ~1,500원(브랜드 조건부). <span className="meta">3명</span></div>
        <div className="iv-finding"><b>5. ‘첫 경험’이 재구매를 가른다</b>맛·탄산감의 첫인상이 좋으면 반복 구매로 전환됩니다. <span className="meta">2명</span></div>

        <h3>페르소나별 반응</h3>
        {SAMPLE_PERSONAS.map((p) => (
          <div key={p.uuid} className="card" style={{ marginBottom: 8, alignItems: "center", gap: 12 }}>
            <Avatar uuid={p.uuid} sex={p.sex} age={p.age} size={44} radius={12} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <p className="card-name">{p.name} <span style={{ fontWeight: 400 }}>· {p.age}세 · {p.role}</span></p>
              <p className="card-meta" style={{ margin: "2px 0 0" }}>{p.summary}</p>
            </div>
            <span className={`iv-badge ${p.stance}`} style={{ flexShrink: 0 }}>{p.stanceLabel}</span>
          </div>
        ))}

        <h4 className="pos">긍정 신호</h4>
        <ul>
          <li>무설탕 자체엔 거부감 없음 — 오히려 반가움</li>
          <li>2030은 이미 제로 음료 습관 보유</li>
          <li>시니어는 ‘선물’ 채널로 진입 가능</li>
        </ul>
        <h4 className="neg">우려·리스크</h4>
        <ul>
          <li>밍밍한 맛·약한 탄산이면 즉시 이탈</li>
          <li>인공감미료 뒷맛 → 온라인 혹평 위험</li>
          <li>성분 불투명성에 대한 불신</li>
        </ul>

        <h3>대표 인용</h3>
        <div className="iv-quote">“단 거 끊은 지 오래라 무설탕이면 반갑죠, 근데 맛은 봐야 알지” — 박대현, 34</div>
        <div className="iv-quote">“목 때리는 그 느낌이 있어야 무설탕이라도 사요” — 박대현, 34</div>
        <div className="iv-quote">“SNS에 올릴 맛이 나야 진짜 사요” — 이서윤, 27</div>
        <div className="iv-quote">“손주가 사달라믄 사주긴 할 겨” — 김정순, 68</div>

        <h3>기회 &amp; 개선 제안</h3>
        <div className="iv-finding"><b><span className="iv-badge neg">높음</span>&nbsp; 첫 경험 장벽 낮추기</b>소용량·시식 프로모션으로 ‘맛 신뢰’를 먼저 확보하세요.</div>
        <div className="iv-finding"><b><span className="iv-badge neg">높음</span>&nbsp; 세그먼트별 메시지 분리</b>시니어 ‘건강한 선물’, 2030 ‘자기관리·인증’으로 나눠 접근.</div>
        <div className="iv-finding"><b><span className="iv-badge neu">중간</span>&nbsp; 강한 탄산감 + 뒷맛 최소화</b>이 두 가지를 제품 코어 경쟁력으로.</div>
        <div className="iv-finding"><b><span className="iv-badge neu">중간</span>&nbsp; 성분 투명성 전면화</b>전성분·무첨가를 라벨 전면에 배치.</div>

        <h3>세그먼트 적합도</h3>
        <ul>
          <li>가장 호의적 — <strong>2030 자기관리층</strong></li>
          <li>진입 채널 유효 — <strong>시니어(선물 구매)</strong></li>
          <li>상대적 비호의 — 맛에 보수적인 성향</li>
        </ul>

        <h3>다음 단계 제안</h3>
        <p>실제 시제품 <strong>블라인드 맛 테스트</strong>와 세그먼트별 <strong>가격 민감도 정량 조사</strong>로 이번 정성 신호를 검증하는 것을 제안합니다.</p>

        <p className="iv-disclaimer">이 리포트는 가상 페르소나 기반 참고 의견이며 실제 사용자 조사를 대체하지 않습니다.</p>
      </section>

      <h2 className="dot-title" style={{ marginTop: 28 }}>인터뷰 전문</h2>
      <p className="meta" style={{ margin: "4px 0 12px" }}>이름을 누르면 인터뷰 전체를 볼 수 있어요</p>
      {SAMPLE_PERSONAS.map((p, idx) => {
        const open = openIdx === idx;
        return (
          <button key={p.uuid} className={`iv-accordion ${open ? "open" : ""}`} onClick={() => setOpenIdx(open ? -1 : idx)}>
            <div className="iv-accordion-head">
              <span className="bubble-avatar"><Avatar uuid={p.uuid} sex={p.sex} age={p.age} size={32} radius={8} /></span>
              <span className="who" style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {p.name} · {p.age}세 · {p.role}
              </span>
              <span className={`iv-badge ${p.stance}`}>{p.stanceLabel}</span>
              <span className="chev">▸</span>
            </div>
            {!open ? (
              <p className="iv-accordion-sum">{p.summary}</p>
            ) : (
              <div className="iv-qa">
                {SAMPLE_Q.map((q, i) => (
                  <div key={i}>
                    <p className="iv-q">Q{i + 1}. {q}</p>
                    <p className="iv-answer" style={{ margin: 0 }}>{renderNv(p.answers[i])}</p>
                  </div>
                ))}
              </div>
            )}
          </button>
        );
      })}

      <h2 className="dot-title" style={{ marginTop: 28 }}>이런 주제를 던져보세요</h2>
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
        <>
          <div className="iv-block">
            <p style={{ marginTop: 0 }}>이웃 인터뷰는 계정당 2번 체험할 수 있어요. 더 해보고 싶다면 피드백을 남겨주세요 — 확인하고 열어드릴게요.</p>
            <button className="btn-ghost" onClick={() => router.push("/me")}>피드백 남기기</button>
          </div>
          <PastList past={past} onOpen={(id) => router.push(`/interview/${id}`)} />
        </>
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

          <PastList past={past} onOpen={(id) => router.push(`/interview/${id}`)} />
        </>
      )}

      {showLogin && <LoginSheet onClose={() => setShowLogin(false)} />}
    </main>
  );
}
