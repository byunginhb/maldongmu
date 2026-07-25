/**
 * 결정적(deterministic) 벡터 일러스트 아바타 생성기.
 * uuid를 시드로 같은 페르소나는 항상 같은 얼굴이 나온다 (저장 없이 렌더 시 생성).
 * 부드러운 플랫 일러스트(얼굴·머리·눈·미소)로 "동네 이웃" 느낌. 성별/연령대에 따라
 * 머리 모양·색·표정이 달라진다. 외부 의존성/네트워크 없음, 100만 명도 즉시.
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

const SKIN = ["#F7D7BE", "#F1C9A5", "#E7B693", "#D9A47B", "#CE9A70"];
const HAIR_YOUNG = ["#2A211C", "#3D2B1F", "#523524", "#1B1B24", "#6B4A2E", "#43413F"];
const HAIR_OLD = ["#BEB8AF", "#D3CDC3", "#9E988F", "#8A857C"];
const TOP = ["#C86B4A", "#4E8D6E", "#4A7BB0", "#C56A86", "#7A73B8", "#B98A3E", "#6E9A4A", "#A05740", "#557A8C"];
const BG = ["#F6E9DF", "#E7F0EA", "#E8EFF6", "#F6E9EE", "#ECEAF6", "#F5EBDD", "#EDF2E2"];

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
  const old = age >= 60;
  const hair = old ? pick(rnd, HAIR_OLD) : pick(rnd, HAIR_YOUNG);
  const top = pick(rnd, TOP);
  const bg = pick(rnd, BG);
  const isFemale = sex.includes("여");
  const longHair = isFemale ? rnd() < 0.72 : rnd() < 0.05;
  const hasGlasses = age >= 50 ? rnd() < 0.5 : rnd() < 0.16;

  const brow = old ? hair : "#4A3B30";
  const cx = 50;
  const e: string[] = [];

  // 배경
  e.push(`<rect width="100" height="100" fill="${bg}"/>`);
  // 어깨/옷
  e.push(`<path d="M20 100 C20 79 33 73 50 73 C67 73 80 79 80 100 Z" fill="${top}"/>`);
  // 옷깃 하이라이트
  e.push(`<path d="M43 74 Q50 82 57 74" fill="none" stroke="rgba(255,255,255,0.25)" stroke-width="2"/>`);

  // 긴 머리(뒤) — 얼굴보다 먼저 그려 뒤로 감
  if (longHair) {
    const bottom = rnd() < 0.5 ? 74 : 60; // 롱 vs 단발
    e.push(
      `<path d="M24 42 C22 17 38 9 50 9 C62 9 78 17 76 42 L76 ${bottom} C76 ${bottom + 4} 70 ${bottom + 4} 68 ${bottom} C70 44 64 30 50 30 C36 30 30 44 32 ${bottom} C30 ${bottom + 4} 24 ${bottom + 4} 24 ${bottom} Z" fill="${hair}"/>`,
    );
  }
  // 목
  e.push(`<rect x="43" y="59" width="14" height="18" rx="6" fill="${skin}"/>`);
  e.push(`<path d="M43 66 Q50 71 57 66" fill="rgba(0,0,0,0.06)"/>`);
  // 귀
  e.push(`<circle cx="26" cy="46" r="5" fill="${skin}"/><circle cx="74" cy="46" r="5" fill="${skin}"/>`);
  // 얼굴
  e.push(`<ellipse cx="${cx}" cy="45" rx="24" ry="28" fill="${skin}"/>`);

  // 윗머리(크라운) — 얼굴 위. 나이 들면 헤어라인 살짝 뒤로.
  const hairline = old && rnd() < 0.5 ? 32 : 26;
  e.push(
    `<path d="M26 46 C25 ${hairline - 4} 37 ${hairline - 12} 50 ${hairline - 12} C63 ${hairline - 12} 75 ${hairline - 4} 74 46 C69 ${hairline + 2} 61 ${hairline - 3} 50 ${hairline - 3} C39 ${hairline - 3} 31 ${hairline + 2} 26 46 Z" fill="${hair}"/>`,
  );
  // 묶음머리 / 올림머리 (가끔)
  if (isFemale && !longHair && rnd() < 0.4) e.push(`<circle cx="50" cy="13" r="8" fill="${hair}"/>`);

  // 눈썹
  const browY = 37 + (rnd() < 0.5 ? 0 : 1);
  e.push(`<rect x="33" y="${browY}" width="10" height="2.4" rx="1.2" fill="${brow}"/>`);
  e.push(`<rect x="57" y="${browY}" width="10" height="2.4" rx="1.2" fill="${brow}"/>`);
  // 눈
  e.push(`<ellipse cx="39" cy="46" rx="3" ry="3.8" fill="#3A2F2A"/><ellipse cx="61" cy="46" rx="3" ry="3.8" fill="#3A2F2A"/>`);
  e.push(`<circle cx="40" cy="45" r="1" fill="#fff" opacity="0.85"/><circle cx="62" cy="45" r="1" fill="#fff" opacity="0.85"/>`);
  // 코
  e.push(`<path d="M50 47 Q52.5 53 48.5 54.5" fill="none" stroke="rgba(150,100,70,0.4)" stroke-width="1.6" stroke-linecap="round"/>`);
  // 볼터치
  e.push(`<ellipse cx="34" cy="53" rx="4" ry="2.4" fill="rgba(226,120,92,0.18)"/><ellipse cx="66" cy="53" rx="4" ry="2.4" fill="rgba(226,120,92,0.18)"/>`);
  // 입 (미소 정도 랜덤)
  const smile = 3 + Math.floor(rnd() * 5);
  e.push(`<path d="M42 59 Q50 ${59 + smile} 58 59" fill="none" stroke="#B0654A" stroke-width="2.4" stroke-linecap="round"/>`);
  // 콧수염 (나이 든 남성 가끔)
  if (!isFemale && age >= 55 && rnd() < 0.4)
    e.push(`<path d="M43 57 Q50 60 57 57 Q50 59 43 57 Z" fill="${hair}" opacity="0.6"/>`);
  // 안경
  if (hasGlasses)
    e.push(
      `<g fill="none" stroke="#3A2F2A" stroke-width="2"><rect x="31" y="41" width="14" height="11" rx="4"/><rect x="55" y="41" width="14" height="11" rx="4"/><path d="M45 46 H55"/></g>`,
    );

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100">${e.join("")}</svg>`;
}

export function pixelAvatarDataUri(opts: AvatarOptions): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(pixelAvatarSvg(opts))}`;
}
