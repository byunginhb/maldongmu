"use client";

import { useEffect } from "react";
import { track } from "../lib/api";

/** 세션당 1회 visit 이벤트: 어디서 왔는지(referrer/UTM)·앱인지·언어. 퍼널은 서버 DB에서 계산한다. */
export default function Analytics() {
  useEffect(() => {
    try {
      if (sessionStorage.getItem("mdm_visit")) return;
      sessionStorage.setItem("mdm_visit", "1");
    } catch { /* 저장소 차단 환경 — 매번 기록되어도 무방 */ }
    const q = new URLSearchParams(location.search);
    let referrer = "";
    try { referrer = document.referrer ? new URL(document.referrer).hostname.replace(/^www\./, "") : ""; } catch { /* 무시 */ }
    if (referrer === location.hostname.replace(/^www\./, "")) referrer = "";
    track("visit", {
      path: location.pathname,
      referrer,
      utm_source: q.get("utm_source") || "",
      utm_medium: q.get("utm_medium") || "",
      utm_campaign: q.get("utm_campaign") || "",
      ref: q.get("ref") || "",
      app: navigator.userAgent.includes("maldongmuApp"),
      lang: navigator.language,
    });
  }, []);
  return null;
}
