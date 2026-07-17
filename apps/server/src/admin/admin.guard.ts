import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest();
    const key = req.headers["x-admin-key"];
    if (!key || key !== process.env.ADMIN_PASSWORD) throw new UnauthorizedException();
    return true;
  }
}
