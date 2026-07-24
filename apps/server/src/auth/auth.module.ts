import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { AuthGuard } from "./auth.guard";
import { OauthService } from "./oauth.service";

@Module({
  imports: [
    // registerAsync: 팩토리가 DI 단계(ConfigModule의 .env 로드 후)에 실행돼 실제 JWT_SECRET을 읽는다.
    // register()는 import 시점(ConfigModule.forRoot 전)에 평가돼 항상 dev-secret으로 폴백되던 버그가 있었음.
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: process.env.JWT_SECRET || "dev-secret",
        signOptions: { expiresIn: "180d" },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, AuthGuard, OauthService],
  exports: [AuthService, AuthGuard, JwtModule],
})
export class AuthModule {}
