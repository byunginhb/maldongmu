import { Module } from "@nestjs/common";
import { ChatController } from "./chat.controller";
import { ChatService } from "./chat.service";
import { LlmModule } from "../llm/llm.module";
import { PersonasModule } from "../personas/personas.module";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [LlmModule, PersonasModule, AuthModule],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
