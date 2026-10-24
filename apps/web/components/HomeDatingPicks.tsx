"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { PersonaCard } from "@maldongmu/shared";
import { apiGet, apiPost, LoginRequiredError } from "../lib/api";
import { createDatingLoader, DATING_AGES, type DatingSex, type DatingSlot } from "../lib/dating-picks";
import Avatar from "./Avatar";
import { useT } from "./LangProvider";

const SEXES: readonly DatingSex[] = ["남자", "여자"];

export default function HomeDatingPicks({ onLoginRequired }: { onLoginRequired: () => void }) {
  const { t } = useT();
  const router = useRouter();
  const id = useId();
  const [sex, setSex] = useState<DatingSex>("남자");
  const [results, setResults] = useState<Partial<Record<DatingSex, DatingSlot<PersonaCard>[]>>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const locked = useRef(false);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const [load] = useState(() => createDatingLoader<PersonaCard>((gender, min, max) =>
    apiGet<PersonaCard[]>(`/personas/dating?sex=${encodeURIComponent(gender)}&ageMin=${min}&ageMax=${max}`)));

  useEffect(() => {
    let active = true;
    void load(sex).then((slots) => {
      if (active) setResults((previous) => ({ ...previous, [sex]: slots }));
    });
    return () => { active = false; };
  }, [sex, load]);

  async function start(personaUuid: string) {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    setError(false);
    try {
      const conversation = await apiPost<{ id: string }>("/conversations", { personaUuid, mode: "dating" });
      router.push(`/chat/${conversation.id}`);
    } catch (cause) {
      if (cause instanceof LoginRequiredError) onLoginRequired();
      else setError(true);
      locked.current = false;
      setBusy(false);
    }
  }

  return (
    <div className="home-dating-picks" data-testid="company-dating-section">
      <div className="home-dating-tabs" role="tablist" aria-label={t("가상 연애")}>
        {SEXES.map((value, index) => (
          <button key={value} ref={(element) => { tabs.current[index] = element; }} type="button"
            id={`${id}-tab-${index}`} role="tab" aria-selected={sex === value}
            aria-controls={`${id}-panel-${index}`} tabIndex={sex === value ? 0 : -1}
            data-testid={index === 0 ? "company-dating-tab-male" : "company-dating-tab-female"}
            className={`home-dating-tab${sex === value ? " on" : ""}`}
            onClick={() => setSex(value)}
            onKeyDown={(event) => {
              if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
              event.preventDefault();
              const next = (index + (event.key === "ArrowRight" ? 1 : -1) + SEXES.length) % SEXES.length;
              setSex(SEXES[next]);
              tabs.current[next]?.focus();
            }}>{t(value)}</button>
        ))}
      </div>
      {SEXES.map((value, index) => (
        <div key={value} id={`${id}-panel-${index}`} role="tabpanel" aria-labelledby={`${id}-tab-${index}`} hidden={sex !== value}>
          {sex === value && (
            <div className="home-dating-grid" aria-busy={!results[value]}>
              {DATING_AGES.map((age, slotIndex) => {
                const slot = results[value]?.[slotIndex];
                const p = slot?.pick;
                return (
                  <div key={age.label} className="home-dating-slot" data-testid="company-dating-age-slot">
                    <h3 className="meta">{t(age.label)}</h3>
                    {p ? (
                      <button type="button" className="home-dating-pick" data-testid="company-dating-pick"
                        disabled={busy} aria-busy={busy} onClick={() => void start(p.uuid)}>
                        <Avatar uuid={p.uuid} sex={p.sex} age={p.age} size={44} radius={10} />
                        <span className="home-dating-copy">
                          <b>{p.name} · {t("{age}세", { age: p.age })}</b>
                          <span className="meta">{p.occupation}</span>
                        </span>
                      </button>
                    ) : <p className="home-dating-status" role="status">{t(!slot ? "찾는 중..." : slot.status === "error" ? "추천을 불러오지 못했어요." : "이 나이대는 아직 소개할 분이 없어요.")}</p>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}
      {busy && <p className="home-dating-status" role="status">{t("연결하는 중...")}</p>}
      {error && <p className="chat-error" role="alert">{t("만남을 시작하지 못했어요. 다시 시도해주세요.")}</p>}
    </div>
  );
}
