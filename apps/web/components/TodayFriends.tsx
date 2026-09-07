"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { apiPost, chatFeatures, LoginRequiredError } from "../lib/api";
import Avatar from "./Avatar";
import LoginSheet from "./LoginSheet";

export default function TodayFriends() {
  const router = useRouter();
  const [available, setAvailable] = useState(false);
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const [error, setError] = useState("");
  const [login, setLogin] = useState(false);
  useEffect(() => {
    let alive = true;
    chatFeatures().then((f) => { if (alive) setAvailable(f.groupChat); });
    return () => { alive = false; };
  }, []);
  if (!available) return null;

  const start = async () => {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      const c = await apiPost<{ id: string }>("/conversations/today-friends");
      router.push(`/chat/${c.id}`);
    } catch (e) {
      if (e instanceof LoginRequiredError) setLogin(true);
      else setError("친구들을 만나지 못했어요. 잠시 후 다시 시도해주세요.");
      pending.current = false;
      setBusy(false);
    }
  };

  return (
    <section className="today-friends">
      <button className="today-friends-button" onClick={start} disabled={busy}>
        <span className="chat-faces" aria-hidden>
          <Avatar uuid="today-friend-young" sex="남자" age={26} size={38} />
          <Avatar uuid="today-friend-older" sex="여자" age={68} size={38} />
        </span>
        <span className="today-friends-copy">
          <b>{busy ? "친구들을 부르고 있어요…" : "오늘의 친구 2명과 같이 놀기"}</b>
          <span className="meta">나이는 달라도, 수다는 함께. 나까지 셋이서!</span>
        </span>
        <span aria-hidden>→</span>
      </button>
      {error && <p className="chat-error" role="alert">{error}</p>}
      {login && <LoginSheet onClose={() => setLogin(false)} />}
    </section>
  );
}
