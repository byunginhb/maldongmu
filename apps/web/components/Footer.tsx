"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Footer() {
  const pathname = usePathname();
  if (pathname.startsWith("/chat/") || pathname.startsWith("/admin")) return null;
  return (
    <footer
      style={{
        maxWidth: 640,
        margin: "0 auto",
        padding: "24px 20px calc(88px + env(safe-area-inset-bottom))",
        borderTop: "1px solid var(--line)",
      }}
    >
      <nav style={{ display: "flex", gap: 14, fontSize: 13, fontWeight: 600, marginBottom: 10 }}>
        <Link href="/about">서비스 소개</Link>
        <Link href="/terms">이용약관</Link>
        <Link href="/privacy" style={{ fontWeight: 700 }}>개인정보처리방침</Link>
      </nav>
      <p className="meta" style={{ margin: "0 0 4px", fontSize: 12 }}>
        말동무의 모든 인물은 한국의 실제 데이터를 기반으로 만들어진 페르소나입니다. (특정 실존 인물과는 무관해요)
      </p>
      <p className="meta" style={{ margin: "0 0 4px", fontSize: 12 }}>
        페르소나 데이터: NVIDIA Nemotron-Personas-Korea (CC BY 4.0)
      </p>
      <p className="meta" style={{ margin: 0, fontSize: 12 }}>© 2026 말동무 (maldongmu)</p>
    </footer>
  );
}
