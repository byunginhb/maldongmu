"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { PersonaCard } from "@maldongmu/shared";
import { apiGet, apiPost, LoginRequiredError } from "../lib/api";
import { saveOnboardingDraft } from "../lib/onboarding-draft";
import { BALANCE_QUESTIONS, balanceMessage } from "../lib/balance-game";
import Avatar from "./Avatar";
import { useT } from "./LangProvider";

export default function HomeBalanceGame({ featured, onLoginRequired }: {
  featured: PersonaCard[] | null;
  onLoginRequired: () => void;
}) {
  const { lang, t } = useT();
  const router = useRouter();
  const locked = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [index, setIndex] = useState(0);
  const question = BALANCE_QUESTIONS[index];
  const neighbor = featured?.[0];

  const start = async (choice: 0 | 1) => {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    setError("");
    try {
      const persona = featured?.[0] ?? await apiGet<PersonaCard>("/personas/random");
      const conversation = await apiPost<{ id: string }>("/conversations", { personaUuid: persona.uuid });
      if (!saveOnboardingDraft(conversation.id, balanceMessage(question, choice, lang))) throw new Error("Draft unavailable");
      router.push(`/chat/${conversation.id}`);
    } catch (e) {
      if (e instanceof LoginRequiredError) onLoginRequired();
      else setError(t("대화를 시작하지 못했어요. 잠시 후 다시 눌러주세요."));
      locked.current = false;
      setBusy(false);
    }
  };

  return (
    <section className="balance-game company-home-reveal company-home-delay-1" data-testid="home-balance-game" aria-labelledby="balance-game-title">
      <div className="balance-game-heading">
        <h2 id="balance-game-title" className="dot-title">{t("밸런스 게임 한 판")}</h2>
        <button type="button" className="balance-game-next" disabled={busy} onClick={() => {
          if (locked.current) return;
          setIndex((value) => (value + 1) % BALANCE_QUESTIONS.length);
          setError("");
        }}>{t("다른 질문")} <span aria-hidden="true">↻</span></button>
      </div>
      <p className="meta balance-game-description">{t("내 선택에 이웃도 동의할까요?")}</p>
      <h3 className="balance-game-question" aria-live="polite" aria-atomic="true">{t(question.question)}</h3>
      <div className="balance-game-choices" role="group" aria-label={t(question.question)} aria-busy={busy}>
        <button type="button" className="balance-game-choice" disabled={busy} onClick={() => void start(0)}>{t(question.options[0])}</button>
        <span className="meta" aria-hidden="true">vs</span>
        <button type="button" className="balance-game-choice" disabled={busy} onClick={() => void start(1)}>{t(question.options[1])}</button>
      </div>
      <p className="meta balance-game-guide">{t("고르면 질문과 내 선택이 AI 이웃에게 바로 전송돼요.")}</p>
      <div className="balance-game-neighbor">
        {neighbor && <Avatar uuid={neighbor.uuid} sex={neighbor.sex} age={neighbor.age} size={28} radius={8} />}
        <span className="meta">{neighbor ? t("{name}님의 선택도 들어보세요", { name: neighbor.name }) : t("다른 생각을 가진 이웃을 만나보세요")}</span>
      </div>
      <p className="meta balance-game-status" role="status">{busy ? t("이웃과 대화를 연결하고 있어요…") : ""}</p>
      {error && <p className="chat-error" role="alert">{error}</p>}
    </section>
  );
}
