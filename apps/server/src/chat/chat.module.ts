import { Module } from "@nestjs/common";
import { ChatController } from "./chat.controller";
import { ChatService } from "./chat.service";
import { LlmModule } from "../llm/llm.module";
import { PersonasModule } from "../personas/personas.module";
import { AuthModule } from "../auth/auth.module";
import { GroupChatService } from "./group-chat.service";

@Module({
  imports: [LlmModule, PersonasModule, AuthModule],
  controllers: [ChatController],
  providers: [ChatService, GroupChatService],
})
export class ChatModule {}
