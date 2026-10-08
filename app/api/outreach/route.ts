import { db } from "@/lib/supabase";
import { currentUser } from "@/lib/session";
import { check, handle, ok } from "@/lib/http";
import { whatsappNumber } from "@/lib/site";

export const dynamic = "force-dynamic";

/**
 * Fila de abordagem: leads novos com celular (etapa 1), abordados aguardando o 2º e o último lembrete
 * (etapas 2 e 3) e os que concluíram a sequência sem resposta. Cada lead vem com a data de envio de cada etapa.
 */
export async function GET(req: Request) {
  try {
    const project = new URL(req.url).searchParams.get("project");
    const now = new Date();
    let seq = db().from("prospects").select("*").eq("status", "abordado").order("next_followup_at", { ascending: true, nullsFirst: false }).limit(400);
    let fresh = db().from("prospects").select("*").eq("status", "novo").neq("phone", "").order("score", { ascending: false }).limit(300);
    if (project) { seq = seq.eq("project_id", project); fresh = fresh.eq("project_id", project); }
    const seqRows = check(await seq) as any[];
    const freshRows = (check(await fresh) as any[]).filter((p) => whatsappNumber(p.phone) && !(p.contact_step > 0)).slice(0, 100);

    // Data do envio de cada etapa (o primeiro registro de cada passo).
    const sent: Record<string, Record<number, string>> = {};
    const ids = seqRows.map((p) => p.id);
    for (let i = 0; i < ids.length; i += 200) {
      const evs = check(await db().from("outreach_events").select("prospect_id,step,created_at").eq("kind", "enviado")
        .in("prospect_id", ids.slice(i, i + 200)).order("created_at")) as { prospect_id: string; step: number; created_at: string }[];
      for (const e of evs) (sent[e.prospect_id] ??= {})[e.step] ??= e.created_at;
    }

    // "Hoje" no fuso de São Paulo (UTC−3, sem horário de verão desde 2019).
    const sp = new Date(now.getTime() - 3 * 3600e3);
    const startUtc = new Date(Date.UTC(sp.getUTCFullYear(), sp.getUTCMonth(), sp.getUTCDate(), 3)).toISOString();
    const me = await currentUser();
    const today = check(await db().from("outreach_events").select("created_by").eq("kind", "enviado").gte("created_at", startUtc)) as { created_by: string }[];

    // Líder de avaliações por busca, para personalizar a mensagem ("o primeiro colocado tem X").
    const queries = [...new Set([...seqRows, ...freshRows].map((p) => p.query))];
    const leaders: Record<string, number> = {};
    for (let i = 0; i < queries.length; i += 100) {
      const all = check(await db().from("prospects").select("query,reviews_count").in("query", queries.slice(i, i + 100)).lte("rank_in_search", 3)) as any[];
      for (const r of all) leaders[r.query] = Math.max(leaders[r.query] ?? 0, r.reviews_count ?? 0);
    }

    const leads = [...seqRows.map((p) => ({ ...p, sent: sent[p.id] ?? {} })), ...freshRows.map((p) => ({ ...p, sent: {} }))];
    return ok({
      leads, leaders, sentToday: today.length,
      sentTodayMine: me ? today.filter((t) => t.created_by === me.email).length : 0,
    });
  } catch (e) { return handle(e); }
}
