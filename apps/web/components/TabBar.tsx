"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/* 픽셀 아이콘 3종 — 동일한 '채운 실루엣' 스타일로 통일 */
const HomeIcon = ({ on }: { on: boolean }) => (
  <svg width="20" height="20" viewBox="0 0 16 16" shapeRendering="crispEdges" aria-hidden>
    <path
      d="M7 1h2v1H7zM6 2h4v1H6zM5 3h6v1H5zM4 4h8v1H4zM3 5h10v1H3zM2 6h12v1H2zM3 7h10v3H3zM3 10h4v4H3zM9 10h4v4H9z"
      fill={on ? "var(--coral)" : "var(--brown-soft)"}
    />
  </svg>
);
const SearchIcon = ({ on }: { on: boolean }) => (
  <svg width="20" height="20" viewBox="0 0 16 16" shapeRendering="crispEdges" aria-hidden>
    <path
      d="M5 1h4v1H5zM4 2h6v1H4zM3 3h3v1H3zM8 3h3v1H8zM3 4h2v3H3zM9 4h2v3H9zM3 7h3v1H3zM8 7h3v1H8zM4 8h6v1H4zM5 9h4v1H5zM9 9h2v2H9zM11 11h2v2h-2zM13 13h2v2h-2z"
      fill={on ? "var(--coral)" : "var(--brown-soft)"}
    />
  </svg>
);
const ChatIcon = ({ on }: { on: boolean }) => (
  <svg width="20" height="20" viewBox="0 0 16 16" shapeRendering="crispEdges" aria-hidden>
    <path
      d="M3 2h10v1H3zM2 3h12v7H2zM3 10h4v1H3zM4 11h2v1H4zM4 12h1v1H4z"
      fill={on ? "var(--coral)" : "var(--brown-soft)"}
    />
  </svg>
);

const TABS = [
  { href: "/", label: "홈", Icon: HomeIcon },
  { href: "/search", label: "검색", Icon: SearchIcon },
  { href: "/me", label: "내 대화", Icon: ChatIcon },
];

export default function TabBar() {
  const pathname = usePathname();
  if (pathname.startsWith("/chat/") || pathname.startsWith("/admin")) return null;
  return (
    <nav className="tabbar">
      {TABS.map(({ href, label, Icon }) => {
        const on = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link key={href} href={href} className={on ? "on" : ""}>
            <Icon on={on} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
