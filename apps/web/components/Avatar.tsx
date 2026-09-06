const AGE_BUCKETS = [20, 30, 50, 70] as const;

function avatarVariant(uuid: string): number {
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

function ageBucket(age: number): (typeof AGE_BUCKETS)[number] {
  if (age < 30) return 20;
  if (age < 45) return 30;
  if (age < 65) return 50;
  return 70;
}

export default function Avatar({
  uuid,
  sex,
  age,
  size = 52,
  radius = 12,
}: {
  uuid: string;
  sex?: string;
  age?: number;
  size?: number;
  radius?: number;
}) {
  const gender = sex?.includes("여") ? "female" : "male";
  const bucket = ageBucket(age ?? 30);
  const src = `/avatars/v1/${gender}-${bucket}-v${avatarVariant(uuid)}.webp`;

  return (
    <span
      aria-hidden
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        overflow: "hidden",
        display: "inline-block",
        flexShrink: 0,
        background: "var(--sand)",
      }}
    >
      <img
        src={src}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        decoding="async"
        style={{ display: "block", width: "100%", height: "100%", objectFit: "cover" }}
      />
    </span>
  );
}
