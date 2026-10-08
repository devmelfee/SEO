import { db } from "@/lib/supabase";
import { apiError, authenticate, reply } from "@/lib/apiv1";
import { STATUSES } from "@/lib/opportunity";

export const dynamic = "force-dynamic";

/** GET /api/v1/projects — projetos com a contagem de leads por status. */
export async function GET(req: Request) {
  const key = await authenticate(req, "read");
  if (key instanceof Response) return key;
  const [{ data: projects, error }, { data: leads }] = await Promise.all([
    db().from("projects").select("id,name,niche,created_at,updated_at").order("updated_at", { ascending: false }),
    db().from("prospects").select("project_id,status").not("project_id", "is", null).limit(50000),
  ]);
  if (error) return apiError(500, "db_error", "Não foi possível ler os projetos.");
  const data = (projects ?? []).map((p) => {
    const mine = (leads ?? []).filter((l) => l.project_id === p.id);
    return { ...p, total: mine.length, by_status: Object.fromEntries(STATUSES.map((s) => [s, mine.filter((l) => l.status === s).length])) };
  });
  return reply({ data, meta: { count: data.length } });
}
