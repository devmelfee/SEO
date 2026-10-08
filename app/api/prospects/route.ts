import { db } from "@/lib/supabase";
import { check, handle, ok } from "@/lib/http";

export const dynamic = "force-dynamic";

/** Lista de leads. Filtros: ?query=… (busca de origem) &status=… */
export async function GET(req: Request) {
  try {
    const u = new URL(req.url);
    let q = db().from("prospects").select("*").order("score", { ascending: false }).limit(500);
    const query = u.searchParams.get("query");
    const status = u.searchParams.get("status");
    const project = u.searchParams.get("project");
    if (project) q = q.eq("project_id", project);
    if (query && !project) q = q.eq("query", query);
    if (status) q = q.eq("status", status);
    const rows = check(await q);
    const queries = check(await db().from("prospects").select("query").order("updated_at", { ascending: false }).limit(1000));
    return ok({ prospects: rows, queries: [...new Set((queries as { query: string }[]).map((r) => r.query))] });
  } catch (e) { return handle(e); }
}
