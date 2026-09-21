import { Controller, Get, Param } from "@nestjs/common";
import { AffectionService } from "./affection.service";

/** 공개 공유 카드 데이터 — 인증 없음 (OG 이미지·공유 페이지가 서버 사이드에서 읽는다) */
@Controller("share")
export class ShareController {
  constructor(private readonly affection: AffectionService) {}

  @Get(":token")
  get(@Param("token") token: string) {
    return this.affection.getShare(String(token || "").slice(0, 32));
  }
}
