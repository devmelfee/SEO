import { z } from "zod";
import { db } from "@/lib/supabase";
import { currentUser } from "@/lib/session";
import { check, handle, ok } from "@/lib/http";

export const dynamic = "force-dynamic";

/** Projetos com a contagem de leads por status (para o painel). */
export async function GET() {
  try {
    const projects = check(await db().from("projects").select("*").order("updated_at", { ascending: false })) as any[];
    const leads = check(await db().from("prospects").select("project_id,status,score").not("project_id", "is", null)) as
      { project_id: string; status: string; score: number }[];
    const stats = new Map<string, Record<string, number>>();
    for (const l of leads) {
      const s = stats.get(l.project_id) ?? { total: 0, novo: 0, abordado: 0, respondeu: 0, proposta: 0, fechado: 0, descartado: 0, quentes: 0 };
      s.total++; s[l.status] = (s[l.status] ?? 0) + 1; if (l.score >= 50) s.quentes++;
      stats.set(l.project_id, s);
    }
    return ok(projects.map((p) => ({ ...p, stats: stats.get(p.id) ?? { total: 0, novo: 0, abordado: 0, respondeu: 0, proposta: 0, fechado: 0, descartado: 0, quentes: 0 } })));
  } catch (e) { return handle(e); }
}

const Create = z.object({ name: z.string().trim().min(2).max(120), niche: z.string().trim().max(120).optional().default(""), notes: z.string().max(2000).optional().default("") });

export async function POST(req: Request) {
  try {
    const body = Create.parse(await req.json());
    const me = await currentUser();
    const row = check(await db().from("projects").insert({ ...body, created_by: me?.email ?? "" }).select("*").single());
    return ok(row, 201);
  } catch (e) { return handle(e); }
}
