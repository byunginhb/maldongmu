"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getOccupations, type OccupationEntry } from "../../lib/api";
import Avatar from "../../components/Avatar";

export default function MeetPage() {
  const [items, setItems] = useState<OccupationEntry[] | null>(null);

  useEffect(() => {
    getOccupations().then((res) => setItems(res.items)).catch(() => setItems([]));
  }, []);

  return (
    <main className="page">
      <h1 className="dot-title">만나보고 싶던 사람들</h1>
      <p className="meta" style={{ margin: "4px 0 20px" }}>
        평소엔 만나기 어려운 이웃들이에요. 매일 새로운 분이 인사드려요.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {items === null
          ? Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 108 }} />)
          : items.map((o) => (
              <Link key={o.key} href={`/persona/${o.persona.uuid}`} className="occupation-card">
                <p className="occupation-title">{o.label}</p>
                <p className="meta" style={{ margin: "2px 0 12px" }}>{o.blurb}</p>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <Avatar uuid={o.persona.uuid} sex={o.persona.sex} age={o.persona.age} size={48} radius={12} />
                  <div style={{ minWidth: 0 }}>
                    <p className="card-name">
                      {o.persona.name} <span style={{ fontWeight: 400 }}>· {o.persona.age}세</span>
                    </p>
                    <p className="card-oneliner">{o.persona.oneLiner}</p>
                  </div>
                </div>
              </Link>
            ))}
      </div>

      {items !== null && items.length === 0 && (
        <p className="empty">아직 소개할 이웃이 없어요. 곧 찾아뵐게요.</p>
      )}
    </main>
  );
}
