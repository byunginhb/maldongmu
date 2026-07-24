import { Body, Controller, Get, Param, Post, Req, UseGuards } from "@nestjs/common";
import { ThrottlerGuard, Throttle } from "@nestjs/throttler";
import { AuthGuard } from "../auth/auth.guard";
import { InterviewService } from "./interview.service";

@Controller("interviews")
@UseGuards(AuthGuard)
export class InterviewController {
  constructor(private readonly interview: InterviewService) {}

  /** 새 인터뷰 시작 (백그라운드 실행). per-IP 레이트리밋은 여기만 — 비싼 엔드포인트 */
  @Post()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  create(@Req() req: any, @Body() body: { input: string; kind?: "text" | "url" }) {
    return this.interview.create(req.userId, body?.input || "", body?.kind);
  }

  @Get("credits")
  credits(@Req() req: any) {
    return this.interview.credits(req.userId);
  }

  @Get()
  list(@Req() req: any) {
    return this.interview.list(req.userId);
  }

  /** 진행 상황 스냅샷 (폴링). owner 스코프는 서비스에서 강제 */
  @Get(":id")
  get(@Req() req: any, @Param("id") id: string) {
    return this.interview.getSnapshot(req.userId, id);
  }
}
