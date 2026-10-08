import { z } from "zod";
import { db } from "@/lib/supabase";
import { currentUser } from "@/lib/session";
import { check, fail, handle, ok } from "@/lib/http";
import { MAX_STEP, nextFollowup } from "@/lib/outreach";

export const dynamic = "force-dynamic";
type Ctx = { params: { id: string } };

export async function GET(_: Request, { params }: Ctx) {
  try {
    const id = z.string().uuid().parse(params.id);
    const events = check(await db().from("outreach_events").select("step,channel,kind,message,created_by,created_at")
      .eq("prospect_id", id).order("created_at", { ascending: false }).limit(50));
    return ok(events);
  } catch (e) { return handle(e); }
}

const Body = z.object({
  kind: z.enum(["enviado", "respondeu", "sem_interesse"]),
  step: z.number().int().min(1).max(MAX_STEP).optional(),
  channel: z.enum(["whatsapp", "ligacao", "email", "visita"]).default("whatsapp"),
  message: z.string().max(4000).optional().default(""),
});

/**
 * Registra um contato e move o lead no funil:
 * enviado → status "abordado" (se era novo), agenda o próximo lembrete (+2d, +3d, fim);
 * respondeu → status "respondeu", sem lembretes; sem_interesse → "descartado", sem lembretes.
 */
export async function POST(req: Request, { params }: Ctx) {
  try {
    const id = z.string().uuid().parse(params.id);
    const body = Body.parse(await req.json());
    const lead = check(await db().from("prospects").select("status,contact_step").eq("id", id).maybeSingle()) as
      { status: string; contact_step: number | null } | null;
    if (!lead) return fail(404, "Lead não encontrado.");
    const me = await currentUser();
    const now = new Date();

    const step = body.kind === "enviado" ? Math.min(MAX_STEP, body.step ?? (lead.contact_step ?? 0) + 1) : lead.contact_step ?? 0;
    check(await db().from("outreach_events").insert({ prospect_id: id, step, channel: body.channel, kind: body.kind, message: body.message, created_by: me?.email ?? "" }));

    const patch: Record<string, unknown> = { updated_at: now.toISOString() };
    if (body.kind === "enviado") {
      patch.contact_step = step;
      patch.last_contact_at = now.toISOString();
      patch.next_followup_at = nextFollowup(step, now)?.toISOString() ?? null;
      if (lead.status === "novo") patch.status = "abordado";
    } else {
      patch.next_followup_at = null;
      patch.status = body.kind === "respondeu" ? "respondeu" : "descartado";
    }
    const row = check(await db().from("prospects").update(patch).eq("id", id).select("*").single());
    return ok(row);
  } catch (e) { return handle(e); }
}
