import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "서비스 소개",
  description:
    "말동무의 100만 페르소나는 대한민국의 실제 인구통계·지리·성격 특성 분포를 기반으로 합성된 최초의 대규모 우리말 페르소나 데이터셋으로 만들어졌습니다.",
};

const box: React.CSSProperties = {
  background: "var(--paper)",
  border: "1px solid var(--line)",
  borderRadius: 16,
  padding: "18px 20px",
  marginTop: 10,
};

export default function AboutPage() {
  return (
    <main className="page">
      <h1 className="dot-title">말동무 이야기</h1>
      <p className="meta" style={{ margin: "0 0 24px" }}>오늘은 누구랑 얘기할까요?</p>

      <section>
        <h2 className="dot-title">어떤 서비스인가요</h2>
        <div style={box}>
          <p style={{ margin: 0 }}>
            말동무는 100만 명의 한국인 페르소나를 검색하고 대화하는 서비스입니다.
            제주의 해녀부터 여든의 시인까지 — 현실에서는 스치기도 어려운 이웃들과
            나이·지역·직업의 벽 없이 이야기를 나눠보세요. 특히 평소엔 기회가 없는
            <b> 다른 세대와의 대화</b>를 쉽게 만들어드리는 것이 말동무의 목표예요.
          </p>
        </div>
      </section>

      <section style={{ marginTop: 28 }}>
        <h2 className="dot-title">100만 명은 어떻게 만들어졌나요</h2>
        <div style={box}>
          <p style={{ marginTop: 0 }}>
            말동무의 인물들은 아무렇게나 지어낸 데이터가 아닙니다. NVIDIA가 공개한{" "}
            <a
              href="https://huggingface.co/datasets/nvidia/Nemotron-Personas-Korea"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "var(--coral-deep)", fontWeight: 600 }}
            >
              Nemotron-Personas-Korea
            </a>
            , 즉 <b>최초의 대규모 우리말 페르소나 데이터셋</b>을 기반으로 합니다.
          </p>
          <p>
            이 데이터셋은 대한민국의 실제 인구통계학적·지리적·성격 특성 분포를 반영해
            합성되었습니다. 이름, 성별, 나이, 혼인 상태, 교육 수준, 직업, 거주 지역 등의
            속성이 아래 기관의 실제 통계 자료 분포를 근거로 만들어졌어요.
          </p>
          <ul style={{ margin: "0 0 12px", paddingLeft: 20, lineHeight: 2 }}>
            <li>
              <a href="https://kosis.kr/index/index.do" target="_blank" rel="noopener noreferrer">대한민국 국가데이터처 국가통계포털(KOSIS)</a>
            </li>
            <li>
              <a href="https://scourt.go.kr/" target="_blank" rel="noopener noreferrer">대법원</a>
            </li>
            <li>
              <a href="https://www.nhis.or.kr/" target="_blank" rel="noopener noreferrer">국민건강보험공단</a>
            </li>
            <li>
              <a href="https://www.krei.re.kr/" target="_blank" rel="noopener noreferrer">농촌경제연구원</a>
            </li>
            <li>
              <a href="https://www.navercloudcorp.com/" target="_blank" rel="noopener noreferrer">NAVER Cloud</a>
            </li>
          </ul>
          <p className="meta" style={{ margin: 0 }}>
            데이터셋 라이선스: CC BY 4.0 · 말동무는 해당 데이터셋을 검색·대화 서비스 형태로 제공합니다.
          </p>
        </div>
      </section>

      <section style={{ marginTop: 28 }}>
        <h2 className="dot-title">기억해주세요</h2>
        <div style={box}>
          <p style={{ margin: 0 }}>
            말동무의 모든 인물은 <b>한국의 실제 데이터를 기반으로 만들어진 페르소나</b>입니다.
            통계가 그려낸 "정말 있을 법한 이웃"이지, 특정 실존 인물을 표현한 것은 아니에요.
            인물의 이름이 실제 누군가와 같더라도 우연의 일치이며, 대화는 AI가 실시간으로
            만들어가는 이야기라 사실과 다를 수 있습니다.
          </p>
        </div>
      </section>

      <section style={{ marginTop: 28, marginBottom: 8 }}>
        <h2 className="dot-title">문의</h2>
        <div style={box}>
          <p style={{ margin: 0 }}>
            서비스에 대한 의견이나 문의는 <a href="mailto:byunginhb@gmail.com" style={{ color: "var(--coral-deep)", fontWeight: 600 }}>byunginhb@gmail.com</a> 으로 보내주세요.
          </p>
        </div>
      </section>

      <div style={{ marginTop: 28 }}>
        <Link href="/" className="btn-ghost">← 홈으로</Link>
      </div>
    </main>
  );
}
