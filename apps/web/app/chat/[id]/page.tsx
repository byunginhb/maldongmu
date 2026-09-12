"use client";

import { use, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { PersonaCard as Card, ChatStreamEvent } from "@maldongmu/shared";
import { apiGet, apiPost, chatFeatures, streamChat, fetchGreeting, LoginRequiredError, QuotaExceededError,
  type ConversationSnapshot, type ConversationMessage } from "../../../lib/api";
import Avatar from "../../../components/Avatar";
import LoginSheet from "../../../components/LoginSheet";
import QuotaSheet from "../../../components/QuotaSheet";
import FriendPicker from "../../../components/FriendPicker";
import AffectionMeter from "../../../components/AffectionMeter";

interface Msg extends ConversationMessage { streaming?: boolean }
interface Affection { score: number; change: number; note: string }
// 첫 만남의 첫인상 (서버 AFFECTION.start와 동일). 아직 심판 결과가 없을 때 표시
const FIRST_IMPRESSION: Affection = { score: 25, change: 0, note: "첫 만남이에요. 편하게 말을 건네보세요." };
const TOPICS = ["오늘 있었던 소소한 일", "평생 한 가지 음식만 먹는다면?", "요즘 나를 웃게 하는 것"];

export default function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <ChatRoom key={id} id={id} />;
}

function ChatRoom({ id }: { id: string }) {
  const router = useRouter();
  const [participants, setParticipants] = useState<Card[]>([]);
  const [mode, setMode] = useState<ConversationSnapshot["mode"]>(null);
  const [affection, setAffection] = useState<Affection>(FIRST_IMPRESSION);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [groupEnabled, setGroupEnabled] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [showQuota, setShowQuota] = useState(false);
  const [error, setError] = useState("");
  const [turn, setTurn] = useState(0);
  const bodyRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const active = useRef<{ controller: AbortController; finished: Promise<void> } | null>(null);
  const transition = useRef(false);
  const mounted = useRef(true);
  const nearBottom = useRef(true);
  const isGroup = participants.length === 2;
  const isDating = mode === "dating";
  const persona = participants[0];

  const applySnapshot = (c: ConversationSnapshot) => {
    setParticipants(c.personas ?? [c.persona]);
    setMode(c.mode ?? null);
    setMsgs(c.messages);
    // 새로고침해도 마지막 호감도부터 이어서 (변화량은 다시 띄우지 않음)
    const judged = [...c.messages].reverse().find((m) => typeof m.affection === "number");
    if (judged) setAffection({ score: judged.affection!, change: 0, note: judged.affectionNote ?? "" });
  };

  useEffect(() => {
    mounted.current = true;
    let alive = true;
    chatFeatures().then((f) => { if (alive) setGroupEnabled(f.groupChat); });
    (async () => {
      try {
        let c = await apiGet<ConversationSnapshot>(`/conversations/${id}`);
        if (!alive) return;
        if (!c.messages.length) {
          try {
            const greeting = await fetchGreeting(id, navigator.language);
            c = { ...c, messages: greeting.messages ?? [{ role: "assistant", content: greeting.greeting }] };
          } catch {
            c = await apiGet<ConversationSnapshot>(`/conversations/${id}`);
          }
        }
        if (alive) applySnapshot(c);
      } catch {
        if (alive) setError("대화를 불러오지 못했어요. 새로고침해 다시 연결해주세요.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; mounted.current = false; active.current?.controller.abort(); };
  }, [id]);

  useEffect(() => {
    if (nearBottom.current) bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight });
  }, [msgs]);

  const interrupt = async () => {
    const job = active.current;
    job?.controller.abort();
    // The acknowledgement includes partial bubbles and releases the server generation lock.
    const [c] = await Promise.all([
      apiPost<ConversationSnapshot>(`/chat/${id}/stop`),
      job?.finished,
    ]);
    if (mounted.current) applySnapshot(c);
  };

  const stop = async () => {
    if (transition.current) return;
    transition.current = true;
    setStopping(true);
    try { await interrupt(); }
    catch { setError("대화가 멈췄는지 확인하지 못했어요. 잠시 후 다시 시도해주세요."); }
    finally {
      transition.current = false;
      setStopping(false);
      inputRef.current?.focus();
    }
  };

  const send = async (suggestion?: string) => {
    const text = (suggestion ?? input).trim();
    if (!text || loading || transition.current || (active.current && !isGroup)) return;
    transition.current = true;
    if (active.current) {
      setStopping(true);
      try { await interrupt(); }
      catch {
        setError("아직 대화가 멈추지 않았어요. 잠시 후 다시 보내주세요.");
        transition.current = false;
        setStopping(false);
        return;
      }
      setStopping(false);
    }
    if (!mounted.current) return;
    setInput("");
    setError("");
    setBusy(true);
    setTurn(0);
    nearBottom.current = true;
    const controller = new AbortController();
    setMsgs((m) => [...m, { role: "user", content: text }, ...(!isGroup ? [{ role: "assistant" as const, content: "", streaming: true }] : [])]);
    const onEvent = (event: ChatStreamEvent) => {
      if (!mounted.current || controller.signal.aborted) return;
      if (event.type === "speaker") {
        setTurn(event.turn);
        setMsgs((m) => [...m, { id: event.messageId, role: "assistant", speakerUuid: event.speakerUuid, content: "", streaming: true }]);
      } else if (event.type === "messageEnd") {
        setMsgs((m) => m.map((message) => ({ ...message, streaming: false })));
      } else if (event.type === "affection") {
        setAffection({ score: event.score, change: event.change, note: event.note });
      }
    };
    const finished = (async () => {
      try {
        await streamChat(id, text, (delta) => {
          if (!mounted.current || controller.signal.aborted) return;
          setMsgs((m) => m.map((message, i) => i === m.length - 1 && message.role === "assistant"
            ? { ...message, content: message.content + delta } : message));
        }, { signal: controller.signal, onEvent });
      } catch (e) {
        if (!controller.signal.aborted && mounted.current) {
          if (e instanceof LoginRequiredError) { setShowLogin(true); setInput(text); }
          else if (e instanceof QuotaExceededError) { setShowQuota(true); setInput(text); }
          else setError(e instanceof Error ? e.message : "연결을 잠시 쉬고 있어요. 다시 이야기해주세요.");
          try {
            const c = await apiGet<ConversationSnapshot>(`/conversations/${id}`);
            if (mounted.current && !controller.signal.aborted) applySnapshot(c);
          } catch { /* Preserve visible messages if reconnecting fails. */ }
        }
      } finally {
        if (active.current?.controller === controller) active.current = null;
        if (mounted.current) {
          setMsgs((m) => m.filter((message) => message.content).map((message) => ({ ...message, streaming: false })));
          setBusy(false);
        }
      }
    })();
    active.current = { controller, finished };
    transition.current = false;
    await finished;
  };

  return (
    <div className="chat-page">
      <header className="chat-head">
        <button className="chat-back" onClick={() => router.push("/me")} aria-label="이웃 수첩으로">←</button>
        <div className="chat-faces">
          {participants.map((p) => <Avatar key={p.uuid} uuid={p.uuid} sex={p.sex} age={p.age} size={isGroup ? 30 : 36} radius={10} />)}
        </div>
        <div className="chat-heading">
          <p>{participants.map((p) => p.name).join(" · ") || "대화 불러오는 중"}</p>
          <span className="meta">{isGroup ? "나까지 셋이서 수다" : persona ? `${isDating ? "가상 연애 · " : ""}${persona.age}세 · ${persona.occupation}` : "잠시만 기다려주세요"}</span>
        </div>
        {!isGroup && !isDating && persona && groupEnabled && <button className="btn-ghost invite-friend" disabled={busy || loading} onClick={() => setShowPicker(true)}>+ 친구 초대</button>}
      </header>
      {isGroup && <p className="group-chat-guide">친구들이 짧게 이야기한 뒤 기다려요. 언제든 끼어들어도 좋아요.</p>}
      <div className="chat-body" ref={bodyRef} role="log" aria-label="대화 내용" aria-live="off"
        onScroll={(e) => { const el = e.currentTarget; nearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 100; }}>
        {loading && <p className="empty">대화를 불러오고 있어요…</p>}
        {msgs.length > 0 && msgs.length <= 2 && <p className="meta chat-disclosure">말동무의 친구들은 AI 페르소나예요</p>}
        {!loading && !msgs.length && persona && <p className="empty">{persona.name}님이 기다리고 있어요.<br />먼저 인사를 건네볼까요?</p>}
        {msgs.map((m, i) => {
          const speaker = participants.find((p) => p.uuid === m.speakerUuid) ?? persona;
          return m.role === "user"
            ? <div key={m.id ?? `local-${i}`} className="bubble user">{m.content}</div>
            : <div key={m.id ?? `local-${i}`} className={`bubble-row ${isGroup && speaker?.uuid === participants[1]?.uuid ? "friend-two" : ""}`}>
                {speaker && <Avatar uuid={speaker.uuid} sex={speaker.sex} age={speaker.age} size={28} radius={8} />}
                <div className="speaker-message">
                  {isGroup && <span className="speaker-name">{speaker?.name}</span>}
                  <div className="bubble persona">{m.content || (m.streaming ? "…" : "")}{m.streaming && <span className="cursor-blink" aria-hidden>▮</span>}</div>
                </div>
              </div>;
        })}
        {isGroup && !loading && !msgs.some((m) => m.role === "user") && <div className="group-topic-list">
          <p className="meta">이런 이야기로 시작해볼까요?</p>
          {TOPICS.map((topic) => <button key={topic} className="chip" disabled={busy} onClick={() => send(topic)}>{topic}</button>)}
        </div>}
      </div>
      {error && <div className="chat-error" role="alert">{error}</div>}
      {isGroup && !loading && <div className="group-turn-status">
        <span className="meta" role="status">{stopping ? "친구들이 말을 멈추고 있어요…" : busy ? `친구들이 이야기 중이에요${turn ? ` · ${turn}/4` : ""}` : "이제 당신 이야기를 들려주세요"}</span>
        {busy && <button className="btn-ghost" onClick={stop} disabled={stopping}>나도 한마디</button>}
      </div>}
      {isDating && !loading && <AffectionMeter score={affection.score} change={affection.change} note={affection.note} />}
      <form className="chat-input-row" onSubmit={(e) => { e.preventDefault(); send(); }}>
        <input ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && e.nativeEvent.isComposing) e.preventDefault(); }}
          aria-label="메시지" placeholder={isGroup && busy ? "한마디 보내고 대화에 끼어들기" : "메시지를 입력해주세요"}
          maxLength={2000} disabled={loading || !persona} />
        <button type="submit" className="chat-send" disabled={loading || stopping || (!isGroup && busy) || !input.trim() || !persona} aria-label={busy && isGroup ? "끼어들어 보내기" : "보내기"}>↑</button>
      </form>
      {showPicker && persona && <FriendPicker conversationId={id} currentUuid={persona.uuid}
        onClose={() => setShowPicker(false)} onAdded={(c) => { applySnapshot(c); setShowPicker(false); nearBottom.current = true; }} />}
      {showLogin && <LoginSheet onClose={() => setShowLogin(false)} />}
      {showQuota && <QuotaSheet onClose={() => setShowQuota(false)} />}
    </div>
  );
}
