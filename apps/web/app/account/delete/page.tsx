import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "계정 삭제 요청" };

const h: React.CSSProperties = { fontSize: 15, fontWeight: 700, margin: "22px 0 6px" };
const p: React.CSSProperties = { margin: "0 0 8px", fontSize: 14, lineHeight: 1.75 };
const li: React.CSSProperties = { ...p, margin: "0 0 4px" };

const MAIL = "byunginhb@gmail.com";

export default function AccountDeletePage() {
  return (
    <main className="page">
      <h1 className="dot-title">계정 삭제 요청</h1>
      <p className="meta" style={{ margin: "0 0 20px" }}>
        말동무 계정과 대화 이력을 영구 삭제하는 방법을 안내해요.
      </p>

      <div style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 16, padding: "20px 22px" }}>
        <p style={h}>1. 삭제 요청 방법</p>
        <p style={p}>
          가입에 사용한 이메일(구글 또는 카카오)과 함께{" "}
          <a
            href={`mailto:${MAIL}?subject=계정 삭제 요청`}
            style={{ color: "var(--coral-deep)", fontWeight: 600 }}
          >
            {MAIL}
          </a>{" "}
          으로 &quot;계정 삭제 요청&quot;을 보내주시면, <b>영업일 기준 7일 이내</b>에 계정 정보와 대화
          이력을 영구 삭제합니다. 처리가 끝나면 같은 이메일로 완료를 알려드려요.
        </p>

        <p style={h}>2. 삭제되는 데이터</p>
        <p style={li}>· 계정 정보 — 이메일 주소, 닉네임, 소셜 계정 식별자</p>
        <p style={li}>· 대화 이력 — 대화방과 주고받은 메시지 전문</p>
        <p style={li}>· 이웃 인터뷰 기록 — 요청 내용, 인터뷰 전문, 리포트</p>
        <p style={p}>· 앱 활동 로그 — 대화 시작·메시지 수·토큰 사용량 등 이용 기록</p>

        <p style={h}>3. 삭제 후 보관되는 데이터</p>
        <p style={p}>
          개인을 식별할 수 없는 형태로 집계된 통계 자료만 보관하며, 그 외의 데이터는 별도 보관 기간
          없이 즉시 파기합니다. 통계 자료로는 이용자를 다시 식별할 수 없습니다.
        </p>

        <p style={h}>4. 로그인 없이 이용한 경우</p>
        <p style={p}>
          게스트로만 이용하셨다면 계정이 생성되지 않으며, 대화 이력은 브라우저(또는 앱)에 저장된
          익명 식별자에만 연결되어 있습니다. 저장소를 비우거나 앱을 삭제하면 해당 이력에 다시 접근할
          수 없습니다. 서버에 남은 기록까지 파기를 원하시면 위와 동일하게 요청해 주세요.
        </p>

        <p style={h}>5. 문의</p>
        <p style={{ ...p, marginBottom: 0 }}>
          삭제 외에 열람·정정을 원하시는 경우에도{" "}
          <a href={`mailto:${MAIL}`} style={{ color: "var(--coral-deep)", fontWeight: 600 }}>
            {MAIL}
          </a>{" "}
          으로 문의해 주세요. 자세한 처리 원칙은{" "}
          <Link href="/privacy" style={{ color: "var(--coral-deep)", fontWeight: 600 }}>
            개인정보처리방침
          </Link>
          을 참고하시면 됩니다.
        </p>
      </div>

      <div style={{ marginTop: 24 }}>
        <Link href="/" className="btn-ghost">← 홈으로</Link>
      </div>
    </main>
  );
}
