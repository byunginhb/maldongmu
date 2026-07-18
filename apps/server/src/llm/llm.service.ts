import { Injectable } from "@nestjs/common";

export interface LlmMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

@Injectable()
export class LlmService {
  /**
   * OpenRouter 스트리밍 호출. 델타 텍스트를 yield하고 마지막에 usage를 반환.
   */
  /**
   * 프롬프트 캐시:
   * - Gemini/OpenAI 계열: 프리픽스가 같으면 자동(implicit) 캐시 — 별도 처리 불필요.
   * - Anthropic 계열: cache_control 브레이크포인트 명시 필요 → 시스템 프롬프트(페르소나 상세)에 적용.
   */
  private withCacheControl(model: string, messages: LlmMessage[]): unknown[] {
    if (!model.startsWith("anthropic/")) return messages;
    return messages.map((m) =>
      m.role === "system"
        ? {
            role: "system",
            content: [{ type: "text", text: m.content, cache_control: { type: "ephemeral" } }],
          }
        : m,
    );
  }

  async *stream(messages: LlmMessage[]): AsyncGenerator<
    { type: "delta"; text: string } | { type: "usage"; promptTokens: number; completionTokens: number }
  > {
    const model = process.env.OPENROUTER_MODEL || "google/gemini-2.5-flash";
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://maldongmu.app",
        "X-Title": "maldongmu",
      },
      body: JSON.stringify({
        model,
        messages: this.withCacheControl(model, messages),
        stream: true,
        usage: { include: true },
      }),
    });

    if (!res.ok || !res.body) {
      const body = await res.text().catch(() => "");
      throw new Error(`OpenRouter error ${res.status}: ${body.slice(0, 300)}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() || "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const data = trimmed.slice(5).trim();
        if (data === "[DONE]") return;
        try {
          const json = JSON.parse(data);
          const delta = json.choices?.[0]?.delta?.content;
          if (delta) yield { type: "delta", text: delta };
          if (json.usage) {
            yield {
              type: "usage",
              promptTokens: json.usage.prompt_tokens || 0,
              completionTokens: json.usage.completion_tokens || 0,
            };
          }
        } catch {
          /* partial line, skip */
        }
      }
    }
  }

  /** 비스트리밍 단발 호출 (추천 등 JSON 응답이 필요한 곳에서 사용) */
  async complete(messages: LlmMessage[]): Promise<string> {
    const model = process.env.OPENROUTER_MODEL || "google/gemini-2.5-flash";
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://maldongmu.app",
        "X-Title": "maldongmu",
      },
      body: JSON.stringify({
        model,
        messages: this.withCacheControl(model, messages),
        stream: false,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`OpenRouter error ${res.status}: ${body.slice(0, 300)}`);
    }
    const json = await res.json();
    return json.choices?.[0]?.message?.content || "";
  }
}
