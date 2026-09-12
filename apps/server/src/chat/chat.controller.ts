import { BadRequestException, Body, Controller, Get, Param, Post, Req, Res, UseGuards } from "@nestjs/common";
import { Response } from "express";
import { setTimeout as delay } from "node:timers/promises";
import { ChatService } from "./chat.service";
import { LlmMessage, LlmService } from "../llm/llm.service";
import { AuthGuard } from "../auth/auth.guard";
import { GroupChatService, GROUP_LIMITS } from "./group-chat.service";
import { AffectionService } from "./affection.service";

@Controller()
@UseGuards(AuthGuard)
export class ChatController {
  constructor(
    private readonly chat: ChatService,
    private readonly llm: LlmService,
    private readonly group: GroupChatService,
    private readonly affection: AffectionService,
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
  create(@Req() req: any, @Body() body: { personaUuid: string; mode?: string }) {
    return this.chat.createConversation(req.userId, body.personaUuid, undefined, body?.mode === "dating" ? "dating" : undefined);
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
        // 가상 연애: 호감도 심판을 답변 생성과 병렬로 (사용자 메시지만 보면 되므로 답변을 기다릴 필요 없음)
        const judging = conversation.mode === "dating"
          ? this.affection.estimate(conversationId, conversation.persona, userText, job.controller.signal).catch(() => undefined) : null;
        await this.relay(res, messages, async (full, tokensIn, tokensOut) => {
          const assistantId = this.chat.saveTurn(req.userId, conversationId, conv.persona_uuid, userText, full, tokensIn, tokensOut);
          if (!judging) return;
          // 답변이 끝난 뒤 1.5초까지만 기다린다. 늦게 온 결과는 기록만 해두고(다음 턴·새로고침에 반영) done을 잡지 않는다.
          const result = await Promise.race([judging, delay(1500, undefined)]);
          if (!result) { judging.then((late) => late && this.affection.record(assistantId, late)); return; }
          this.affection.record(assistantId, result);
          return { type: "affection", ...result };
        }, job.controller.signal);
      }
    } finally {
      res.off("close", disconnect);
      job.release();
    }
  }

  /** OpenRouter 스트림을 SSE로 릴레이하고, 완료 시 onDone으로 저장 위임. onDone이 이벤트를 돌려주면 done 앞에 흘려보낸다 */
  private async relay(
    res: Response,
    messages: LlmMessage[],
    onDone: (full: string, tokensIn: number, tokensOut: number) => void | Promise<object | void>,
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
      const extra = await onDone(full, tokensIn, tokensOut);
      if (extra && !res.destroyed) res.write(`data: ${JSON.stringify(extra)}\n\n`);
      if (!res.destroyed) res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    } catch (e: any) {
      res.write(`data: ${JSON.stringify({ error: "응답 생성에 실패했어요. 다시 시도해주세요." })}\n\n`);
      console.error("chat stream error:", e?.message);
    }
    res.end();
  }
}
