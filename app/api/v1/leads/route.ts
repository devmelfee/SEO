import { z } from "zod";
import { db } from "@/lib/supabase";
import { apiError, authenticate, previewUrls, reply } from "@/lib/apiv1";
import { decodeCursor, encodeCursor, leadsToCsv, toPublicLead } from "@/lib/leadApi";
import { STATUSES } from "@/lib/opportunity";

export const dynamic = "force-dynamic";

const bool = z.enum(["true", "false"]).transform((v) => v === "true");
const Query = z.object({
  query: z.string().trim().max(200).optional(),
  project_id: z.string().uuid().optional(),
  status: z.string().optional().transform((s) => (s ? s.split(",").map((x) => x.trim()).filter(Boolean) : undefined))
    .refine((l) => !l || l.every((x) => (STATUSES as readonly string[]).includes(x)), `status deve ser um de: ${STATUSES.join(", ")}`),
  min_score: z.coerce.number().int().min(0).max(100).optional(),
  has_own_site: bool.optional(),
  updated_since: z.string().datetime({ offset: true }).optional(),
  limit: z.coerce.number().int().min(1).max(500).default(100),
  cursor: z.string().max(200).optional(),
  format: z.enum(["json", "csv"]).default("json"),
});

/**
 * GET /api/v1/leads — empresas das buscas, mais atualizadas primeiro.
 * Para sincronizar um CRM: guarde o maior updated_at e peça só o que mudou com ?updated_since=.
 */
export async function GET(req: Request) {
  const key = await authenticate(req, "read");
  if (key instanceof Response) return key;
  const parsed = Query.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!parsed.success) return apiError(400, "invalid_params", parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "));
  const q = parsed.data;
  const csv = q.format === "csv";
  const limit = csv ? 5000 : q.limit;
  const offset = csv ? 0 : decodeCursor(q.cursor ?? null);

  let s = db().from("prospects").select("*").order("updated_at", { ascending: false }).order("id");
  if (q.query) s = s.eq("query", q.query);
  if (q.project_id) s = s.eq("project_id", q.project_id);
  if (q.status) s = s.in("status", q.status);
  if (q.min_score != null) s = s.gte("score", q.min_score);
  if (q.updated_since) s = s.gte("updated_at", q.updated_since);
  if (q.has_own_site === false) s = s.or('website.eq.,issues.cs.[{"code":"social_only"}]');
  if (q.has_own_site === true) s = s.neq("website", "").not("issues", "cs", '[{"code":"social_only"}]');
  const { data, error } = await s.range(offset, offset + limit); // um a mais para saber se há próxima página
  if (error) return apiError(500, "db_error", "Não foi possível ler os leads.");

  const rows = (data ?? []).slice(0, limit);
  const sites = await previewUrls(req, rows.map((r) => r.id));
  const leads = rows.map((r) => toPublicLead(r, sites[r.id] ?? null));
  if (csv) {
    return new Response(leadsToCsv(leads), { headers: {
      "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="leads-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store", "X-Request-Id": crypto.randomUUID() } });
  }
  const hasMore = (data ?? []).length > limit;
  return reply({ data: leads, meta: { count: leads.length, has_more: hasMore, next_cursor: hasMore ? encodeCursor(offset + limit) : null } });
}
