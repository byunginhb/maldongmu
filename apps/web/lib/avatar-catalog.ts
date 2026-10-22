const AGE_BUCKETS = [20, 30, 50, 70] as const;
const GENERATED_ROOT = "/company-generated/4914e797-98fe-4f77-9812-a5adfc7ab684";

// 키 순서: male/female → 20/30/50/70 → v0..v5.
// 추가 사진은 female 001..024, male 025..048 순서다. 기존 키의 male/female 순서는 유지한다.
export const PAIRS: readonly (readonly [string, string])[] = Object.freeze(
  ["male", "female"].flatMap((gender, genderIndex) =>
    AGE_BUCKETS.flatMap((bucket, bucketIndex) =>
      Array.from({ length: 6 }, (_, variant) => {
        const assetIndex = (genderIndex === 0 ? 24 : 0) + bucketIndex * 6 + variant;
        return Object.freeze([
          `/avatars/v1/${gender}-${bucket}-v${variant}.webp`,
          `${GENERATED_ROOT}/avatar-${String(assetIndex + 1).padStart(3, "0")}.png`,
        ] as const);
      }),
    ),
  ),
);

// 기준 Avatar의 선택 규칙을 그대로 보존한다.
export function avatarVariant(uuid: string): number {
  const hexSuffix = uuid.slice(-8);
  if (/^[0-9a-f]{8}$/i.test(hexSuffix)) {
    return Number.parseInt(hexSuffix, 16) % 6;
  }
  let hash = 2166136261;
  for (let i = 0; i < uuid.length; i++) {
    hash ^= uuid.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % 6;
}

export function ageBucket(age: number): (typeof AGE_BUCKETS)[number] {
  if (age < 30) return 20;
  if (age < 45) return 30;
  if (age < 65) return 50;
  return 70;
}

export function avatarKey(uuid: string, sex?: string, age?: number): number {
  const genderIndex = sex?.includes("여") ? 1 : 0;
  return genderIndex * 24 + AGE_BUCKETS.indexOf(ageBucket(age ?? 30)) * 6 + avatarVariant(uuid);
}

// 별도 salt와 전체 uuid를 사용한다. 기존 variant의 짝홀을 재사용하지 않는다.
export function avatarPairBit(uuid: string): 0 | 1 {
  const input = `maldongmu:avatar-pair:v1:${uuid}`;
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x85ebca6b);
  hash ^= hash >>> 13;
  hash = Math.imul(hash, 0xc2b2ae35);
  hash ^= hash >>> 16;
  return (hash & 1) as 0 | 1;
}

export function avatarSource(uuid: string, sex?: string, age?: number): string {
  return PAIRS[avatarKey(uuid, sex, age)][avatarPairBit(uuid)];
}
