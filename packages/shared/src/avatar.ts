/**
 * 결정적(deterministic) 픽셀 아바타 생성기.
 * uuid를 시드로 같은 페르소나는 항상 같은 얼굴이 나온다.
 * 8x10 그리드 SVG. 성별/연령대에 따라 머리 모양·팔레트 분기.
 */

function hashSeed(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

const SKIN = ["#F5CBA7", "#EDB98A", "#E0AC69", "#F1C27D"];
const HAIR_YOUNG = ["#2C2C2A", "#4A3728", "#6B4226", "#1B1B3A", "#5C2E2E"];
const HAIR_OLD = ["#B4B2A9", "#D3D1C7", "#888780", "#6E6E6E"];
const TOP = ["#D85A30", "#1D9E75", "#378ADD", "#D4537E", "#7F77DD", "#BA7517", "#639922", "#993C1D"];
const BG = ["#FAECE7", "#E1F5EE", "#E6F1FB", "#FBEAF0", "#EEEDFE", "#FAEEDA", "#EAF3DE"];

function pick<T>(rnd: () => number, arr: T[]): T {
  return arr[Math.floor(rnd() * arr.length)];
}

export interface AvatarOptions {
  uuid: string;
  sex?: string; // "남자" | "여자"
  age?: number;
  size?: number;
}

export function pixelAvatarSvg({ uuid, sex = "", age = 30, size = 80 }: AvatarOptions): string {
  const rnd = hashSeed(uuid);
  const skin = pick(rnd, SKIN);
  const hair = age >= 60 ? pick(rnd, HAIR_OLD) : pick(rnd, HAIR_YOUNG);
  const top = pick(rnd, TOP);
  const bg = pick(rnd, BG);
  const isFemale = sex.includes("여");
  const longHair = isFemale ? rnd() < 0.75 : rnd() < 0.06;
  const hasGlasses = age >= 50 ? rnd() < 0.5 : rnd() < 0.18;

  const P: string[] = []; // rects: "x,y,w,h,color"
  const px = (x: number, y: number, w: number, h: number, c: string) => P.push(`${x},${y},${w},${h},${c}`);

  // hair top
  px(2, 1, 4, 1, hair);
  px(1.6 + rnd() * 0.8 - 0.4 > 1.6 ? 2 : 1, 2, 6, 1, hair);
  // face
  px(2, 2, 4, 4, skin);
  px(2, 2, 4, 1, hair); // fringe
  if (longHair) {
    px(1, 2, 1, 4, hair);
    px(6, 2, 1, 4, hair);
  }
  // eyes
  const eyeC = "#2C2C2A";
  px(3, 4, 1, 1, eyeC);
  px(5, 4, 1, 1, eyeC);
  if (hasGlasses) {
    px(2.6, 3.8, 1.6, 1.4, "rgba(44,44,42,0.18)");
    px(4.6, 3.8, 1.6, 1.4, "rgba(44,44,42,0.18)");
  }
  // mouth
  px(4, 5.4, 1, 0.5, "#B0654A");
  // body
  px(1, 7, 6, 3, top);
  px(3.4, 7, 1.2, 0.8, skin); // neck

  const rects = P.map((s) => {
    const [x, y, w, h, c] = s.split(",");
    const col = s.split(",").slice(4).join(",");
    return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${col || c}"/>`;
  }).join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 8 10" shape-rendering="crispEdges"><rect width="8" height="10" fill="${bg}"/>${rects}</svg>`;
}

export function pixelAvatarDataUri(opts: AvatarOptions): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(pixelAvatarSvg(opts))}`;
}
