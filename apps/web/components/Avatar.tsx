import { pixelAvatarSvg } from "@maldongmu/shared";

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
  const svg = pixelAvatarSvg({ uuid, sex, age, size });
  return (
    <span
      aria-hidden
      style={{ width: size, height: size, borderRadius: radius, overflow: "hidden", display: "inline-block", flexShrink: 0 }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
