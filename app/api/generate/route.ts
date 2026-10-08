import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { generate } from "@/lib/claude";
import { currentUser } from "@/lib/session";
import { guard, recordUsage } from "@/lib/usage";
import { llmCostUsd } from "@/lib/limits";
import { fail, handle, ok } from "@/lib/http";

export const maxDuration = 300;

const Body = z.object({
  system: z.string().min(1).max(4000),
  prompt: z.string().min(1).max(200_000),
  maxTokens: z.number().int().min(256).max(16000).default(4096),
});

export async function POST(req: Request) {
  try {
    const { system, prompt, maxTokens } = Body.parse(await req.json());
    const me = await currentUser();
    await guard(me, "llm", 1);
    const g = await generate(system, prompt, maxTokens);
    await recordUsage(me, { kind: "llm", action: "texto_ia", query: system.slice(0, 120), units: 1, model: g.model,
      input_tokens: g.inputTokens, output_tokens: g.outputTokens, cost_usd: llmCostUsd(g.model, g.inputTokens, g.outputTokens) });
    return ok({ text: g.text });
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) return fail(429, "Limite de uso da IA atingido. Espere um minuto e tente de novo.");
    if (e instanceof Anthropic.AuthenticationError) return fail(503, "ANTHROPIC_API_KEY inválida.");
    if (e instanceof Anthropic.APIError) return fail(502, `Erro da IA (${e.status ?? "rede"}): ${e.message}`);
    return handle(e);
  }
}
