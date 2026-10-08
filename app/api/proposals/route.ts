import { z } from "zod";
import { db } from "@/lib/supabase";
import { currentUser } from "@/lib/session";
import { check, fail, handle, ok } from "@/lib/http";
import { slugify } from "@/lib/phases";
import { defaultProposal, type ProposalData } from "@/lib/proposal";

export const dynamic = "force-dynamic";
const SETTINGS_ID = "00000000-0000-0000-0000-000000000001";
const COLS = "id,client_id,slug,data,status,views,sent_at,accepted_at,updated_at";

/** Proposta salva do cliente + rascunho montado com o que o sistema já sabe (lead do Radar, concorrentes, preços, site). */
export async function GET(req: Request) {
  try {
    const clientId = z.string().uuid().parse(new URL(req.url).searchParams.get("clientId"));
    const client = check(await db().from("clients").select("id,name,vertical,city,phone").eq("id", clientId).maybeSingle()) as
      { id: string; name: string; vertical: string; city: string; phone: string } | null;
    if (!client) return fail(404, "Cliente não encontrado.");
    const [proposal, settings, lead] = await Promise.all([
      db().from("proposals").select(COLS).eq("client_id", clientId).maybeSingle().then(check),
      db().from("agency_settings").select("name,consultant,whatsapp,trial_price,monthly_price").eq("id", SETTINGS_ID).maybeSingle().then(check) as Promise<any>,
      db().from("prospects").select("id,query,issues,reviews_count,rating,website,phone").eq("client_id", clientId).limit(1).maybeSingle().then(check) as Promise<any>,
    ]);
    const rivals = lead?.query
      ? (check(await db().from("prospects").select("name,reviews_count,rating,website,rank_in_search").eq("query", lead.query)
          .neq("id", lead.id).order("rank_in_search").limit(3)) as any[])
      : [];
    const siteQ = db().from("sites").select("slug");
    const site = check(await (lead?.id ? siteQ.or(`client_id.eq.${clientId},prospect_id.eq.${lead.id}`) : siteQ.eq("client_id", clientId)).limit(1)) as { slug: string }[];
    const origin = new URL(req.url).origin;
    const prefill = defaultProposal({
      company: client.name, niche: client.vertical, city: client.city,
      agency: settings?.name ?? "", consultant: settings?.consultant ?? "", agencyWhatsapp: settings?.whatsapp ?? "",
      trialPrice: settings?.trial_price ?? "", monthlyPrice: settings?.monthly_price ?? "",
      siteUrl: site[0] ? `${origin}/s/${site[0].slug}` : "",
      issues: lead?.issues ?? [],
      self: lead ? { reviews: lead.reviews_count ?? 0, rating: lead.rating, site: !!lead.website } : null,
      rivals: rivals.map((r) => ({ name: r.name, reviews: r.reviews_count ?? 0, rating: r.rating, site: !!r.website })),
    });
    return ok({ proposal, prefill, clientPhone: client.phone || lead?.phone || "", prospectId: lead?.id ?? null });
  } catch (e) { return handle(e); }
}

const Data = z.object({
  company: z.string().trim().min(1).max(200), niche: z.string().max(200), city: z.string().max(200),
  agency: z.string().max(200), consultant: z.string().max(200), agencyWhatsapp: z.string().max(50),
  problems: z.array(z.object({ title: z.string().max(200), detail: z.string().max(600) })).max(10),
  comparison: z.array(z.object({ name: z.string().max(200), reviews: z.number().int().min(0), rating: z.number().nullable(), site: z.boolean(), you: z.boolean().optional() })).max(6),
  deliverables: z.array(z.string().max(300)).max(15),
  trialPrice: z.string().max(60), monthlyPrice: z.string().max(60), terms: z.string().max(600),
  siteUrl: z.string().max(500), validDays: z.number().int().min(1).max(90), date: z.string().max(40),
}) satisfies z.ZodType<ProposalData>;
const Body = z.object({ clientId: z.string().uuid(), data: Data });

/** Salva (ou atualiza) a proposta e devolve o link público. Um cliente = uma proposta. */
export async function POST(req: Request) {
  try {
    const { clientId, data } = Body.parse(await req.json());
    const me = await currentUser();
    const existing = check(await db().from("proposals").select("id,slug").eq("client_id", clientId).maybeSingle()) as { id: string; slug: string } | null;
    const now = new Date().toISOString();
    const row = existing
      ? check(await db().from("proposals").update({ data, updated_at: now }).eq("id", existing.id).select(COLS).single())
      : check(await db().from("proposals").insert({
          client_id: clientId, data, created_by: me?.email ?? "",
          // Sufixo aleatório: o link tem preço, então não pode ser adivinhado.
          slug: `${slugify(data.company).slice(0, 50)}-${crypto.randomUUID().slice(0, 8)}`,
        }).select(COLS).single());
    return ok(row);
  } catch (e) { return handle(e); }
}

/** Marca como enviada (o consultor abriu o WhatsApp com o link) e move o lead para "proposta". */
export async function PATCH(req: Request) {
  try {
    const { clientId } = z.object({ clientId: z.string().uuid() }).parse(await req.json());
    const row = check(await db().from("proposals").select("status,sent_at").eq("client_id", clientId).maybeSingle()) as { status: string; sent_at: string | null } | null;
    if (!row) return fail(404, "Salve a proposta antes de enviar.");
    const now = new Date().toISOString();
    if (row.status === "rascunho") {
      check(await db().from("proposals").update({ status: "enviada", sent_at: now }).eq("client_id", clientId));
      await db().from("prospects").update({ status: "proposta", updated_at: now }).eq("client_id", clientId).in("status", ["novo", "abordado", "respondeu"]);
    }
    return ok({ status: row.status === "rascunho" ? "enviada" : row.status });
  } catch (e) { return handle(e); }
}
