import { z } from "zod";
import { db } from "@/lib/supabase";
import { check, fail, handle, ok } from "@/lib/http";
import { STATUSES } from "@/lib/opportunity";
import { CONTACT_STATUSES, isValidCnpj, onlyDigits } from "@/lib/contact";

export const dynamic = "force-dynamic";

const Body = z.object({
  status: z.enum(STATUSES).optional(),
  notes: z.string().max(5000).optional(),
  client_id: z.string().uuid().nullable().optional(),
  project_id: z.string().uuid().nullable().optional(),
  contact_status: z.enum(CONTACT_STATUSES).optional(),
  cnpj: z.string().trim().max(30).nullable().optional()
    .refine((v) => !v || isValidCnpj(v), "CNPJ inválido").transform((v) => (v ? onlyDigits(v) : null)),
  // Tomador de decisão confirmado (do quadro de sócios ou informado na conversa).
  decision_maker: z.object({
    name: z.string().trim().min(2).max(120), role: z.string().trim().max(80).default(""),
    phone: z.string().trim().max(30).default(""), email: z.string().trim().max(160).default(""),
    source: z.enum(["receita", "conversa", "manual"]).default("manual"),
  }).nullable().optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = z.string().uuid().parse(params.id);
    const body = Body.parse(await req.json());
    const extra: Record<string, unknown> = {};
    // Contato que não serve sai da fila de lembretes.
    if (body.contact_status === "invalido" || body.contact_status === "sem_whatsapp") extra.next_followup_at = null;
    if (body.contact_status) extra.contact_checked_at = new Date().toISOString();
    const row = check(await db().from("prospects").update({ ...body, ...extra, updated_at: new Date().toISOString() })
      .eq("id", id).select("*").maybeSingle());
    if (!row) return fail(404, "Lead não encontrado.");
    return ok(row);
  } catch (e) { return handle(e); }
}
