"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import type { PersonaCard as Card } from "@maldongmu/shared";
import { adminGet, adminPost, getAdminKey, setAdminKey } from "../../lib/api";
import Avatar from "../../components/Avatar";
import { stageOf } from "../../lib/affection";

interface Stats {
  totals: { users: number; conversations: number; messages: number; tokens: number };
  daily: { date: string; activeUsers: number; conversations: number; messages: number; tokens: number }[];
}
// 서버 시각은 UTC 'YYYY-MM-DD HH:MM:SS' → 한국 시간 'MM-DD HH:mm'
const kst = (s?: string | null) => {
  if (!s) return "";
  const d = new Date(s.replace(" ", "T") + "Z");
  if (Number.isNaN(d.getTime())) return s.slice(0, 16);
  return d.toLocaleString("sv-SE", { timeZone: "Asia/Seoul" }).slice(5, 16);
};

interface UserRow {
  id: string;
  type: string;
  nickname: string | null;
  email: string | null;
  createdAt: string;
  lastActiveAt: string | null;
  conversations: number;
  messages: number;
  tokens: number;
  interviewLimit?: number;
  interviewUsed?: number;
}
interface UserConv {
  id: string;
  personaUuid: string;
  title: string;
  mode?: "dating" | null;
  affection?: number | null;
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
  user: { id: string; type: string; nickname: string | null; email: string | null; createdAt: string; interviewLimit?: number; interviewUsed?: number };
  conversations: UserConv[];
}
interface Funnel {
  days: number;
  steps: { users: number; startedConversation: number; sent1: number; sent5: number; sent20: number; returned: number; loggedIn: number; dating: number };
  sources: { source: string; surface: string; users: number }[];
}

interface ReportRow {
  id: string;
  userId: string;
  conversationId: string;
  messageId: string;
  reason: string;
  detail: string | null;
  content: string;
  createdAt: string;
  type: string;
  nickname: string | null;
  email: string | null;
  personaName: string | null;
}

interface FeedbackRow {
  id: number;
  userId: string;
  content: string;
  createdAt: string;
  type: string;
  nickname: string | null;
  email: string | null;
  messageLimit: number | null;
  messagesUsed: number;
}
interface ConvDetail {
  id: string;
  userId: string;
  personaUuid: string;
  personaName: string;
  personaAge: number;
  personaSex: string;
  mode?: "dating" | null;
  messages: { id: string; role: string; content: string; tokensIn: number; tokensOut: number; createdAt: string; affection?: number | null; affectionNote?: string | null }[];
}

const n = (v: number | null | undefined) => (v ?? 0).toLocaleString("ko-KR");

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [keyInput, setKeyInput] = useState("");
  const [error, setError] = useState("");
  const [stats, setStats] = useState<Stats | null>(null);
  const [ranking, setRanking] = useState<(Card & { chats: number })[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [userPage, setUserPage] = useState(1);
  const [userTotal, setUserTotal] = useState(0);
  const [userDetail, setUserDetail] = useState<UserDetail | null>(null);
  const [convDetail, setConvDetail] = useState<ConvDetail | null>(null);
  const [feedback, setFeedback] = useState<FeedbackRow[]>([]);
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [funnel, setFunnel] = useState<Funnel | null>(null);
  const [limitInputs, setLimitInputs] = useState<Record<string, string>>({});
  const [userType, setUserType] = useState("");
  const [ivInputs, setIvInputs] = useState<Record<string, string>>({});

  const bumpLimit = async (userId: string) => {
    const v = Number(limitInputs[userId]);
    if (!v) return;
    await adminPost(`/users/${encodeURIComponent(userId)}/limit`, { limit: v });
    setFeedback(await adminGet<FeedbackRow[]>("/feedback"));
  };

  const bumpInterview = async (userId: string) => {
    const v = Number(ivInputs[userId]);
    if (Number.isNaN(v)) return;
    await adminPost(`/users/${encodeURIComponent(userId)}/interview-limit`, { limit: v });
    setUserDetail(await adminGet<UserDetail>(`/users/${encodeURIComponent(userId)}`));
    loadUsers(userPage, userType);
  };

  const openUser = async (id: string) => {
    setConvDetail(null);
    setUserDetail(await adminGet<UserDetail>(`/users/${encodeURIComponent(id)}`));
  };
  useEffect(() => {
    if (!convDetail) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setConvDetail(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [convDetail]);

  const openConv = async (id: string) => {
    setConvDetail(await adminGet<ConvDetail>(`/conversations/${id}`));
  };

  const loadUsers = useCallback(async (page: number, type: string) => {
    const u = await adminGet<{ rows: UserRow[]; total: number }>(`/users?page=${page}${type ? `&type=${type}` : ""}`);
    setUsers(u.rows);
    setUserTotal(u.total);
    setUserPage(page);
    setUserType(type);
  }, []);

  const loadAll = useCallback(async () => {
    try {
      const [s, r, u, f, rp, fn] = await Promise.all([
        adminGet<Stats>("/stats?days=14"),
        adminGet<(Card & { chats: number })[]>("/personas/ranking?days=7"),
        adminGet<{ rows: UserRow[]; total: number }>("/users?page=1"),
        adminGet<FeedbackRow[]>("/feedback"),
        adminGet<ReportRow[]>("/reports").catch(() => [] as ReportRow[]),
        adminGet<Funnel>("/funnel?days=14").catch(() => null),
      ]);
      setStats(s);
      setRanking(r);
      setUsers(u.rows);
      setUserTotal(u.total);
      setUserPage(1);
      setFeedback(f);
      setReports(rp);
      setFunnel(fn);
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
      <p className="meta" style={{ margin: "0 0 20px" }}>최근 14일 기준 · 한국 시간</p>

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

      <h2 className="dot-title" style={{ marginBottom: 12 }}>인기 페르소나 TOP 5 (7일)</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 28 }}>
        {ranking.length === 0 && <p className="empty" style={{ padding: "8px 0" }}>아직 대화 기록이 없어요.</p>}
        {ranking.slice(0, 5).map((p, i) => (
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

      {funnel && (() => {
        const s = funnel.steps;
        const pct = (v: number) => (s.users ? `${Math.round((v / s.users) * 1000) / 10}%` : "–");
        const rows: [string, number][] = [["방문(가입)", s.users], ["대화방 생성", s.startedConversation], ["첫 메시지", s.sent1],
          ["메시지 5+", s.sent5], ["메시지 20+", s.sent20], ["2일+ 재방문", s.returned], ["가상 연애 대화", s.dating], ["로그인", s.loggedIn]];
        return (
          <>
            <h2 className="dot-title" style={{ marginBottom: 4 }}>퍼널 (최근 {funnel.days}일 가입 코호트)</h2>
            <p className="meta" style={{ margin: "0 0 10px" }}>목표: 첫 메시지 35% · 재방문 20%</p>
            <div style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 16, padding: "6px 16px", marginBottom: 12 }}>
              {rows.map(([label, v]) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--line)", fontSize: 14 }}>
                  <span>{label}</span><span><b>{n(v)}</b> <span className="meta">{pct(v)}</span></span>
                </div>
              ))}
            </div>
            <p className="meta" style={{ margin: "0 0 6px" }}>유입 경로 (visit 이벤트, 사용자 수)</p>
            <div className="chip-wrap" style={{ marginBottom: 28 }}>
              {funnel.sources.length === 0 && <span className="meta">아직 없음</span>}
              {funnel.sources.map((x) => <span key={`${x.source}-${x.surface}`} className="chip" style={{ cursor: "default" }}>{x.source} · {x.surface} · {n(x.users)}</span>)}
            </div>
          </>
        );
      })()}

      <h2 className="dot-title" style={{ marginBottom: 12 }}>AI 답변 신고</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 28 }}>
        {reports.length === 0 && <p className="empty" style={{ padding: "8px 0" }}>접수된 신고가 없어요.</p>}
        {reports.map((r) => (
          <div key={r.id} style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 16, padding: "14px 16px" }}>
            <p className="meta" style={{ margin: "0 0 6px" }}>
              <b style={{ color: "var(--red)" }}>{r.reason}</b> · {r.personaName || "?"} · {r.nickname || r.email || r.userId} · {kst(r.createdAt)}
            </p>
            <p style={{ margin: "0 0 6px", fontSize: 14, whiteSpace: "pre-wrap" }}>{r.content}</p>
            {r.detail && <p className="meta" style={{ margin: 0 }}>메모: {r.detail}</p>}
            <button className="btn-ghost" style={{ height: 32, padding: "0 12px", marginTop: 8, fontSize: 12 }} onClick={() => openConv(r.conversationId)}>대화 전체 보기</button>
          </div>
        ))}
      </div>

      <h2 className="dot-title" style={{ marginBottom: 12 }}>피드백 · 한도 요청</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 28 }}>
        {feedback.length === 0 && <p className="empty" style={{ padding: "8px 0" }}>아직 피드백이 없어요.</p>}
        {feedback.map((f) => (
          <div key={f.id} style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 16, padding: "14px 16px" }}>
            <p className="meta" style={{ margin: "0 0 6px" }}>
              {f.nickname || f.email || f.userId} · {f.type} · 사용 {n(f.messagesUsed)}/{n(f.messageLimit ?? 100)} · {kst(f.createdAt)}
            </p>
            <p style={{ margin: "0 0 10px", fontSize: 14, whiteSpace: "pre-wrap" }}>{f.content}</p>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="number"
                placeholder={`새 한도 (현재 ${f.messageLimit ?? 100})`}
                value={limitInputs[f.userId] ?? ""}
                onChange={(e) => setLimitInputs((s) => ({ ...s, [f.userId]: e.target.value }))}
                style={{ width: 160, height: 36, border: "1px solid var(--line)", borderRadius: 10, padding: "0 10px", fontSize: 13, background: "var(--cream)", color: "var(--brown)", outline: "none" }}
              />
              <button className="btn-ghost" style={{ height: 36, padding: "0 14px" }} onClick={() => bumpLimit(f.userId)}>
                한도 변경
              </button>
            </div>
          </div>
        ))}
      </div>

      <h2 className="dot-title" style={{ marginBottom: 12 }}>사용자</h2>
      <div className="chip-row" style={{ marginBottom: 8 }}>
        {[
          { val: "", label: "전체" },
          { val: "google", label: "구글" },
          { val: "kakao", label: "카카오" },
          { val: "guest", label: "게스트" },
        ].map((t) => (
          <button key={t.val} className={`chip ${userType === t.val ? "on" : ""}`} onClick={() => loadUsers(1, t.val)}>
            {t.label}
          </button>
        ))}
      </div>
      <p className="meta" style={{ margin: "0 0 8px" }}>
        총 {n(userTotal)}명 · 행을 누르면 대화 내역과 인터뷰 크레딧을 볼 수 있어요.
      </p>
      <div style={{ overflowX: "auto" }}>
        <table className="admin-table">
          <thead>
            <tr><th>ID</th><th>유형</th><th>닉네임</th><th>대화방</th><th>메시지</th><th>인터뷰</th><th>토큰</th><th>최근 활동</th><th>가입일</th></tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const open = userDetail?.user?.id === u.id;
              return (
              <Fragment key={u.id}>
              <tr
                onClick={() => (open ? setUserDetail(null) : openUser(u.id))}
                style={{ cursor: "pointer", background: open ? "var(--sand)" : undefined }}
                aria-expanded={open}
              >
                <td style={{ maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis" }}>{open ? "▾ " : "▸ "}{u.id}</td>
                <td>{u.type}</td>
                <td>{u.nickname || u.email || "-"}</td>
                <td>{n(u.conversations)}</td>
                <td>{n(u.messages)}</td>
                <td>{n(u.interviewUsed)}/{u.interviewLimit ?? 2}</td>
                <td>{n(u.tokens)}</td>
                <td>{kst(u.lastActiveAt) || "-"}</td>
                <td>{kst(u.createdAt)}</td>
              </tr>
              {open && userDetail && (
                <tr className="admin-expanded"><td colSpan={9}>
                  <div className="card" style={{ padding: "10px 14px", marginBottom: 10, alignItems: "center", gap: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontWeight: 600 }}>이웃 인터뷰 크레딧 <span className="meta">사용 {n(userDetail.user?.interviewUsed)} / 한도 {userDetail.user?.interviewLimit ?? 2}</span></p>
                    </div>
                    <input
                      type="number"
                      value={ivInputs[userDetail.user.id] ?? ""}
                      onChange={(e) => setIvInputs((s) => ({ ...s, [userDetail.user.id]: e.target.value }))}
                      onClick={(e) => e.stopPropagation()}
                      placeholder="새 한도"
                      style={{ width: 80, height: 36, border: "1px solid var(--line)", borderRadius: 10, padding: "0 10px", background: "var(--cream)", color: "var(--brown)", outline: "none" }}
                    />
                    <button className="btn-ghost" style={{ height: 36, padding: "0 14px", flexShrink: 0 }} onClick={(e) => { e.stopPropagation(); bumpInterview(userDetail.user.id); }}>
                      부여
                    </button>
                  </div>
                  {userDetail.conversations.length === 0 && <p className="empty" style={{ padding: "8px 0" }}>아직 대화가 없어요.</p>}
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {userDetail.conversations.map((c) => (
                      <button key={c.id} onClick={() => openConv(c.id)} className="card"
                        style={{ padding: "8px 12px", alignItems: "center", width: "100%", textAlign: "left", cursor: "pointer" }}>
                        <Avatar uuid={c.personaUuid} sex={c.personaSex} age={c.personaAge} size={32} radius={9} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p className="card-name">
                            {c.personaName ?? "(삭제된 페르소나)"}
                            {c.mode === "dating" && <span className="admin-badge">💗 가상 연애{typeof c.affection === "number" ? ` · 호감도 ${c.affection}` : ""}</span>}
                            <span className="meta"> {c.title}</span>
                          </p>
                          <p className="card-meta">{c.personaOccupation} · 시작 {kst(c.createdAt)} · 마지막 {kst(c.lastMessageAt)}</p>
                        </div>
                        <span className="meta" style={{ flexShrink: 0 }}>메시지 {n(c.messageCount)} · 토큰 {n(c.tokens)} · 보기 →</span>
                      </button>
                    ))}
                  </div>
                </td></tr>
              )}
              </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {userTotal > 30 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginTop: 12 }}>
          <button
            className="btn-ghost"
            style={{ height: 36, padding: "0 14px" }}
            onClick={() => loadUsers(userPage - 1, userType)}
            disabled={userPage <= 1}
          >
            이전
          </button>
          <span className="meta">{userPage} / {Math.ceil(userTotal / 30)}</span>
          <button
            className="btn-ghost"
            style={{ height: 36, padding: "0 14px" }}
            onClick={() => loadUsers(userPage + 1, userType)}
            disabled={userPage >= Math.ceil(userTotal / 30)}
          >
            다음
          </button>
        </div>
      )}

      {convDetail && (
        <div className="sheet-back" style={{ alignItems: "center" }} onClick={() => setConvDetail(null)}>
          <div className="admin-modal" role="dialog" aria-label="대화 내용" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h2 className="dot-title" style={{ margin: 0 }}>{convDetail.personaName}님과의 대화 내용</h2>
                <p className="meta" style={{ margin: "4px 0 0" }}>
                  대화 ID {convDetail.id} · 메시지 {convDetail.messages.length}개
                  {convDetail.mode === "dating" && (() => {
                    const last = [...convDetail.messages].reverse().find((m) => typeof m.affection === "number");
                    return <> · 💗 가상 연애{last ? ` · 현재 호감도 ${last.affection} (${stageOf(last.affection!)})` : " · 호감도 측정 전"}</>;
                  })()}
                </p>
              </div>
              <button className="chat-back" style={{ fontSize: 22 }} onClick={() => setConvDetail(null)} aria-label="닫기">×</button>
            </div>
            <div className="admin-modal-body">
            {convDetail.messages.map((m, i) => {
              const prev = convDetail.messages.slice(0, i).reverse().find((x) => typeof x.affection === "number")?.affection ?? 25;
              const change = typeof m.affection === "number" ? m.affection - prev : null;
              return (
              <div
                key={m.id}
                className={`bubble ${m.role === "user" ? "user" : "persona"}`}
                style={{ alignSelf: m.role === "user" ? "flex-end" : "flex-start" }}
              >
                {m.content}
                <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4 }}>
                  {kst(m.createdAt)}
                  {m.role === "assistant" && (m.tokensIn || m.tokensOut) ? ` · ${n(m.tokensIn + m.tokensOut)} tok` : ""}
                </div>
                {typeof m.affection === "number" && (
                  <div className="admin-affection">
                    💗 호감도 {m.affection}{change ? ` (${change > 0 ? "+" : ""}${change})` : ""} · {stageOf(m.affection)}{m.affectionNote ? ` · "${m.affectionNote}"` : ""}
                  </div>
                )}
              </div>
              );
            })}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
