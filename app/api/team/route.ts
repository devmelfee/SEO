import { z } from "zod";
import { db } from "@/lib/supabase";
import { currentUser } from "@/lib/session";
import { check, fail, handle, ok } from "@/lib/http";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const me = await currentUser();
  if (!me) return { error: fail(401, "Sessão expirada.") };
  if (me.role !== "admin") return { error: fail(403, "Só administradores gerenciam a equipe.") };
  return { me };
}

export async function GET() {
  try {
    const me = await currentUser();
    if (!me) return fail(401, "Sessão expirada.");
    const rows = check(await db().from("team_members").select("email,role,added_by,created_at,phone").order("created_at"));
    return ok({ me, members: rows });
  } catch (e) { return handle(e); }
}

const Add = z.object({ email: z.string().trim().toLowerCase().email().max(200), role: z.enum(["admin", "member"]).default("member") });

export async function POST(req: Request) {
  try {
    const { me, error } = await requireAdmin(); if (error) return error;
    const body = Add.parse(await req.json());
    check(await db().from("team_members").upsert({ ...body, added_by: me!.email }, { onConflict: "email" }));
    return ok({ added: body.email }, 201);
  } catch (e) { return handle(e); }
}

export async function DELETE(req: Request) {
  try {
    const { me, error } = await requireAdmin(); if (error) return error;
    const email = z.string().trim().toLowerCase().email().parse(new URL(req.url).searchParams.get("email"));
    if (email === me!.email.toLowerCase()) return fail(400, "Você não pode remover a si mesmo.");
    check(await db().from("team_members").delete().eq("email", email));
    return ok({ removed: email });
  } catch (e) { return handle(e); }
}

const Patch = z.object({
  email: z.string().trim().toLowerCase().email(),
  phone: z.string().trim().max(30).optional(),
  // Limite próprio da pessoa; null volta ao padrão da equipe. Cada campo: número ou null (= sem limite).
  limits: z.object({
    window_hours: z.number().int().min(1).max(168),
    searches_window: z.number().int().min(0).nullable(), searches_week: z.number().int().min(0).nullable(),
    ai_window: z.number().int().min(0).nullable(), ai_week: z.number().int().min(0).nullable(),
  }).nullable().optional(),
  reset: z.literal(true).optional(), // "liberar agora": zera a contagem das janelas
});

/** Admin ajusta telefone, limites ou libera a contagem de alguém. Cada um pode mudar o próprio telefone. */
export async function PATCH(req: Request) {
  try {
    const me = await currentUser();
    if (!me) return fail(401, "Sessão expirada.");
    const body = Patch.parse(await req.json());
    const self = body.email === me.email.toLowerCase();
    if (me.role !== "admin" && (!self || body.limits !== undefined || body.reset)) return fail(403, "Só administradores mudam limites.");
    const patch: Record<string, unknown> = {};
    if (body.phone !== undefined) patch.phone = body.phone;
    if (body.limits !== undefined) patch.limits = body.limits;
    if (body.reset) patch.usage_reset_at = new Date().toISOString();
    if (!Object.keys(patch).length) return fail(400, "Nada para alterar.");
    const row = check(await db().from("team_members").update(patch).eq("email", body.email).select("email,phone,limits,usage_reset_at").maybeSingle());
    if (!row) return fail(404, "Pessoa não está na equipe.");
    return ok(row);
  } catch (e) { return handle(e); }
}
