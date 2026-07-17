import { Controller, Get, Param, Query } from "@nestjs/common";
import { PersonasService } from "./personas.service";

@Controller("personas")
export class PersonasController {
  constructor(private readonly personas: PersonasService) {}

  @Get("featured")
  featured() {
    return this.personas.featured();
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
