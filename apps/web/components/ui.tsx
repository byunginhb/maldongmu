"use client";

/**
 * 말동무 공통 UI 킷 — DESIGN.md 기반. 새 페이지는 여기서 가져다 쓴다.
 * 스타일은 globals.css의 토큰/클래스에 위임(디자인 일관성). 미리보기는 /design-system.
 */
import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from "react";

/** 주요 CTA(coral, 화면당 1개) / 보조(ghost) 버튼 */
export function Button({
  variant = "cta",
  children,
  className = "",
  ...props
}: { variant?: "cta" | "ghost" } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={`${variant === "cta" ? "btn-cta" : "btn-ghost"} ${className}`.trim()} {...props}>
      {children}
    </button>
  );
}

/** 섹션 제목(도트 폰트) + 선택적 부제(meta) */
export function SectionHeader({
  title,
  subtitle,
  style,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div style={style}>
      <h2 className="dot-title">{title}</h2>
      {subtitle && <p className="meta" style={{ margin: "4px 0 14px" }}>{subtitle}</p>}
    </div>
  );
}

/** 상태 뱃지 — pos(성공/수용)·neu(중립)·neg(주의/우려) */
export function Badge({ tone = "neu", children }: { tone?: "pos" | "neu" | "neg"; children: ReactNode }) {
  return <span className={`iv-badge ${tone}`}>{children}</span>;
}

/** 필터 칩 (선택 상태) */
export function Chip({
  active,
  children,
  className = "",
  ...props
}: { active?: boolean } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={`chip ${active ? "on" : ""} ${className}`.trim()} {...props}>
      {children}
    </button>
  );
}

/** 인용 블록 (coral 좌측 틱 + sand) */
export function QuoteBlock({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <div className="iv-quote" style={style}>{children}</div>;
}

/** 빈 상태 안내 */
export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="empty">{children}</p>;
}

/** 도트 감성 구분선 (coral·sand·line 3점) — 기존 컴포넌트 재사용 */
export { default as DotDivider } from "./DotDivider";

/** 로딩 스켈레톤 — 원하는 크기의 shimmer 블록 */
export function Skeleton({
  w = "100%",
  h = 16,
  radius = 8,
  style,
}: {
  w?: number | string;
  h?: number | string;
  radius?: number;
  style?: CSSProperties;
}) {
  return <div className="skeleton" style={{ width: w, height: h, borderRadius: radius, ...style }} />;
}

/** 페르소나 카드 형태의 스켈레톤 (아바타 + 텍스트 3줄) */
export function SkeletonCard() {
  return (
    <div className="skeleton-card">
      <Skeleton w={52} h={52} radius={12} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <Skeleton w="50%" h={14} />
        <Skeleton w="38%" h={11} style={{ marginTop: 9 }} />
        <Skeleton w="88%" h={13} style={{ marginTop: 11 }} />
      </div>
    </div>
  );
}
