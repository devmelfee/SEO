import { db } from "@/lib/supabase";
import { check, handle, ok } from "@/lib/http";
import { whatsappNumber } from "@/lib/site";

export const dynamic = "force-dynamic";

/**
 * Fila do dia: lembretes vencidos (abordados sem resposta) + melhores leads novos com celular,
 * e quantas mensagens a equipe já mandou hoje (fuso de São Paulo).
 */
export async function GET(req: Request) {
  try {
    const project = new URL(req.url).searchParams.get("project");
    const now = new Date();
    let due = db().from("prospects").select("*").eq("status", "abordado").lte("next_followup_at", now.toISOString())
      .order("next_followup_at").limit(100);
    let fresh = db().from("prospects").select("*").eq("status", "novo").neq("phone", "").order("score", { ascending: false }).limit(200);
    if (project) { due = due.eq("project_id", project); fresh = fresh.eq("project_id", project); }
    const dueRows = check(await due) as any[];
    const freshRows = (check(await fresh) as any[]).filter((p) => whatsappNumber(p.phone)).slice(0, 40);

    // "Hoje" no fuso de São Paulo (UTC−3, sem horário de verão desde 2019).
    const sp = new Date(now.getTime() - 3 * 3600e3);
    const startUtc = new Date(Date.UTC(sp.getUTCFullYear(), sp.getUTCMonth(), sp.getUTCDate(), 3));
    const { count } = await db().from("outreach_events").select("id", { count: "exact", head: true })
      .eq("kind", "enviado").gte("created_at", startUtc.toISOString());

    // Líder de avaliações por busca, para personalizar a mensagem ("o primeiro colocado tem X").
    const queries = [...new Set([...dueRows, ...freshRows].map((p) => p.query))];
    const leaders: Record<string, number> = {};
    if (queries.length) {
      const all = check(await db().from("prospects").select("query,reviews_count,rank_in_search").in("query", queries).lte("rank_in_search", 3)) as any[];
      for (const r of all) leaders[r.query] = Math.max(leaders[r.query] ?? 0, r.reviews_count ?? 0);
    }
    return ok({ due: dueRows, fresh: freshRows, sentToday: count ?? 0, leaders });
  } catch (e) { return handle(e); }
}
