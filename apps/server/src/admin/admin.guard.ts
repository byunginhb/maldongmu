import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { timingSafeEqual } from "crypto";

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest();
    const key = String(req.headers["x-admin-key"] || "");
    const secret = process.env.ADMIN_PASSWORD || "";
    // 기본값/미설정은 무조건 거부 (배포 시 약한 시크릿 방지)
    if (!secret || secret === "change-me") throw new UnauthorizedException();
    const a = Buffer.from(key);
    const b = Buffer.from(secret);
    if (a.length !== b.length || !timingSafeEqual(a, b)) throw new UnauthorizedException();
    return true;
  }
}
