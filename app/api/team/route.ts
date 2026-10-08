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
    const rows = check(await db().from("team_members").select("email,role,added_by,created_at").order("created_at"));
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
