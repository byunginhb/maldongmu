import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule } from "@nestjs/throttler";
import { DbModule } from "./db/db.module";
import { PersonasModule } from "./personas/personas.module";
import { ChatModule } from "./chat/chat.module";
import { AuthModule } from "./auth/auth.module";
import { AdminModule } from "./admin/admin.module";
import { InterviewModule } from "./interview/interview.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // 레이트리밋: 신규 인터뷰 컨트롤러에서 @UseGuards(ThrottlerGuard)로 스코프 적용
    // (전역 적용은 프록시 뒤 공유 IP 리스크가 있어 신규 공격표면에만 한정; 인터뷰 남용의
    //  1차 방어는 서비스의 per-user 시도 카운터 — 프록시에 무관하고 정확).
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]),
    DbModule,
    AuthModule,
    PersonasModule,
    ChatModule,
    AdminModule,
    InterviewModule,
  ],
})
export class AppModule {}
