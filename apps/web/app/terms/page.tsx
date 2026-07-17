import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "이용약관" };

const h: React.CSSProperties = { fontSize: 15, fontWeight: 700, margin: "22px 0 6px" };
const p: React.CSSProperties = { margin: "0 0 8px", fontSize: 14, lineHeight: 1.75 };

export default function TermsPage() {
  return (
    <main className="page">
      <h1 className="dot-title">이용약관</h1>
      <p className="meta" style={{ margin: "0 0 20px" }}>시행일: 2026년 7월 17일</p>

      <div style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 16, padding: "20px 22px" }}>
        <p style={h}>제1조 (목적)</p>
        <p style={p}>
          이 약관은 말동무(이하 &quot;서비스&quot;)의 이용 조건 및 절차, 이용자와 운영자의 권리·의무를
          규정함을 목적으로 합니다.
        </p>

        <p style={h}>제2조 (서비스의 내용)</p>
        <p style={p}>
          서비스는 대한민국의 실제 통계 데이터 분포를 기반으로 합성된 페르소나를 검색하고 대화할 수
          있는 기능을 제공합니다. 페르소나는 특정 실존 인물을 표현하지 않으며, 대화 내용은 인공지능이
          생성합니다.
        </p>

        <p style={h}>제3조 (계정)</p>
        <p style={p}>
          이용자는 별도 가입 없이 게스트로 서비스를 이용할 수 있으며, 구글 또는 카카오 계정으로
          로그인하면 대화 이력이 계정에 보관됩니다. 계정 관리 책임은 이용자에게 있습니다.
        </p>

        <p style={h}>제4조 (AI 생성 콘텐츠에 대한 고지)</p>
        <p style={p}>
          대화 내용은 인공지능이 생성한 것으로 사실과 다를 수 있으며, 의료·법률·금융 등 전문적
          판단의 근거로 사용될 수 없습니다. 운영자는 AI 생성 콘텐츠의 정확성·완전성을 보증하지 않습니다.
        </p>

        <p style={h}>제5조 (금지행위)</p>
        <p style={p}>
          이용자는 다음 행위를 해서는 안 됩니다: 타인의 권리를 침해하거나 불쾌감을 주는 콘텐츠 생성 시도,
          서비스의 정상적인 운영을 방해하는 행위(자동화된 대량 요청 포함), 불법적인 목적의 이용,
          생성된 콘텐츠를 실존 인물의 발언인 것처럼 유통하는 행위.
        </p>

        <p style={h}>제6조 (지식재산권)</p>
        <p style={p}>
          서비스의 디자인·소프트웨어에 대한 권리는 운영자에게 있습니다. 페르소나 데이터는
          NVIDIA Nemotron-Personas-Korea(CC BY 4.0)를 기반으로 합니다. 이용자가 대화를 통해 얻은
          결과물은 개인적·비상업적 범위에서 자유롭게 사용할 수 있습니다.
        </p>

        <p style={h}>제7조 (서비스의 변경·중단)</p>
        <p style={p}>
          운영자는 운영상·기술상 필요에 따라 서비스의 전부 또는 일부를 변경·중단할 수 있습니다.
          이 경우 사전에 공지하며, 불가피한 경우 사후에 공지할 수 있습니다.
        </p>

        <p style={h}>제8조 (책임의 제한)</p>
        <p style={p}>
          운영자는 무료로 제공되는 서비스와 관련하여 관련 법령이 허용하는 범위에서 책임을 제한합니다.
          천재지변, 통신 장애 등 불가항력으로 인한 손해에 대해 책임지지 않습니다.
        </p>

        <p style={h}>제9조 (약관의 변경)</p>
        <p style={p}>
          운영자는 필요 시 이 약관을 변경할 수 있으며, 변경 시 시행일 7일 전 서비스 내 공지합니다.
        </p>

        <p style={h}>제10조 (준거법)</p>
        <p style={{ ...p, marginBottom: 0 }}>
          이 약관은 대한민국 법률에 따라 해석되며, 분쟁은 민사소송법상 관할 법원에 제기합니다.
        </p>
      </div>

      <div style={{ marginTop: 24 }}>
        <Link href="/" className="btn-ghost">← 홈으로</Link>
      </div>
    </main>
  );
}
