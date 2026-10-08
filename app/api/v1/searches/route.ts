import { db } from "@/lib/supabase";
import { apiError, authenticate, reply } from "@/lib/apiv1";
import { HOT } from "@/lib/market";

export const dynamic = "force-dynamic";

/** GET /api/v1/searches — cada busca feita (nicho + cidade) com totais. */
export async function GET(req: Request) {
  const key = await authenticate(req, "read");
  if (key instanceof Response) return key;
  const { data, error } = await db().from("prospects").select("query,score,website,issues,updated_at").limit(20000);
  if (error) return apiError(500, "db_error", "Não foi possível ler as buscas.");
  const by = new Map<string, { search_query: string; niche: string | null; city: string | null; total: number; hot: number; without_own_site: number; last_update: string }>();
  for (const r of data ?? []) {
    const [niche, city] = String(r.query).split(" em ");
    const s = by.get(r.query) ?? { search_query: r.query, niche: niche?.trim() || null, city: city?.trim() || null, total: 0, hot: 0, without_own_site: 0, last_update: r.updated_at };
    s.total++;
    if ((r.score ?? 0) >= HOT) s.hot++;
    if (!r.website || (r.issues ?? []).some((i: { code: string }) => i.code === "social_only")) s.without_own_site++;
    if (r.updated_at > s.last_update) s.last_update = r.updated_at;
    by.set(r.query, s);
  }
  const list = [...by.values()].sort((a, b) => b.last_update.localeCompare(a.last_update));
  return reply({ data: list, meta: { count: list.length } });
}
