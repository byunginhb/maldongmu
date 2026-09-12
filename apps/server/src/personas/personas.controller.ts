import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import { PersonasService } from "./personas.service";
import { AuthGuard } from "../auth/auth.guard";

@Controller("personas")
export class PersonasController {
  constructor(private readonly personas: PersonasService) {}

  @Get("featured")
  featured() {
    return this.personas.featured();
  }

  @Get("occupations")
  occupations() {
    return this.personas.occupations();
  }

  @Get("grannies")
  grannies() {
    return this.personas.grannies();
  }

  @Post("recommend")
  @UseGuards(AuthGuard)
  recommend(@Req() req: any, @Body() body: { concern: string; detail?: string }) {
    // LLM 프롬프트에 들어가는 사용자 입력 — 길이 캡 (chat의 message slice와 동일 관례)
    const concern = String(body.concern || "").slice(0, 30);
    const detail = body.detail ? String(body.detail).slice(0, 300) : undefined;
    return this.personas.recommend(req.userId, concern, detail);
  }

  /** 가상 연애 상대 후보 (공개, LLM 없음). :uuid 라우트보다 먼저 선언 */
  @Get("dating")
  dating(@Query("sex") sex?: string, @Query("ageMin") ageMin?: string, @Query("ageMax") ageMax?: string) {
    return this.personas.dating(String(sex || ""), Number(ageMin), Number(ageMax));
  }

  @Get("random")
  random() {
    return this.personas.random();
  }

  @Get("popular")
  popular() {
    return this.personas.popular();
  }

  @Get("search")
  search(
    @Query("q") q?: string,
    @Query("province") province?: string,
    @Query("sex") sex?: string,
    @Query("ageMin") ageMin?: string,
    @Query("ageMax") ageMax?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.personas.search({
      q,
      province,
      sex,
      ageMin: ageMin ? Number(ageMin) : undefined,
      ageMax: ageMax ? Number(ageMax) : undefined,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    });
  }

  @Get(":uuid/detail")
  detail(@Param("uuid") uuid: string) {
    return this.personas.detailPublic(uuid);
  }

  @Get(":uuid")
  card(@Param("uuid") uuid: string) {
    return this.personas.card(uuid);
  }
}
