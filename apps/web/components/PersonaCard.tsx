"use client";

import Link from "next/link";
import type { PersonaCard as Card } from "@maldongmu/shared";
import Avatar from "./Avatar";
import { useT } from "./LangProvider";

export default function PersonaCard({ p }: { p: Card }) {
  const { t } = useT();
  return (
    <Link href={`/persona/${p.uuid}`} className="card">
      <Avatar uuid={p.uuid} sex={p.sex} age={p.age} />
      <div style={{ minWidth: 0 }}>
        <p className="card-name">
          {p.name} <span style={{ fontWeight: 400 }}>· {t("{age}세", { age: p.age })}</span>
        </p>
        <p className="card-meta">
          {p.occupation} · {p.province} {p.district}
        </p>
        <p className="card-oneliner">{p.oneLiner}</p>
      </div>
    </Link>
  );
}
