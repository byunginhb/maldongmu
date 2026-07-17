import { Body, Controller, Get, Param, Post, Req, Res, UseGuards } from "@nestjs/common";
import { Response } from "express";
import { ChatService } from "./chat.service";
import { LlmService } from "../llm/llm.service";
import { AuthGuard } from "../auth/auth.guard";

@Controller()
@UseGuards(AuthGuard)
export class ChatController {
  constructor(
    private readonly chat: ChatService,
    private readonly llm: LlmService,
  ) {}

  @Post("conversations")
  create(@Req() req: any, @Body() body: { personaUuid: string }) {
    return this.chat.createConversation(req.userId, body.personaUuid);
  }

  @Post("feedback")
  feedback(@Req() req: any, @Body() body: { content: string }) {
    return this.chat.saveFeedback(req.userId, (body.content || "").trim());
  }

  @Get("conversations")
  list(@Req() req: any) {
    return this.chat.listConversations(req.userId);
  }

  @Get("conversations/:id")
  get(@Req() req: any, @Param("id") id: string) {
    return this.chat.getConversation(req.userId, id);
  }

  @Post("chat/:conversationId")
  async send(
    @Req() req: any,
    @Param("conversationId") conversationId: string,
    @Body() body: { message: string },
    @Res() res: Response,
  ) {
    const userText = (body.message || "").slice(0, 2000);
    const { conv, messages } = this.chat.buildLlmMessages(req.userId, conversationId, userText);

    res.set({
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });
    res.flushHeaders();

    let full = "";
    let tokensIn = 0;
    let tokensOut = 0;
    try {
      for await (const ev of this.llm.stream(messages)) {
        if (ev.type === "delta") {
          full += ev.text;
          res.write(`data: ${JSON.stringify({ delta: ev.text })}\n\n`);
        } else {
          tokensIn = ev.promptTokens;
          tokensOut = ev.completionTokens;
        }
      }
      this.chat.saveTurn(req.userId, conversationId, conv.persona_uuid, userText, full, tokensIn, tokensOut);
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    } catch (e: any) {
      res.write(`data: ${JSON.stringify({ error: "응답 생성에 실패했어요. 다시 시도해주세요." })}\n\n`);
      console.error("chat stream error:", e?.message);
    }
    res.end();
  }
}
