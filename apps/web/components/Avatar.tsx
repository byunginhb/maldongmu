import { avatarSource } from "../lib/avatar-catalog";

export default function Avatar({
  uuid,
  sex,
  age,
  size = 52,
  radius = 12,
  loading = "lazy",
}: {
  uuid: string;
  sex?: string;
  age?: number;
  size?: number;
  radius?: number;
  loading?: "lazy" | "eager";
}) {
  const src = avatarSource(uuid, sex, age);

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
        loading={loading}
        decoding="async"
        style={{ display: "block", width: "100%", height: "100%", objectFit: "cover" }}
      />
    </span>
  );
}
