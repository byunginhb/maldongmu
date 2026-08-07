"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiGet, apiPost, getGrannies, LoginRequiredError, type GrannyCard } from "../../lib/api";
import Avatar from "../../components/Avatar";
import LoginSheet from "../../components/LoginSheet";

export default function GranniesPage() {
  const router = useRouter();
  const [items, setItems] = useState<GrannyCard[] | null>(null);
  const [starting, setStarting] = useState<string | null>(null);
  const [showLogin, setShowLogin] = useState(false);

  useEffect(() => {
    getGrannies().then((r) => setItems(r.items)).catch(() => setItems([]));
  }, []);

  const talk = async (uuid: string) => {
    if (starting) return;
    setStarting(uuid);
    try {
      const res = await apiPost<{ id: string }>("/conversations", { personaUuid: uuid });
      router.push(`/chat/${res.id}`);
    } catch (e) {
      if (e instanceof LoginRequiredError) setShowLogin(true);
      setStarting(null);
    }
  };

  return (
    <main className="page">
      <button className="btn-ghost" style={{ height: 36, padding: "0 14px", marginBottom: 18 }} onClick={() => router.push("/")}>
        ← 홈
      </button>

      <h1 className="dot-title" style={{ marginBottom: 6 }}>욕쟁이 할매</h1>
      <p style={{ margin: "0 0 4px", fontSize: 15 }}>입은 걸어도 속은 따뜻한 우리 동네 할매들</p>
      <p className="meta" style={{ margin: "0 0 20px" }}>
        지역을 골라 앉으면, 한바탕 타박부터 시작이에요. 그래도 밥은 꼭 챙겨 주실 거예요.
      </p>

      <div className="granny-list">
        {items === null
          ? Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 88, borderRadius: 16 }} />)
          : items.map((g) => (
              <button key={g.uuid} className="granny-item" onClick={() => talk(g.uuid)} disabled={starting !== null}>
                <Avatar uuid={g.uuid} sex={g.sex} age={g.age} size={56} radius={14} />
                <span className="granny-item-body">
                  <span className="granny-region">{g.region}</span>
                  <span className="granny-name">{g.name} 할매 · {g.age}세</span>
                  <span className="meta">{g.occupation}</span>
                </span>
                <span className="granny-go">{starting === g.uuid ? "..." : "대화 →"}</span>
              </button>
            ))}
      </div>

      {showLogin && <LoginSheet onClose={() => setShowLogin(false)} />}
    </main>
  );
}
