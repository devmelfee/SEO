import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { ConfigError } from "./supabase";

// O protótipo usava claude-sonnet-4-6; troque por ANTHROPIC_MODEL na Vercel sem mexer no código.
export const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

let client: Anthropic | null = null;

export type Generated = { text: string; model: string; inputTokens: number; outputTokens: number };

export async function generate(system: string, prompt: string, maxTokens: number): Promise<Generated> {
  if (!process.env.ANTHROPIC_API_KEY) throw new ConfigError("ANTHROPIC_API_KEY não configurada.");
  client ??= new Anthropic();
  // Streaming evita timeout HTTP em respostas longas; finalMessage() junta tudo.
  const msg = await client.messages
    .stream({ model: MODEL, max_tokens: maxTokens, system, messages: [{ role: "user", content: prompt }] })
    .finalMessage();
  if (msg.stop_reason === "refusal") throw new Error("A IA recusou este pedido. Ajuste o prompt e tente de novo.");
  const text = msg.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("\n").trim();
  if (!text) throw new Error("A IA não devolveu texto.");
  const out = msg.stop_reason === "max_tokens" ? text + "\n\n[⚠ Resposta cortada pelo limite de tamanho — regenere ou divida o pedido.]" : text;
  return { text: out, model: MODEL, inputTokens: msg.usage.input_tokens, outputTokens: msg.usage.output_tokens };
}
