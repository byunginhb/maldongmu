import { Controller, Get, Param, Post, Query, Req, Res, UseGuards } from "@nestjs/common";
import { Response } from "express";
import { AuthService } from "./auth.service";
import { AuthGuard } from "./auth.guard";
import { OauthService } from "./oauth.service";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly oauth: OauthService,
  ) {}

  @Post("guest")
  guest() {
    return this.auth.createGuest();
  }

  @Get("me")
  @UseGuards(AuthGuard)
  me(@Req() req: any) {
    return this.auth.me(req.userId);
  }

  /** 소셜 로그인 시작 — 웹이 현재(게스트) 토큰을 쿼리로 전달하면 이력을 이관 */
  @Get(":provider/start")
  start(
    @Param("provider") provider: string,
    @Query("token") token: string | undefined,
    @Res() res: Response,
  ) {
    if (provider !== "google" && provider !== "kakao") {
      return res.status(404).send("unknown provider");
    }
    return res.redirect(this.oauth.authorizeUrl(provider, token));
  }

  @Get(":provider/callback")
  async callback(
    @Param("provider") provider: string,
    @Query("code") code: string,
    @Query("state") state: string,
    @Query("error") error: string | undefined,
    @Res() res: Response,
  ) {
    const webUrl = process.env.WEB_URL || "http://localhost:3000";
    if (provider !== "google" && provider !== "kakao") {
      return res.status(404).send("unknown provider");
    }
    if (error || !code) {
      return res.redirect(`${webUrl}/?login=failed`);
    }
    try {
      const redirectTo = await this.oauth.handleCallback(provider, code, state);
      return res.redirect(redirectTo);
    } catch (e: any) {
      console.error("oauth callback error:", e?.message);
      return res.redirect(`${webUrl}/?login=failed`);
    }
  }
}
