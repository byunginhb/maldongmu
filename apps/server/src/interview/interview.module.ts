import { Module } from "@nestjs/common";
import { InterviewController } from "./interview.controller";
import { InterviewService } from "./interview.service";
import { LlmModule } from "../llm/llm.module";
import { PersonasModule } from "../personas/personas.module";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [LlmModule, PersonasModule, AuthModule],
  controllers: [InterviewController],
  providers: [InterviewService],
})
export class InterviewModule {}
