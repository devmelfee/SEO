import { z } from "zod";
import { db } from "@/lib/supabase";
import { apiError, authenticate, previewUrls, reply } from "@/lib/apiv1";
import { toPublicLead } from "@/lib/leadApi";
import { STATUSES } from "@/lib/opportunity";

export const dynamic = "force-dynamic";
type Ctx = { params: { id: string } };

export async function GET(req: Request, { params }: Ctx) {
  const key = await authenticate(req, "read");
  if (key instanceof Response) return key;
  if (!z.string().uuid().safeParse(params.id).success) return apiError(404, "not_found", "Lead não encontrado.");
  const { data } = await db().from("prospects").select("*").eq("id", params.id).maybeSingle();
  if (!data) return apiError(404, "not_found", "Lead não encontrado.");
  const sites = await previewUrls(req, [data.id]);
  return reply({ data: toPublicLead(data, sites[data.id] ?? null) });
}

const Patch = z.object({
  status: z.enum(STATUSES).optional(),
  notes: z.string().max(5000).optional(),
  project_id: z.string().uuid().nullable().optional(),
}).strict().refine((b) => Object.keys(b).length > 0, "Envie ao menos um campo: status, notes ou project_id.");

/** PATCH /api/v1/leads/{id} — o CRM devolve o andamento (ex.: status "fechado"). Exige escopo write. */
export async function PATCH(req: Request, { params }: Ctx) {
  const key = await authenticate(req, "write");
  if (key instanceof Response) return key;
  if (!z.string().uuid().safeParse(params.id).success) return apiError(404, "not_found", "Lead não encontrado.");
  const body = Patch.safeParse(await req.json().catch(() => null));
  if (!body.success) return apiError(400, "invalid_body", body.error.issues.map((i) => `${i.path.join(".") || "corpo"}: ${i.message}`).join("; "));
  const patch: Record<string, unknown> = { ...body.data, updated_at: new Date().toISOString() };
  if (body.data.status && ["respondeu", "fechado", "descartado"].includes(body.data.status)) patch.next_followup_at = null;
  const { data, error } = await db().from("prospects").update(patch).eq("id", params.id).select("*").maybeSingle();
  if (error) return apiError(400, "invalid_body", "Não foi possível salvar (projeto inexistente?).");
  if (!data) return apiError(404, "not_found", "Lead não encontrado.");
  const sites = await previewUrls(req, [data.id]);
  return reply({ data: toPublicLead(data, sites[data.id] ?? null) });
}
