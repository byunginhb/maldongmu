import { BadRequestException, Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { DbService } from "../db/db.service";

type Provider = "google" | "kakao";

const serverUrl = () => process.env.SERVER_PUBLIC_URL || "http://localhost:4000";
const webUrl = () => process.env.WEB_URL || "http://localhost:3000";

@Injectable()
export class OauthService {
  constructor(
    private readonly dbs: DbService,
    private readonly jwt: JwtService,
  ) {}
  private get db() {
    return this.dbs.db;
  }

  /** OAuth 시작 URL 생성. state에 현재 게스트 id를 서명해 넣어 콜백에서 이력 이관 */
  authorizeUrl(provider: Provider, guestToken?: string): string {
    let guestId: string | null = null;
    if (guestToken) {
      try {
        guestId = this.jwt.verify<{ sub: string }>(guestToken).sub;
      } catch {
        /* 무시 — 게스트 이관 없이 진행 */
      }
    }
    const state = this.jwt.sign({ g: guestId, p: provider }, { expiresIn: "10m" });
    const redirectUri = `${serverUrl()}/api/auth/${provider}/callback`;

    if (provider === "google") {
      const q = new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID || "",
        redirect_uri: redirectUri,
        response_type: "code",
        scope: "openid email profile",
        state,
      });
      return `https://accounts.google.com/o/oauth2/v2/auth?${q}`;
    }
    const q = new URLSearchParams({
      client_id: process.env.KAKAO_REST_API_KEY || "",
      redirect_uri: redirectUri,
      response_type: "code",
      state,
    });
    return `https://kauth.kakao.com/oauth/authorize?${q}`;
  }

  /** 콜백 처리 → 웹으로 리다이렉트할 URL 반환 */
  async handleCallback(provider: Provider, code: string, state: string): Promise<string> {
    let guestId: string | null = null;
    try {
      const s = this.jwt.verify<{ g: string | null; p: string }>(state);
      if (s.p !== provider) throw new Error("provider mismatch");
      guestId = s.g;
    } catch {
      throw new BadRequestException("invalid state");
    }

    const profile =
      provider === "google" ? await this.googleProfile(code) : await this.kakaoProfile(code);

    const userId = `${provider}_${profile.providerId}`;
    const existing = this.db.prepare(`SELECT id FROM users WHERE id = ?`).get(userId);
    if (!existing) {
      this.db
        .prepare(`INSERT INTO users (id, type, email, nickname) VALUES (?, ?, ?, ?)`)
        .run(userId, provider, profile.email, profile.nickname);
    } else {
      this.db
        .prepare(`UPDATE users SET email = COALESCE(?, email), nickname = COALESCE(?, nickname) WHERE id = ?`)
        .run(profile.email, profile.nickname, userId);
    }

    // 게스트 이력 이관
    if (guestId && guestId !== userId) {
      const guest = this.db.prepare(`SELECT id, type FROM users WHERE id = ?`).get(guestId) as any;
      if (guest?.type === "guest") {
        const move = this.db.transaction(() => {
          this.db.prepare(`UPDATE conversations SET user_id = ? WHERE user_id = ?`).run(userId, guestId);
          this.db.prepare(`UPDATE usage_events SET user_id = ? WHERE user_id = ?`).run(userId, guestId);
          this.db.prepare(`DELETE FROM users WHERE id = ?`).run(guestId);
        });
        move();
      }
    }

    const token = this.jwt.sign({ sub: userId, type: provider });
    return `${webUrl()}/auth/callback?token=${encodeURIComponent(token)}`;
  }

  private async googleProfile(code: string) {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID || "",
        client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
        redirect_uri: `${serverUrl()}/api/auth/google/callback`,
        grant_type: "authorization_code",
      }),
    });
    if (!res.ok) throw new BadRequestException("google token exchange failed");
    const tok = (await res.json()) as { access_token: string };
    const uRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${tok.access_token}` },
    });
    if (!uRes.ok) throw new BadRequestException("google userinfo failed");
    const u = (await uRes.json()) as { sub: string; email?: string; name?: string };
    return { providerId: u.sub, email: u.email ?? null, nickname: u.name ?? null };
  }

  private async kakaoProfile(code: string) {
    const body: Record<string, string> = {
      grant_type: "authorization_code",
      client_id: process.env.KAKAO_REST_API_KEY || "",
      redirect_uri: `${serverUrl()}/api/auth/kakao/callback`,
      code,
    };
    if (process.env.KAKAO_CLIENT_SECRET) body.client_secret = process.env.KAKAO_CLIENT_SECRET;
    const res = await fetch("https://kauth.kakao.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(body),
    });
    if (!res.ok) throw new BadRequestException("kakao token exchange failed");
    const tok = (await res.json()) as { access_token: string };
    const uRes = await fetch("https://kapi.kakao.com/v2/user/me", {
      headers: { Authorization: `Bearer ${tok.access_token}` },
    });
    if (!uRes.ok) throw new BadRequestException("kakao userinfo failed");
    const u = (await uRes.json()) as {
      id: number;
      kakao_account?: { email?: string; profile?: { nickname?: string } };
    };
    return {
      providerId: String(u.id),
      email: u.kakao_account?.email ?? null,
      nickname: u.kakao_account?.profile?.nickname ?? null,
    };
  }
}
