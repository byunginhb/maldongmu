"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { PersonaCard as Card } from "@maldongmu/shared";
import { apiGet, streamChat, streamGreeting, LoginRequiredError, QuotaExceededError } from "../../../lib/api";
import Avatar from "../../../components/Avatar";
import LoginSheet from "../../../components/LoginSheet";
import QuotaSheet from "../../../components/QuotaSheet";

interface Msg {
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
}

interface ConvRes {
  id: string;
  persona: Card;
  messages: { role: "user" | "assistant"; content: string }[];
}

export default function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [persona, setPersona] = useState<Card | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [showQuota, setShowQuota] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const greetedRef = useRef(false);

  /** 첫 만남: 페르소나가 먼저 인사를 건넨다 */
  const runGreeting = useCallback(async () => {
    setBusy(true);
    setMsgs([{ role: "assistant", content: "", streaming: true }]);
    try {
      await streamGreeting(id, (delta) => {
        setMsgs((m) => {
          const copy = [...m];
          const last = copy[copy.length - 1];
          copy[copy.length - 1] = { ...last, content: last.content + delta };
          return copy;
        });
      });
      setMsgs((m) => {
        const copy = [...m];
        copy[copy.length - 1] = { ...copy[copy.length - 1], streaming: false };
        return copy;
      });
    } catch {
      setMsgs([]); // 실패·중복(409) 시 기존 빈 화면으로 — 사용자가 먼저 말 걸면 됨
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  }, [id]);

  useEffect(() => {
    apiGet<ConvRes>(`/conversations/${id}`)
      .then((c) => {
        setPersona(c.persona);
        setMsgs(c.messages.map((m) => ({ role: m.role, content: m.content })));
        if (c.messages.length === 0 && !greetedRef.current) {
          greetedRef.current = true; // StrictMode 이중 실행 가드
          runGreeting();
        }
      })
      .catch(() => router.replace("/"));
  }, [id, router, runGreeting]);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight });
  }, [msgs]);

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    setBusy(true);
    setMsgs((m) => [...m, { role: "user", content: text }, { role: "assistant", content: "", streaming: true }]);
    try {
      await streamChat(id, text, (delta) => {
        setMsgs((m) => {
          const copy = [...m];
          const last = copy[copy.length - 1];
          copy[copy.length - 1] = { ...last, content: last.content + delta };
          return copy;
        });
      });
      setMsgs((m) => {
        const copy = [...m];
        copy[copy.length - 1] = { ...copy[copy.length - 1], streaming: false };
        return copy;
      });
    } catch (e) {
      if (e instanceof LoginRequiredError || e instanceof QuotaExceededError) {
        // 보낸 메시지와 빈 말풍선을 되돌리고 안내 시트 표시
        setMsgs((m) => m.slice(0, -2));
        setInput(text);
        if (e instanceof QuotaExceededError) setShowQuota(true);
        else setShowLogin(true);
      } else {
        setMsgs((m) => {
          const copy = [...m];
          copy[copy.length - 1] = {
            role: "assistant",
            content: copy[copy.length - 1].content || "죄송해요, 답을 하지 못했어요. 다시 한번 말씀해주시겠어요?",
            streaming: false,
          };
          return copy;
        });
      }
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  };

  return (
    <div className="chat-page">
      <header className="chat-head">
        <button
          onClick={() => router.push("/me")}
          style={{ background: "none", border: "none", fontSize: 18, color: "var(--brown)", padding: "4px 6px" }}
          aria-label="뒤로"
        >
          ←
        </button>
        {persona && (
          <>
            <Avatar uuid={persona.uuid} sex={persona.sex} age={persona.age} size={36} radius={10} />
            <div style={{ minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 600, lineHeight: 1.3 }}>{persona.name}</p>
              <p className="meta" style={{ margin: 0, fontSize: 12, lineHeight: 1.3 }}>
                {persona.age}세 · {persona.occupation}
              </p>
            </div>
          </>
        )}
      </header>

      <div className="chat-body" ref={bodyRef}>
        {msgs.length > 0 && msgs.length <= 2 && (
          <p className="meta" style={{ textAlign: "center", fontSize: 11, margin: "0 0 4px" }}>
            말동무의 인물들은 한국의 실제 데이터를 기반으로 만들어진 페르소나예요
          </p>
        )}
        {msgs.length === 0 && persona && (
          <p className="empty">
            {persona.name}님이 기다리고 있어요.
            <br />
            먼저 인사를 건네볼까요?
            <br />
            <span style={{ fontSize: 12, opacity: 0.8 }}>
              (말동무의 인물들은 한국의 실제 데이터를 기반으로 만들어진 페르소나예요)
            </span>
          </p>
        )}
        {msgs.map((m, i) =>
          m.role === "user" ? (
            <div key={i} className="bubble user">{m.content}</div>
          ) : (
            <div key={i} className="bubble-row">
              {persona && (
                <span className="bubble-avatar">
                  <Avatar uuid={persona.uuid} sex={persona.sex} age={persona.age} size={28} radius={8} />
                </span>
              )}
              <div className="bubble persona">
                {m.content}
                {m.streaming && <span className="cursor-blink">▮</span>}
              </div>
            </div>
          ),
        )}
      </div>

      <div className="chat-input-row">
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.nativeEvent.isComposing) send();
          }}
          placeholder="메시지를 입력해주세요"
          maxLength={2000}
        />
        <button className="chat-send" onClick={send} disabled={busy || !input.trim()} aria-label="보내기">
          ↑
        </button>
      </div>

      {showLogin && <LoginSheet onClose={() => setShowLogin(false)} />}
      {showQuota && <QuotaSheet onClose={() => setShowQuota(false)} />}
    </div>
  );
}
