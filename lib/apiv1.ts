import "server-only";
import { NextResponse } from "next/server";
import { db, supabaseConfigured } from "./supabase";
import { hashKey, keyFromHeaders, type ApiScope } from "./leadApi";

export type ApiKey = { id: string; name: string; scopes: string[] };

const LIMIT_PER_MIN = 120;
const hits = new Map<string, { n: number; reset: number }>();

/** Resposta da API v1: { data, meta? } ou { error: { code, message } }, sempre com X-Request-Id. */
export function reply(body: unknown, status = 200, extra: Record<string, string> = {}) {
  return NextResponse.json(body, { status, headers: { "X-Request-Id": crypto.randomUUID(), "Cache-Control": "no-store", ...extra } });
}
export const apiError = (status: number, code: string, message: string, extra: Record<string, string> = {}) =>
  reply({ error: { code, message } }, status, extra);

/**
 * Valida a chave (hash SHA-256 no banco), o escopo e o limite de 120 pedidos/min por chave.
 * Devolve a chave ou a resposta de erro pronta.
 */
export async function authenticate(req: Request, scope: ApiScope): Promise<ApiKey | Response> {
  if (!supabaseConfigured()) return apiError(503, "unavailable", "Banco não configurado.");
  const key = keyFromHeaders(req.headers);
  if (!key) return apiError(401, "unauthorized", "Envie a chave no cabeçalho: Authorization: Bearer seo_...");
  const { data } = await db().from("api_keys").select("id,name,scopes,revoked_at").eq("key_hash", hashKey(key)).maybeSingle();
  if (!data || data.revoked_at) return apiError(401, "unauthorized", "Chave inválida ou revogada.");
  if (!data.scopes.includes(scope)) return apiError(403, "forbidden", `Esta chave não tem permissão de ${scope === "write" ? "escrita" : "leitura"}.`);

  // Limite simples por instância do servidor (protege contra laço infinito de integração).
  const now = Date.now();
  const h = hits.get(data.id);
  if (!h || h.reset < now) hits.set(data.id, { n: 1, reset: now + 60_000 });
  else if (++h.n > LIMIT_PER_MIN) {
    const wait = Math.ceil((h.reset - now) / 1000);
    return apiError(429, "rate_limited", `Limite de ${LIMIT_PER_MIN} pedidos por minuto. Tente em ${wait}s.`, { "Retry-After": String(wait) });
  }
  db().from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", data.id).then(() => {}, () => {});
  return { id: data.id, name: data.name, scopes: data.scopes };
}

/** Links dos sites de prévia dos leads, por id do lead. */
export async function previewUrls(req: Request, ids: string[]): Promise<Record<string, string>> {
  if (!ids.length) return {};
  const origin = new URL(req.url).origin;
  const out: Record<string, string> = {};
  for (let i = 0; i < ids.length; i += 200) {
    const { data } = await db().from("sites").select("prospect_id,slug").in("prospect_id", ids.slice(i, i + 200));
    for (const s of data ?? []) if (s.prospect_id) out[s.prospect_id] = `${origin}/s/${s.slug}`;
  }
  return out;
}
