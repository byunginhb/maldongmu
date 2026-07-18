import { Body, Controller, Get, Param, Post, Req, Res, UseGuards } from "@nestjs/common";
import { Response } from "express";
import { ChatService } from "./chat.service";
import { LlmMessage, LlmService } from "../llm/llm.service";
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

  /** 첫 만남: 페르소나가 먼저 인사를 건넨다 (빈 대화방에서만) */
  @Post("chat/:conversationId/greeting")
  async greeting(@Req() req: any, @Param("conversationId") conversationId: string, @Res() res: Response) {
    const { conv, messages } = this.chat.buildGreetingMessages(req.userId, conversationId);
    await this.relay(res, messages, (full, tokensIn, tokensOut) =>
      this.chat.saveGreeting(req.userId, conversationId, conv.persona_uuid, full, tokensIn, tokensOut),
    );
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
    await this.relay(res, messages, (full, tokensIn, tokensOut) =>
      this.chat.saveTurn(req.userId, conversationId, conv.persona_uuid, userText, full, tokensIn, tokensOut),
    );
  }

  /** OpenRouter 스트림을 SSE로 릴레이하고, 완료 시 onDone으로 저장 위임 */
  private async relay(
    res: Response,
    messages: LlmMessage[],
    onDone: (full: string, tokensIn: number, tokensOut: number) => void,
  ) {
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
      onDone(full, tokensIn, tokensOut);
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    } catch (e: any) {
      res.write(`data: ${JSON.stringify({ error: "응답 생성에 실패했어요. 다시 시도해주세요." })}\n\n`);
      console.error("chat stream error:", e?.message);
    }
    res.end();
  }
}
