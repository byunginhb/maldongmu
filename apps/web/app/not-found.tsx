import Link from "next/link";

export default function NotFound() {
  return (
    <main className="page" style={{ textAlign: "center", paddingTop: 80 }}>
      <h1 className="dot-title" style={{ color: "var(--coral)" }}>여긴 빈 골목이에요</h1>
      <p className="meta" style={{ margin: "8px 0 28px" }}>
        찾으시는 페이지가 없어요. 이웃들이 있는 곳으로 돌아가볼까요?
      </p>
      <Link href="/" className="btn-ghost">홈으로 돌아가기</Link>
    </main>
  );
}
