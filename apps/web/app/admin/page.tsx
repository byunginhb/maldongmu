"use client";

import { useCallback, useEffect, useState } from "react";
import type { PersonaCard as Card } from "@maldongmu/shared";
import { adminGet, getAdminKey, setAdminKey } from "../../lib/api";
import Avatar from "../../components/Avatar";

interface Stats {
  totals: { users: number; conversations: number; messages: number; tokens: number };
  daily: { date: string; activeUsers: number; conversations: number; messages: number; tokens: number }[];
}
interface UserRow {
  id: string;
  type: string;
  nickname: string | null;
  email: string | null;
  createdAt: string;
  conversations: number;
  messages: number;
  tokens: number;
}
interface UserConv {
  id: string;
  personaUuid: string;
  title: string;
  createdAt: string;
  lastMessageAt: string;
  personaName: string;
  personaAge: number;
  personaSex: string;
  personaOccupation: string;
  messageCount: number;
  tokens: number;
}
interface UserDetail {
  user: { id: string; type: string; nickname: string | null; email: string | null; createdAt: string };
  conversations: UserConv[];
}
interface ConvDetail {
  id: string;
  userId: string;
  personaUuid: string;
  personaName: string;
  personaAge: number;
  personaSex: string;
  messages: { id: string; role: string; content: string; tokensIn: number; tokensOut: number; createdAt: string }[];
}

const n = (v: number | null | undefined) => (v ?? 0).toLocaleString("ko-KR");

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [keyInput, setKeyInput] = useState("");
  const [error, setError] = useState("");
  const [stats, setStats] = useState<Stats | null>(null);
  const [ranking, setRanking] = useState<(Card & { chats: number })[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [userDetail, setUserDetail] = useState<UserDetail | null>(null);
  const [convDetail, setConvDetail] = useState<ConvDetail | null>(null);

  const openUser = async (id: string) => {
    setConvDetail(null);
    setUserDetail(await adminGet<UserDetail>(`/users/${encodeURIComponent(id)}`));
  };
  const openConv = async (id: string) => {
    setConvDetail(await adminGet<ConvDetail>(`/conversations/${id}`));
  };

  const loadAll = useCallback(async () => {
    try {
      const [s, r, u] = await Promise.all([
        adminGet<Stats>("/stats?days=14"),
        adminGet<(Card & { chats: number })[]>("/personas/ranking?days=7"),
        adminGet<UserRow[]>("/users?page=1"),
      ]);
      setStats(s);
      setRanking(r);
      setUsers(u);
      setAuthed(true);
      setError("");
    } catch (e: any) {
      setAuthed(false);
      if (e.message === "BAD_ADMIN_KEY") setError("비밀번호가 맞지 않아요.");
    }
  }, []);

  useEffect(() => {
    if (getAdminKey()) loadAll();
  }, [loadAll]);

  if (!authed) {
    return (
      <main className="page" style={{ maxWidth: 400 }}>
        <h1 className="dot-title">관리자</h1>
        <p className="meta" style={{ margin: "0 0 16px" }}>관리자 비밀번호를 입력해주세요.</p>
        <div className="search-box" style={{ marginBottom: 12 }}>
          <input
            type="password"
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && keyInput) {
                setAdminKey(keyInput);
                loadAll();
              }
            }}
            placeholder="비밀번호"
          />
        </div>
        {error && <p style={{ color: "var(--red)", fontSize: 13, margin: "0 0 12px" }}>{error}</p>}
        <button
          className="btn-cta"
          onClick={() => {
            setAdminKey(keyInput);
            loadAll();
          }}
          disabled={!keyInput}
        >
          들어가기
        </button>
      </main>
    );
  }

  const maxMsg = Math.max(1, ...(stats?.daily.map((d) => d.messages) ?? [1]));

  return (
    <main className="page" style={{ maxWidth: 800 }}>
      <h1 className="dot-title">말동무 관리자</h1>
      <p className="meta" style={{ margin: "0 0 20px" }}>최근 14일 기준</p>

      {stats && (
        <div className="stat-grid" style={{ marginBottom: 28 }}>
          <div className="stat-card"><span className="meta">사용자</span><b>{n(stats.totals.users)}</b></div>
          <div className="stat-card"><span className="meta">대화</span><b>{n(stats.totals.conversations)}</b></div>
          <div className="stat-card"><span className="meta">메시지</span><b>{n(stats.totals.messages)}</b></div>
          <div className="stat-card"><span className="meta">토큰</span><b>{n(stats.totals.tokens)}</b></div>
        </div>
      )}

      <h2 className="dot-title" style={{ marginBottom: 12 }}>일별 추이</h2>
      <div style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 16, padding: 16, marginBottom: 28 }}>
        {stats?.daily.length === 0 && <p className="empty" style={{ padding: "16px 0" }}>아직 데이터가 없어요.</p>}
        {stats?.daily.map((d) => (
          <div key={d.date} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <span className="meta" style={{ width: 78, flexShrink: 0 }}>{d.date.slice(5)}</span>
            <div style={{ flex: 1, background: "var(--sand)", borderRadius: 4, height: 14 }}>
              <div
                style={{
                  width: `${(d.messages / maxMsg) * 100}%`,
                  background: "var(--coral)",
                  height: "100%",
                  borderRadius: 4,
                }}
              />
            </div>
            <span className="meta" style={{ width: 150, flexShrink: 0, textAlign: "right" }}>
              메시지 {n(d.messages)} · DAU {n(d.activeUsers)}
            </span>
          </div>
        ))}
      </div>

      <h2 className="dot-title" style={{ marginBottom: 12 }}>인기 페르소나 (7일)</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 28 }}>
        {ranking.length === 0 && <p className="empty" style={{ padding: "8px 0" }}>아직 대화 기록이 없어요.</p>}
        {ranking.map((p, i) => (
          <div key={p.uuid} className="card" style={{ padding: "10px 14px", alignItems: "center" }}>
            <b style={{ width: 24, color: i < 3 ? "var(--coral)" : "var(--brown-soft)" }}>{i + 1}</b>
            <Avatar uuid={p.uuid} sex={p.sex} age={p.age} size={36} radius={10} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p className="card-name">{p.name}</p>
              <p className="card-meta">{p.occupation} · {p.province}</p>
            </div>
            <span className="meta">대화 {n(p.chats)}회</span>
          </div>
        ))}
      </div>

      <h2 className="dot-title" style={{ marginBottom: 12 }}>사용자</h2>
      <p className="meta" style={{ margin: "0 0 8px" }}>행을 누르면 대화 내역을 볼 수 있어요.</p>
      <div style={{ overflowX: "auto" }}>
        <table className="admin-table">
          <thead>
            <tr><th>ID</th><th>유형</th><th>닉네임</th><th>대화방</th><th>메시지</th><th>토큰</th><th>가입일</th></tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr
                key={u.id}
                onClick={() => openUser(u.id)}
                style={{ cursor: "pointer", background: userDetail?.user?.id === u.id ? "var(--sand)" : undefined }}
              >
                <td style={{ maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis" }}>{u.id}</td>
                <td>{u.type}</td>
                <td>{u.nickname || u.email || "-"}</td>
                <td>{n(u.conversations)}</td>
                <td>{n(u.messages)}</td>
                <td>{n(u.tokens)}</td>
                <td>{u.createdAt?.slice(0, 10)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {userDetail && (
        <section style={{ marginTop: 28 }}>
          <h2 className="dot-title" style={{ marginBottom: 4 }}>
            {userDetail.user?.nickname || userDetail.user?.id} 님의 대화방
          </h2>
          <p className="meta" style={{ margin: "0 0 12px" }}>
            {userDetail.user?.type} · 가입 {userDetail.user?.createdAt?.slice(0, 10)} · 대화방 {userDetail.conversations.length}개
          </p>
          {userDetail.conversations.length === 0 && (
            <p className="empty" style={{ padding: "12px 0" }}>아직 대화가 없어요.</p>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {userDetail.conversations.map((c) => (
              <button
                key={c.id}
                onClick={() => openConv(c.id)}
                className="card"
                style={{
                  padding: "10px 14px",
                  alignItems: "center",
                  width: "100%",
                  textAlign: "left",
                  cursor: "pointer",
                  borderColor: convDetail?.id === c.id ? "var(--coral)" : undefined,
                }}
              >
                <Avatar uuid={c.personaUuid} sex={c.personaSex} age={c.personaAge} size={36} radius={10} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p className="card-name">{c.personaName ?? "(삭제된 페르소나)"}</p>
                  <p className="card-meta">{c.personaOccupation} · 시작 {c.createdAt?.slice(0, 16)}</p>
                </div>
                <span className="meta" style={{ flexShrink: 0 }}>
                  메시지 {n(c.messageCount)} · 토큰 {n(c.tokens)}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {convDetail && (
        <section style={{ marginTop: 28 }}>
          <h2 className="dot-title" style={{ marginBottom: 4 }}>
            {convDetail.personaName}님과의 대화 내용
          </h2>
          <p className="meta" style={{ margin: "0 0 12px" }}>
            대화 ID {convDetail.id} · 메시지 {convDetail.messages.length}개
          </p>
          <div
            style={{
              background: "var(--paper)",
              border: "1px solid var(--line)",
              borderRadius: 16,
              padding: 16,
              display: "flex",
              flexDirection: "column",
              gap: 8,
              maxHeight: 480,
              overflowY: "auto",
            }}
          >
            {convDetail.messages.map((m) => (
              <div
                key={m.id}
                className={`bubble ${m.role === "user" ? "user" : "persona"}`}
                style={{ alignSelf: m.role === "user" ? "flex-end" : "flex-start" }}
              >
                {m.content}
                <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4 }}>
                  {m.createdAt?.slice(5, 16)}
                  {m.role === "assistant" && (m.tokensIn || m.tokensOut) ? ` · ${n(m.tokensIn + m.tokensOut)} tok` : ""}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
