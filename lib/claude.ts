import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { ConfigError } from "./supabase";
import { DEFAULT_AI_MODEL, modelInfo } from "./limits";

/** Modelo padrão quando o administrador não escolheu um (pode ser trocado por ANTHROPIC_MODEL na Vercel). */
export const MODEL = process.env.ANTHROPIC_MODEL || DEFAULT_AI_MODEL;

// Modelos com recusa por classificador de segurança: o servidor da Anthropic tenta outro modelo sozinho.
const WITH_FALLBACK = new Set(["claude-opus-5-5", "claude-sonnet-5-5"]);

let client: Anthropic | null = null;

export type Generated = { text: string; model: string; inputTokens: number; outputTokens: number };

export async function generate(system: string, prompt: string, maxTokens: number, model: string = MODEL): Promise<Generated> {
  if (!process.env.ANTHROPIC_API_KEY) throw new ConfigError("ANTHROPIC_API_KEY não configurada.");
  client ??= new Anthropic();
  const info = modelInfo(model);
  // Os modelos 5.5 pensam antes de responder (e isso conta como saída): sobra espaço para o texto não ser cortado.
  const max_tokens = info ? Math.min(64000, maxTokens + 8000) : maxTokens;
  const msg = await client.beta.messages
    .stream({
      model, max_tokens, system, messages: [{ role: "user", content: prompt }],
      ...(info ? { output_config: { effort: info.effort } } : {}),
      ...(WITH_FALLBACK.has(model) ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const } : {}),
    })
    .finalMessage();
  if (msg.stop_reason === "refusal") throw new Error("A IA recusou este pedido. Ajuste o prompt e tente de novo.");
  const text = msg.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("\n").trim();
  if (!text) throw new Error("A IA não devolveu texto.");
  const out = msg.stop_reason === "max_tokens" ? text + "\n\n[⚠ Resposta cortada pelo limite de tamanho — regenere ou divida o pedido.]" : text;
  // msg.model é o modelo que de fato respondeu (pode ser o de reserva): é ele que entra no custo.
  return { text: out, model: msg.model || model, inputTokens: msg.usage.input_tokens, outputTokens: msg.usage.output_tokens };
}
