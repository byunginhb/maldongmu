import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "개인정보처리방침" };

const h: React.CSSProperties = { fontSize: 15, fontWeight: 700, margin: "22px 0 6px" };
const p: React.CSSProperties = { margin: "0 0 8px", fontSize: 14, lineHeight: 1.75 };

export default function PrivacyPage() {
  return (
    <main className="page">
      <h1 className="dot-title">개인정보처리방침</h1>
      <p className="meta" style={{ margin: "0 0 20px" }}>시행일: 2026년 7월 17일</p>

      <div style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 16, padding: "20px 22px" }}>
        <p style={h}>1. 수집하는 정보</p>
        <p style={p}>
          <b>게스트 이용 시</b>: 익명 식별자(무작위 생성), 대화 내용, 서비스 이용 기록(대화 시작·메시지
          수·토큰 사용량). 이름·연락처 등 개인을 식별할 수 있는 정보는 수집하지 않습니다.
        </p>
        <p style={p}>
          <b>소셜 로그인 시</b>: 구글 또는 카카오로부터 제공받는 계정 식별자, 이메일 주소, 닉네임.
          비밀번호는 수집하지 않습니다.
        </p>

        <p style={h}>2. 수집 목적</p>
        <p style={p}>
          대화 이력의 저장·이어보기 제공, 서비스 이용 통계 분석 및 품질 개선, 비정상 이용 방지.
        </p>

        <p style={h}>3. 대화 내용의 처리 (중요)</p>
        <p style={p}>
          입력하신 메시지는 AI 응답 생성을 위해 외부 AI 모델 제공사(OpenRouter 및 그 연동 모델
          제공사)에 전송되어 처리됩니다. 대화에 민감한 개인정보(주민등록번호, 금융정보, 건강정보 등)를
          입력하지 않기를 권장합니다.
        </p>

        <p style={h}>4. 보관 및 파기</p>
        <p style={p}>
          대화 내용과 계정 정보는 서비스 제공 기간 동안 보관하며, 이용자가 삭제를 요청하거나
          서비스가 종료되면 지체 없이 파기합니다. 통계 자료는 개인을 식별할 수 없는 형태로만 보관합니다.
        </p>

        <p style={h}>5. 제3자 제공</p>
        <p style={p}>
          법령에 근거한 경우를 제외하고 개인정보를 제3자에게 판매·제공하지 않습니다.
          AI 응답 생성 목적의 외부 처리(제3항)는 서비스 제공에 필수적인 처리 위탁에 해당합니다.
        </p>

        <p style={h}>6. 이용자의 권리</p>
        <p style={p}>
          이용자는 언제든지 자신의 대화 이력·계정 정보의 열람, 정정, 삭제를 요청할 수 있습니다.
          문의처로 요청 시 지체 없이 처리합니다.
        </p>

        <p style={h}>7. 쿠키 및 저장소</p>
        <p style={p}>
          서비스는 로그인 상태 유지를 위해 브라우저 로컬 저장소(localStorage)에 인증 토큰을 저장합니다.
          광고·추적 목적의 쿠키는 사용하지 않습니다.
        </p>

        <p style={h}>8. 개인정보 보호책임자 및 문의</p>
        <p style={{ ...p, marginBottom: 0 }}>
          문의: <a href="mailto:byunginhb@gmail.com" style={{ color: "var(--coral-deep)", fontWeight: 600 }}>byunginhb@gmail.com</a>
          <br />
          방침이 변경되는 경우 시행일 7일 전 서비스 내 공지합니다.
        </p>
      </div>

      <div style={{ marginTop: 24 }}>
        <Link href="/" className="btn-ghost">← 홈으로</Link>
      </div>
    </main>
  );
}
