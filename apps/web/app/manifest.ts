import type { MetadataRoute } from "next";

/** PWA manifest — Next가 /manifest.webmanifest로 서빙. TWA(안드로이드 앱) 래핑의 기준 파일. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "말동무 — 100만 명의 이웃과 나누는 대화",
    short_name: "말동무",
    description:
      "지역별 욕쟁이 할매부터 판사·해녀까지, 100만 한국인 페르소나와 나누는 진짜 같은 대화.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f2e9d9",
    theme_color: "#f2e9d9",
    lang: "ko",
    categories: ["entertainment", "social"],
    icons: [
      { src: "/icons/pwa-icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/pwa-icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/pwa-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
