"use client";

import { useEffect, useState } from "react";
import { track } from "../lib/api";

const PLAY = "https://play.google.com/store/apps/details?id=app.maldongmu.twa";

/** 안드로이드 모바일 웹에만 "앱으로 보기" 슬림 배너. 앱 안(UA maldongmuApp)이나 닫은 뒤 7일은 숨김 */
export default function AppBanner() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const ua = navigator.userAgent;
    if (!/Android/i.test(ua) || ua.includes("maldongmuApp")) return;
    try { if (Number(localStorage.getItem("mdm_app_banner_until") || 0) > Date.now()) return; } catch { /* 저장소 차단 */ }
    setShow(true);
  }, []);
  if (!show) return null;
  const dismiss = () => {
    try { localStorage.setItem("mdm_app_banner_until", String(Date.now() + 7 * 86400_000)); } catch { /* 무시 */ }
    setShow(false);
  };
  return (
    <div className="app-banner" role="region" aria-label="앱 안내">
      <span>말동무 앱으로 더 편하게</span>
      <a href={PLAY} onClick={() => track("app_banner_click")} target="_blank" rel="noopener">Play에서 받기</a>
      <button onClick={dismiss} aria-label="닫기">×</button>
    </div>
  );
}
