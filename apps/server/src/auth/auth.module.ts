import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { AuthGuard } from "./auth.guard";
import { OauthService } from "./oauth.service";

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || "dev-secret",
      signOptions: { expiresIn: "180d" },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, AuthGuard, OauthService],
  exports: [AuthService, AuthGuard, JwtModule],
})
export class AuthModule {}
