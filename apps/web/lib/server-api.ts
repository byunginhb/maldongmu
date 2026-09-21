/** 서버 컴포넌트(SSR·메타데이터·OG)에서 공개 API를 읽을 때. 실패하면 null → 호출부가 notFound/폴백 처리 */
const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export async function serverGet<T>(path: string, revalidate = 3600): Promise<T | null> {
  try {
    const res = await fetch(`${API}/api${path}`, { next: { revalidate } });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.maldongmu.app";
