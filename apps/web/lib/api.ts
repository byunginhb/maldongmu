export const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

let token: string | null = null;

export function getToken(): string | null {
  if (token) return token;
  if (typeof window !== "undefined") token = localStorage.getItem("mdm_token");
  return token;
}

export function setToken(t: string) {
  token = t;
  localStorage.setItem("mdm_token", t);
}

export function clearToken() {
  token = null;
  localStorage.removeItem("mdm_token");
}

export async function ensureGuest(): Promise<string> {
  const t = getToken();
  if (t) return t;
  const res = await fetch(`${API}/api/auth/guest`, { method: "POST" });
  const data = await res.json();
  setToken(data.token);
  return data.token;
}

/** 게스트 대화 한도 초과 → 로그인 필요 */
export class LoginRequiredError extends Error {
  constructor() {
    super("로그인이 필요해요");
    this.name = "LoginRequiredError";
  }
}

async function handleError(res: Response): Promise<never> {
  if (res.status === 403) {
    try {
      const body = await res.json();
      if (body?.code === "LOGIN_REQUIRED" || body?.message?.code === "LOGIN_REQUIRED") {
        throw new LoginRequiredError();
      }
    } catch (e) {
      if (e instanceof LoginRequiredError) throw e;
    }
    throw new LoginRequiredError();
  }
  if (res.status === 401) {
    // 토큰 만료/무효 → 재발급 후 재시도할 수 있게 초기화
    clearToken();
  }
  throw new Error(`API ${res.status}`);
}

async function request<T>(path: string, init?: RequestInit, retried = false): Promise<T> {
  const t = await ensureGuest();
  const res = await fetch(`${API}/api${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  // 401(토큰 무효/계정 삭제) → 토큰 버리고 새 게스트로 1회 자동 재시도
  if (res.status === 401 && !retried) {
    clearToken();
    return request<T>(path, init, true);
  }
  if (!res.ok) await handleError(res);
  return res.json();
}

export function apiGet<T>(path: string): Promise<T> {
  return request<T>(path);
}

export function apiPost<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined });
}

/** 소셜 로그인 시작 — 서버가 OAuth로 리다이렉트. 현재(게스트) 토큰을 넘겨 이력 이관 */
export function socialLoginUrl(provider: "google" | "kakao"): string {
  const t = getToken();
  const q = t ? `?token=${encodeURIComponent(t)}` : "";
  return `${API}/api/auth/${provider}/start${q}`;
}

/** SSE 채팅 스트림. onDelta로 토큰 단위 수신 */
export async function streamChat(
  conversationId: string,
  message: string,
  onDelta: (text: string) => void,
): Promise<void> {
  const t = await ensureGuest();
  const res = await fetch(`${API}/api/chat/${conversationId}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });
  if (res.status === 403) throw new LoginRequiredError();
  if (!res.ok || !res.body) throw new Error(`API ${res.status}`);
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() || "";
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      try {
        const json = JSON.parse(line.slice(5).trim());
        if (json.delta) onDelta(json.delta);
        if (json.error) throw new Error(json.error);
      } catch (e) {
        if (e instanceof SyntaxError) continue;
        throw e;
      }
    }
  }
}

/* ---------- 어드민 ---------- */
export function getAdminKey(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem("mdm_admin_key");
}

export function setAdminKey(key: string) {
  sessionStorage.setItem("mdm_admin_key", key);
}

export async function adminGet<T>(path: string): Promise<T> {
  const key = getAdminKey();
  if (!key) throw new Error("NO_ADMIN_KEY");
  const res = await fetch(`${API}/api/admin${path}`, {
    headers: { "x-admin-key": key },
  });
  if (res.status === 401) throw new Error("BAD_ADMIN_KEY");
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}
