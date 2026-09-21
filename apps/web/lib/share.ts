import type { PersonaCard } from "@maldongmu/shared";

export interface ShareCard {
  score: number;
  note: string | null;
  line: string | null;
  createdAt: string;
  persona: Pick<PersonaCard, "uuid" | "name" | "age" | "sex" | "occupation" | "province">;
}

/** 서버 컴포넌트/OG 이미지에서 공개 공유 카드 조회. 없으면 null */
export async function getShareCard(token: string): Promise<ShareCard | null> {
  const api = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
  try {
    const res = await fetch(`${api}/api/share/${encodeURIComponent(token)}`, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as ShareCard;
  } catch {
    return null;
  }
}
