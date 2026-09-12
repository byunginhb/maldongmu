"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PersonaCard as Card } from "@maldongmu/shared";
import { apiPost, datingCandidates, LoginRequiredError } from "../../lib/api";
import Avatar from "../../components/Avatar";
import LoginSheet from "../../components/LoginSheet";

const SEXES = ["여자", "남자"];
const AGES = [
  { label: "20대", min: 20, max: 29 },
  { label: "30대", min: 30, max: 39 },
  { label: "40대", min: 40, max: 49 },
  { label: "50대 이상", min: 50, max: 99 },
];

export default function DatingPage() {
  const router = useRouter();
  const [sex, setSex] = useState("");
  const [age, setAge] = useState<(typeof AGES)[number] | null>(null);
  const [items, setItems] = useState<Card[] | null>(null);
  const [finding, setFinding] = useState(false);
  const [starting, setStarting] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [showLogin, setShowLogin] = useState(false);

  const find = async () => {
    if (!sex || !age || finding) return;
    setFinding(true);
    setError("");
    try {
      setItems((await datingCandidates(sex, age.min, age.max)).items);
    } catch {
      setError("소개할 분을 찾지 못했어요. 잠시 후 다시 시도해주세요.");
    } finally {
      setFinding(false);
    }
  };

  const start = async (uuid: string) => {
    if (starting) return;
    setStarting(uuid);
    try {
      const res = await apiPost<{ id: string }>("/conversations", { personaUuid: uuid, mode: "dating" });
      router.push(`/chat/${res.id}`);
    } catch (e) {
      if (e instanceof LoginRequiredError) setShowLogin(true);
      else setError("만남을 시작하지 못했어요. 다시 시도해주세요.");
      setStarting(null);
    }
  };

  // 조건을 바꾸면 결과를 접고 다시 소개받기 버튼으로
  const pickSex = (s: string) => { setSex(s); setItems(null); };
  const pickAge = (a: (typeof AGES)[number]) => { setAge(a); setItems(null); };

  return (
    <main className="page">
      <button className="btn-ghost" style={{ height: 36, padding: "0 14px", marginBottom: 18 }} onClick={() => router.push("/")}>
        ← 홈
      </button>

      <h1 className="dot-title" style={{ marginBottom: 6 }}>가상 연애</h1>
      <p style={{ margin: "0 0 4px", fontSize: 15 }}>설레는 첫 만남, 미리 연습해볼까요?</p>
      <p className="meta" style={{ margin: "0 0 20px" }}>
        만나고 싶은 분의 성별과 나이대만 골라주세요. 소개팅 자리로 안내해드릴게요.
      </p>

      <p className="meta" style={{ margin: "0 0 8px", fontWeight: 600 }}>어떤 분을 만나볼까요?</p>
      <div className="chip-wrap" style={{ marginBottom: 16 }}>
        {SEXES.map((s) => (
          <button key={s} className={`chip${sex === s ? " on" : ""}`} onClick={() => pickSex(s)} aria-pressed={sex === s}>{s}</button>
        ))}
      </div>
      <p className="meta" style={{ margin: "0 0 8px", fontWeight: 600 }}>나이대</p>
      <div className="chip-wrap" style={{ marginBottom: 24 }}>
        {AGES.map((a) => (
          <button key={a.label} className={`chip${age?.label === a.label ? " on" : ""}`} onClick={() => pickAge(a)} aria-pressed={age?.label === a.label}>{a.label}</button>
        ))}
      </div>

      {items === null && (
        <button className="btn-cta" onClick={find} disabled={!sex || !age || finding}>
          {finding ? "소개할 분을 찾는 중..." : "소개받기"}
        </button>
      )}

      {items !== null && (
        <>
          {items.length > 0 && <>
            <h2 className="dot-title" style={{ marginTop: 8 }}>이런 분들이 기다리고 있어요</h2>
            <p className="meta" style={{ margin: "4px 0 14px" }}>마음이 가는 분을 고르면 바로 첫 만남이 시작돼요.</p>
          </>}
          {/* 목록 스타일은 욕쟁이 할매 목록과 동일 → 클래스 재사용 */}
          <div className="granny-list">
            {items.map((p) => (
              <button key={p.uuid} className="granny-item" onClick={() => start(p.uuid)} disabled={starting !== null}>
                <Avatar uuid={p.uuid} sex={p.sex} age={p.age} size={56} radius={14} />
                <span className="granny-item-body">
                  <span className="granny-name">{p.name} · {p.age}세</span>
                  <span className="meta">{p.occupation} · {p.province} {p.district?.replace(`${p.province}-`, "")}</span>
                  <span className="card-oneliner" style={{ fontSize: 13, color: "var(--brown-soft)" }}>{p.oneLiner}</span>
                </span>
                <span className="granny-go">{starting === p.uuid ? "..." : "만나기 →"}</span>
              </button>
            ))}
          </div>
          {items.length === 0 && <p className="empty">조건에 맞는 분을 찾지 못했어요. 다른 나이대를 골라볼까요?</p>}
          <button className="btn-ghost" style={{ marginTop: 16 }} onClick={find} disabled={finding || starting !== null}>
            {finding ? "찾는 중..." : "다른 분 소개받기"}
          </button>
        </>
      )}

      {error && <p className="chat-error" role="alert">{error}</p>}
      {showLogin && <LoginSheet onClose={() => setShowLogin(false)} />}
    </main>
  );
}
