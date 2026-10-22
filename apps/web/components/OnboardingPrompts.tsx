"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { PersonaCard } from "@maldongmu/shared";
import { apiGet, apiPost, LoginRequiredError } from "../lib/api";
import { saveOnboardingDraft } from "../lib/onboarding-draft";
import { useT } from "./LangProvider";

const PROMPTS = [
  "오늘 하루는 어떠셨어요?",
  "요즘 즐겨 하는 일이 있으세요?",
  "좋아하는 음식 이야기를 나눠볼까요?",
];

export default function OnboardingPrompts({ featured, onLoginRequired }: {
  featured: PersonaCard[] | null;
  onLoginRequired: () => void;
}) {
  const { t } = useT();
  const router = useRouter();
  const locked = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const start = async (text: string) => {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    setError("");
    try {
      const persona = featured?.[0] ?? await apiGet<PersonaCard>("/personas/random");
      const conversation = await apiPost<{ id: string }>("/conversations", { personaUuid: persona.uuid });
      if (!saveOnboardingDraft(conversation.id, text)) throw new Error("Draft unavailable");
      router.push(`/chat/${conversation.id}`);
    } catch (e) {
      if (e instanceof LoginRequiredError) onLoginRequired();
      else setError(t("대화를 시작하지 못했어요. 잠시 후 다시 눌러주세요."));
      locked.current = false;
      setBusy(false);
    }
  };

  return (
    <section className="onboarding-prompts" data-testid="company-onboarding" aria-labelledby="company-onboarding-title">
      <div className="company-home-reveal company-home-delay-1" data-testid="company-home-reveal">
      <h2 id="company-onboarding-title" className="dot-title">{t("어떤 말부터 건네볼까요?")}</h2>
      <p className="meta onboarding-description">{t("문장을 누르면 AI 이웃과 대화를 시작하고, 선택한 문장이 바로 전송돼요.")}</p>
      <div className="onboarding-list">
        {PROMPTS.map((key) => {
          const text = t(key);
          return <button key={key} type="button" className="onboarding-prompt"
            data-testid="company-example-prompt" data-prompt={text}
            disabled={busy} aria-busy={busy} onClick={() => void start(text)}>{text}</button>;
        })}
      </div>
      <p className="meta onboarding-status" role="status">{busy ? t("이웃과 대화를 연결하고 있어요…") : ""}</p>
      {error && <p className="chat-error" role="alert">{error}</p>}
      </div>
    </section>
  );
}
