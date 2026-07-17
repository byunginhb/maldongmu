import type { Metadata, Viewport } from "next";
import "./globals.css";
import TabBar from "../components/TabBar";
import Footer from "../components/Footer";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "말동무 — 100만 명의 이웃과 나누는 대화",
    template: "%s | 말동무",
  },
  description:
    "제주의 해녀부터 여든의 시인까지. 평소엔 만나기 어려운 100만 명의 한국인 이웃을 검색하고, 실시간으로 대화해보세요. 회원가입 없이 바로 시작할 수 있어요.",
  keywords: [
    "말동무", "AI 대화", "AI 친구", "AI 말벗", "페르소나 챗",
    "한국인 페르소나", "AI 채팅", "대화 상대", "인터뷰 시뮬레이션",
  ],
  icons: { icon: "/logo.png", apple: "/logo.png" },
  openGraph: {
    title: "말동무 — 오늘은 누구랑 얘기할까요?",
    description: "평소엔 만나기 어려운 100만 명의 이웃과 대화해보세요.",
    url: SITE_URL,
    siteName: "말동무",
    images: [{ url: "/og.png", width: 2400, height: 1260 }],
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "말동무 — 오늘은 누구랑 얘기할까요?",
    description: "평소엔 만나기 어려운 100만 명의 이웃과 대화해보세요.",
    images: ["/og.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#FDF6EF",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body>
        {children}
        <Footer />
        <TabBar />
      </body>
    </html>
  );
}
