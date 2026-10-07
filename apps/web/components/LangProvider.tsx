"use client";

import { createContext, useContext, type ReactNode } from "react";
import { translate, type Lang } from "../lib/i18n";

const LangContext = createContext<Lang>("ko");

export function LangProvider({ lang, children }: { lang: Lang; children: ReactNode }) {
  return <LangContext.Provider value={lang}>{children}</LangContext.Provider>;
}

/** 화면 문구 번역 훅. t("한국어 원문", { 변수 }) — 한국어 기기는 원문 그대로 */
export function useT() {
  const lang = useContext(LangContext);
  return { lang, t: (key: string, vars?: Record<string, string | number>) => translate(lang, key, vars) };
}
