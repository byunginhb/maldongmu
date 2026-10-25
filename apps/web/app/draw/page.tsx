"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { apiGet, apiPost, LoginRequiredError } from "../../lib/api";
import { createNeighborDraw, type DrawNeighbor } from "../../lib/neighbor-draw";
import Avatar from "../../components/Avatar";
import LoginSheet from "../../components/LoginSheet";
import { useT } from "../../components/LangProvider";

const FACES = [
  { uuid: "hero-haenyeo", sex: "여자", age: 68 },
  { uuid: "hero-welder", sex: "남자", age: 34 },
  { uuid: "hero-poet", sex: "여자", age: 27 },
];

export default function DrawPage() {
  const { t } = useT();
  const router = useRouter();
  const controller = useRef<ReturnType<typeof createNeighborDraw> | null>(null);
  if (!controller.current) controller.current = createNeighborDraw(() => apiGet<unknown>("/personas/random"));
  const actionLock = useRef(false);
  const [person, setPerson] = useState<DrawNeighbor | null>(null);
  const [busy, setBusy] = useState<"draw" | "chat" | null>(null);
  const [error, setError] = useState("");
  const [showLogin, setShowLogin] = useState(false);

  const draw = async () => {
    if (actionLock.current) return;
    actionLock.current = true;
    setBusy("draw");
    setError("");
    try {
      setPerson(await controller.current!.draw());
    } catch (e) {
      if (e instanceof LoginRequiredError) setShowLogin(true);
      else setError(t("이웃을 뽑지 못했어요. 다시 눌러주세요."));
    } finally {
      actionLock.current = false;
      setBusy(null);
    }
  };

  const chat = async () => {
    if (actionLock.current || !person) return;
    actionLock.current = true;
    setBusy("chat");
    setError("");
    try {
      const res = await apiPost<{ id: string }>("/conversations", { personaUuid: person.uuid });
      if (typeof res.id !== "string" || !res.id.trim()) throw new Error("Invalid conversation");
      router.push(`/chat/${encodeURIComponent(res.id)}`);
      // 성공한 이동이 끝날 때까지 잠금을 유지한다.
    } catch (e) {
      if (e instanceof LoginRequiredError) setShowLogin(true);
      else setError(t("대화를 시작하지 못했어요. 잠시 후 다시 눌러주세요."));
      actionLock.current = false;
      setBusy(null);
    }
  };

  return (
    <main className="page company-draw">
      <h1 className="dot-title" data-testid="company-draw-title">{t("100만 명 중 딱 한 명")}</h1>
      <p className="company-draw-description">{t("어떤 이웃을 만날지는 눌러봐야 알아요")}</p>
      {person ? (
        <section className="company-draw-result" data-testid="company-draw-result" aria-label={t("뽑은 이웃")} aria-live="polite">
          <Avatar uuid={person.uuid} sex={person.sex} age={person.age} size={96} radius={16} loading="eager" />
          <h2>{person.name}</h2>
          <p>{t("{age}세", { age: person.age })} · {person.occupation}</p>
          <p className="meta">{person.province}</p>
          <p>{person.oneLiner}</p>
        </section>
      ) : (
        <div className="company-draw-stage" data-testid="company-draw-stage" aria-hidden="true">
          {FACES.map((face) => <span key={face.uuid}><Avatar {...face} size={72} radius={16} loading="eager" /></span>)}
        </div>
      )}
      <div className="company-draw-actions">
        {person ? (
          <>
            <button type="button" className="btn-cta" data-testid="company-draw-chat" onClick={chat} disabled={busy !== null} aria-busy={busy === "chat"}>{t("이 분과 대화하기")}</button>
            <button type="button" className="btn-ghost" data-testid="company-draw-again" onClick={draw} disabled={busy !== null} aria-busy={busy === "draw"}>{t("다시 뽑기")}</button>
          </>
        ) : (
          <button type="button" className="btn-cta" data-testid="company-draw-button" onClick={draw} disabled={busy !== null} aria-busy={busy === "draw"}>{t("뽑기")}</button>
        )}
      </div>
      {busy && <p className="meta" role="status">{t(busy === "draw" ? "이웃을 뽑고 있어요…" : "이웃과 대화를 연결하고 있어요…")}</p>}
      {error && <p className="company-draw-error" role="alert">{error}</p>}
      {showLogin && <LoginSheet onClose={() => setShowLogin(false)} />}
    </main>
  );
}
