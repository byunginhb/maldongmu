import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { AuthService } from "./auth.service";

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}

  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest();
    const header = req.headers["authorization"] || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) throw new UnauthorizedException();
    const payload = this.auth.verify(token);
    if (!payload) throw new UnauthorizedException();
    // 토큰은 유효하지만 계정이 삭제된 경우(DB 초기화 등) → 401로 재발급 유도
    if (!this.auth.userExists(payload.sub)) throw new UnauthorizedException();
    req.userId = payload.sub;
    return true;
  }
}
