"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useT } from "./LangProvider";

export default function Footer() {
  const { t } = useT();
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
      {/* 검색엔진이 홈에서 바로 따라갈 수 있는 내부 링크 (큐레이션 페이지 발견 경로) */}
      <nav aria-label={t("둘러보기")} style={{ display: "flex", flexWrap: "wrap", gap: "6px 14px", fontSize: 13, marginBottom: 12 }}>
        <Link href="/dating">{t("가상 연애")}</Link>
        <Link href="/grannies">{t("욕쟁이 할매")}</Link>
        <Link href="/meet">{t("만나보고 싶던 사람들")}</Link>
        <Link href="/meet/judge">{t("판사와 대화")}</Link>
        <Link href="/meet/firefighter">{t("소방관과 대화")}</Link>
        <Link href="/meet/haenyeo">{t("해녀와 대화")}</Link>
        <Link href="/meet/pilot">{t("조종사와 대화")}</Link>
        <Link href="/meet/monk">{t("승려와 대화")}</Link>
        <Link href="/meet/astronomer">{t("천문학자와 대화")}</Link>
        <Link href="/meet/actor">{t("배우와 대화")}</Link>
        <Link href="/meet/writer">{t("작가와 대화")}</Link>
        <Link href="/meet/gugak">{t("국악인과 대화")}</Link>
        <Link href="/meet/navigator">{t("항해사와 대화")}</Link>
      </nav>
      <nav style={{ display: "flex", gap: 14, fontSize: 13, fontWeight: 600, marginBottom: 10 }}>
        <Link href="/about">{t("서비스 소개")}</Link>
        <Link href="/terms">{t("이용약관")}</Link>
        <Link href="/privacy" style={{ fontWeight: 700 }}>{t("개인정보처리방침")}</Link>
      </nav>
      <p className="meta" style={{ margin: "0 0 4px", fontSize: 12 }}>
        {t("말동무의 모든 인물은 한국의 실제 데이터를 기반으로 만들어진 페르소나입니다. (특정 실존 인물과는 무관해요)")}
      </p>
      <p className="meta" style={{ margin: "0 0 4px", fontSize: 12 }}>
        페르소나 데이터: NVIDIA Nemotron-Personas-Korea (CC BY 4.0)
      </p>
      <p className="meta" style={{ margin: 0, fontSize: 12 }}>© 2026 말동무 (maldongmu)</p>
    </footer>
  );
}
