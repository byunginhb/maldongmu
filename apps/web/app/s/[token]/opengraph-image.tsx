import { ImageResponse } from "next/og";
import { stageOf } from "../../../lib/affection";
import { getShareCard } from "../../../lib/share";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://www.maldongmu.app";
const font = (w: string) => fetch(`https://cdn.jsdelivr.net/npm/pretendard@1.3.9/dist/public/static/Pretendard-${w}.otf`).then((r) => r.arrayBuffer());

/** 카톡·트위터 미리보기용 호감도 카드 (1200×630). 사진 아바타(WebP)는 satori가 못 읽어 이름 이니셜 원으로 대체 */
export default async function Image({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const card = await getShareCard(token);
  const [bold, regular] = await Promise.all([font("Bold"), font("Regular")]);
  const fonts = [{ name: "P", data: bold, weight: 700 as const }, { name: "P", data: regular, weight: 400 as const }];
  if (!card) {
    return new ImageResponse(<div style={{ display: "flex", width: "100%", height: "100%", alignItems: "center", justifyContent: "center", background: "#FDF6EF", color: "#E8613C", fontSize: 72, fontFamily: "P", fontWeight: 700 }}>말동무</div>, { ...size, fonts });
  }
  const p = card.persona;
  return new ImageResponse(
    <div style={{ display: "flex", width: "100%", height: "100%", background: "#FDF6EF", color: "#3D2B1F", fontFamily: "P", padding: 64 }}>
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, color: "#E8613C", fontSize: 30, fontWeight: 700 }}>
          <div style={{ width: 26, height: 26, background: "#E8613C", borderRadius: 6 }} />말동무 · 가상 연애
        </div>
        <div style={{ display: "flex", fontSize: 64, fontWeight: 700, marginTop: 26, lineHeight: 1.2 }}>{p.name}님의 호감도 {card.score}</div>
        <div style={{ display: "flex", fontSize: 34, color: "#8C7361", marginTop: 8 }}>{p.age}세 · {p.occupation} · {stageOf(card.score)}</div>
        <div style={{ display: "flex", width: 720, height: 18, background: "#F3E7D8", borderRadius: 99, marginTop: 28 }}>
          <div style={{ width: Math.max(18, Math.round(720 * card.score / 100)), height: 18, background: "#E8613C", borderRadius: 99 }} />
        </div>
        {card.line && <div style={{ display: "flex", fontSize: 30, marginTop: 30, lineHeight: 1.5 }}>“{card.line}”</div>}
        <div style={{ display: "flex", fontSize: 24, color: "#8C7361", marginTop: 28 }}>성별·나이대만 고르면 나도 소개팅 시작 → {SITE.replace(/^https?:\/\//, "")}</div>
      </div>
      <div style={{ display: "flex", width: 240, height: 240, borderRadius: 60, background: "#F3E7D8", border: "6px solid #FFFFFF", alignItems: "center", justifyContent: "center", fontSize: 96, fontWeight: 700, color: "#E8613C", alignSelf: "center" }}>
        {p.name.slice(0, 1)}
      </div>
    </div>,
    { ...size, fonts },
  );
}
