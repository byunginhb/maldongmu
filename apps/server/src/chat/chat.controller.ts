import { BadRequestException, Body, Controller, Get, Param, Post, Req, Res, UseGuards } from "@nestjs/common";
import { Response } from "express";
import { ChatService } from "./chat.service";
import { LlmMessage, LlmService } from "../llm/llm.service";
import { AuthGuard } from "../auth/auth.guard";
import { GroupChatService, GROUP_LIMITS } from "./group-chat.service";

@Controller()
@UseGuards(AuthGuard)
export class ChatController {
  constructor(
    private readonly chat: ChatService,
    private readonly llm: LlmService,
    private readonly group: GroupChatService,
  ) {}

  @Get("chat/features")
  features() {
    return { groupChat: true, maxFriends: 2, maxTurns: GROUP_LIMITS.turns };
  }

  @Post("conversations/today-friends")
  todayFriends(@Req() req: any) {
    return this.group.today(req.userId);
  }

  @Post("conversations/:id/friend")
  invite(@Req() req: any, @Param("id") id: string, @Body() body: { personaUuid: string }) {
    return this.group.invite(req.userId, id, body?.personaUuid);
  }

  @Post("chat/:conversationId/stop")
  stop(@Req() req: any, @Param("conversationId") id: string) {
    return this.group.stop(req.userId, id);
  }

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

  /** 첫 만남: 인물 카드로 만든 가벼운 인사를 즉시 반환 (LLM 대기 없음) */
  @Post("chat/:conversationId/greeting")
  greeting(
    @Req() req: any,
    @Param("conversationId") conversationId: string,
    @Body() body: { lang?: string },
  ) {
    const conversation = this.chat.getConversation(req.userId, conversationId);
    if (conversation.second_persona_uuid) {
      const snapshot = this.group.greeting(req.userId, conversationId);
      return { greeting: "", messages: snapshot.messages };
    }
    this.group.assertIdle(req.userId);
    const { conv, text } = this.chat.buildGreetingText(req.userId, conversationId, body?.lang);
    this.chat.saveGreeting(req.userId, conversationId, conv.persona_uuid, text, 0, 0);
    return { greeting: text };
  }

  @Post("chat/:conversationId")
  async send(
    @Req() req: any,
    @Param("conversationId") conversationId: string,
    @Body() body: { message: string },
    @Res() res: Response,
  ) {
    if (typeof body?.message !== "string" || !body.message.trim()) throw new BadRequestException("메시지를 입력해주세요");
    const userText = body.message.trim().slice(0, 2000);
    const conversation = this.chat.getConversation(req.userId, conversationId);
    const job = this.group.acquire(req.userId, conversationId);
    const disconnect = () => { if (!res.writableEnded) job.controller.abort(); };
    res.on("close", disconnect);
    try {
      if (conversation.second_persona_uuid) {
        const participants = this.group.reserve(req.userId, conversationId, userText);
        res.set({ "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive", "X-Accel-Buffering": "no" });
        res.flushHeaders();
        try {
          await this.group.run(req.userId, conversationId, participants, job.controller.signal, (event) => {
            if (!res.destroyed) res.write(`data: ${JSON.stringify(event)}\n\n`);
          });
        } catch (error: any) {
          if (!job.controller.signal.aborted && !res.destroyed) {
            res.write(`data: ${JSON.stringify({ error: "친구들이 잠시 말을 멈췄어요. 한마디 건네면 다시 이어갈 수 있어요." })}\n\n`);
            console.error("group chat error:", error?.message);
          }
        }
        res.end();
      } else {
        const { conv, messages } = this.chat.buildLlmMessages(req.userId, conversationId, userText);
        await this.relay(res, messages, (full, tokensIn, tokensOut) =>
          this.chat.saveTurn(req.userId, conversationId, conv.persona_uuid, userText, full, tokensIn, tokensOut),
          job.controller.signal,
        );
      }
    } finally {
      res.off("close", disconnect);
      job.release();
    }
  }

  /** OpenRouter 스트림을 SSE로 릴레이하고, 완료 시 onDone으로 저장 위임 */
  private async relay(
    res: Response,
    messages: LlmMessage[],
    onDone: (full: string, tokensIn: number, tokensOut: number) => void,
    signal: AbortSignal,
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
      for await (const ev of this.llm.stream(messages, { signal: AbortSignal.any([signal, AbortSignal.timeout(90_000)]) })) {
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
