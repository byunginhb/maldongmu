"use client";

import { useEffect, useRef, useState } from "react";
import type { PersonaCard } from "@maldongmu/shared";
import { apiGet, apiPost, type ConversationSnapshot } from "../lib/api";
import Avatar from "./Avatar";

export default function FriendPicker({ conversationId, currentUuid, onAdded, onClose }: {
  conversationId: string;
  currentUuid: string;
  onAdded: (conversation: ConversationSnapshot) => void;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<PersonaCard[]>([]);
  const [selected, setSelected] = useState<PersonaCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const addingRef = useRef(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { dialog.current?.showModal(); }, []);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError("");
    const timer = setTimeout(async () => {
      try {
        const result = query.trim()
          ? await apiGet<{ items: PersonaCard[] }>(`/personas/search?${new URLSearchParams({ q: query.trim(), limit: "12", page: String(page) })}`)
          : { items: await apiGet<PersonaCard[]>("/personas/featured") };
        if (!alive) return;
        setItems(result.items.filter((p) => p.uuid !== currentUuid));
        setHasMore(!!query.trim() && result.items.length === 12);
      } catch {
        if (alive) setError("친구 목록을 불러오지 못했어요. 검색어를 바꾸거나 다시 열어주세요.");
      } finally {
        if (alive) setLoading(false);
      }
    }, 300);
    return () => { alive = false; clearTimeout(timer); };
  }, [query, page, currentUuid]);

  const add = async () => {
    if (!selected || addingRef.current) return;
    addingRef.current = true;
    setAdding(true);
    setError("");
    try {
      onAdded(await apiPost<ConversationSnapshot>(`/conversations/${conversationId}/friend`, { personaUuid: selected.uuid }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "초대하지 못했어요. 다시 시도해주세요.");
    } finally {
      addingRef.current = false;
      setAdding(false);
    }
  };

  return (
    <dialog ref={dialog} className="friend-dialog" aria-labelledby="friend-picker-title"
      onCancel={(e) => { e.preventDefault(); if (!adding) onClose(); }}>
      <div className="friend-picker-head">
        <div>
          <h2 id="friend-picker-title" className="dot-title">같이 놀 친구 한 명</h2>
          <p className="meta">나이 상관없이, 마음 가는 친구를 골라주세요.</p>
        </div>
        <button className="btn-ghost" onClick={onClose} disabled={adding} aria-label="친구 선택 닫기">닫기</button>
      </div>
      <label className="search-box">
        <input autoFocus value={query} disabled={adding} maxLength={80} aria-label="함께할 친구 검색"
          placeholder="이름, 직업, 취미로 찾아보기"
          onChange={(e) => { setQuery(e.target.value); setPage(1); setSelected(null); }} />
      </label>
      <div className="friend-picker-list" aria-busy={loading}>
        {loading ? <p className="empty">친구를 찾고 있어요…</p> : items.map((p) => (
          <button key={p.uuid} className={`friend-option ${selected?.uuid === p.uuid ? "selected" : ""}`}
            disabled={adding} aria-pressed={selected?.uuid === p.uuid} onClick={() => setSelected(p)}>
            <Avatar uuid={p.uuid} sex={p.sex} age={p.age} size={44} />
            <span><b>{p.name} · {p.age}세</b><span className="meta">{p.occupation} · {p.province}</span>
              <span className="friend-intro">{p.oneLiner}</span></span>
            <span aria-hidden>{selected?.uuid === p.uuid ? "✓" : "+"}</span>
          </button>
        ))}
        {!loading && !items.length && !error && <p className="empty">검색어를 바꿔볼까요?</p>}
      </div>
      {(page > 1 || hasMore) && <div className="friend-pagination">
        <button className="btn-ghost" disabled={page === 1 || loading || adding} onClick={() => { setPage(page - 1); setSelected(null); }}>이전</button>
        <span className="meta">{page}쪽</span>
        <button className="btn-ghost" disabled={!hasMore || loading || adding} onClick={() => { setPage(page + 1); setSelected(null); }}>다음</button>
      </div>}
      {error && <p className="chat-error" role="alert">{error}</p>}
      <p className="meta friend-invite-note">초대하면 지금까지 나눈 이야기를 함께 이어가요. 친구는 두 명까지 함께할 수 있어요.</p>
      <button className="btn-cta" disabled={!selected || adding || loading} onClick={add}>
        {adding ? "초대하는 중…" : selected ? `${selected.name}님 초대하기` : "친구 한 명을 골라주세요"}
      </button>
    </dialog>
  );
}
