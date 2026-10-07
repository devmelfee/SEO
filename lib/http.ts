import "server-only";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { ConfigError } from "./supabase";

export const ok = (data: unknown, status = 200) => NextResponse.json({ data }, { status });
export const fail = (status: number, message: string) => NextResponse.json({ error: { message } }, { status });

/** Converte exceções em respostas com mensagem legível, sem vazar detalhes internos. */
export function handle(e: unknown) {
  if (e instanceof ZodError) return fail(400, "Dados inválidos: " + e.issues.map((i) => i.path.join(".") + " " + i.message).join("; "));
  if (e instanceof ConfigError) return fail(503, e.message);
  console.error(e);
  return fail(500, e instanceof Error ? e.message : "Erro interno");
}

/** Erro do PostgREST/Supabase → exceção. */
export function check<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error("Banco: " + res.error.message);
  return res.data;
}
