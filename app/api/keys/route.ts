import { z } from "zod";
import { db } from "@/lib/supabase";
import { currentUser } from "@/lib/session";
import { check, fail, handle, ok } from "@/lib/http";
import { API_SCOPES, newApiKey } from "@/lib/leadApi";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const me = await currentUser();
  if (!me) return { error: fail(401, "Sessão expirada.") };
  if (me.role !== "admin") return { error: fail(403, "Só administradores gerenciam chaves da API.") };
  return { me };
}

export async function GET() {
  try {
    const { error } = await requireAdmin(); if (error) return error;
    return ok(check(await db().from("api_keys").select("id,name,prefix,scopes,created_by,created_at,last_used_at,revoked_at").order("created_at", { ascending: false })));
  } catch (e) { return handle(e); }
}

const Body = z.object({ name: z.string().trim().min(2).max(80), scopes: z.array(z.enum(API_SCOPES)).min(1).default(["read"]) });

/** Cria a chave e devolve o texto dela UMA vez; no banco fica só o hash. */
export async function POST(req: Request) {
  try {
    const { me, error } = await requireAdmin(); if (error) return error;
    const { name, scopes } = Body.parse(await req.json());
    const k = newApiKey();
    const row = check(await db().from("api_keys").insert({ name, prefix: k.prefix, key_hash: k.hash, scopes: [...new Set(["read", ...scopes])], created_by: me!.email })
      .select("id,name,prefix,scopes,created_at").single());
    return ok({ ...row, key: k.key }, 201);
  } catch (e) { return handle(e); }
}

export async function DELETE(req: Request) {
  try {
    const { error } = await requireAdmin(); if (error) return error;
    const id = z.string().uuid().parse(new URL(req.url).searchParams.get("id"));
    check(await db().from("api_keys").update({ revoked_at: new Date().toISOString() }).eq("id", id));
    return ok({ revoked: id });
  } catch (e) { return handle(e); }
}
