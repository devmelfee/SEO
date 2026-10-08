import "server-only";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { ConfigError } from "./supabase";

export const ok = (data: unknown, status = 200) => NextResponse.json({ data }, { status });
export const fail = (status: number, message: string, code?: string) => NextResponse.json({ error: { message, ...(code ? { code } : {}) } }, { status });

/** Limite de uso da pessoa atingido (consultas ao Google ou gerações de IA). */
export class LimitError extends Error {
  constructor(message: string, public resetAt: string | null) { super(message); }
}

/** Converte exceções em respostas com mensagem legível, sem vazar detalhes internos. */
export function handle(e: unknown) {
  if (e instanceof ZodError) return fail(400, "Dados inválidos: " + e.issues.map((i) => i.path.join(".") + " " + i.message).join("; "));
  if (e instanceof ConfigError) return fail(503, e.message);
  if (e instanceof LimitError) return fail(429, e.message, "limit_reached");
  console.error(e);
  return fail(500, e instanceof Error ? e.message : "Erro interno");
}

/** Erro do PostgREST/Supabase → exceção. */
export function check<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error("Banco: " + res.error.message);
  return res.data;
}
