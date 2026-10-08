import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/lib/supabase";
import { currentUser } from "@/lib/session";
import { check, fail, handle, ok } from "@/lib/http";
import { generate } from "@/lib/claude";
import { aiModel, guard, recordUsage } from "@/lib/usage";
import { llmCostUsd } from "@/lib/limits";
import { buildSiteHtml, buildSitePrompt, extractHtml, siteSlug, type SiteData } from "@/lib/site";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const Target = z.object({ prospectId: z.string().uuid().optional(), clientId: z.string().uuid().optional() })
  .refine((t) => !!t.prospectId !== !!t.clientId, "Informe prospectId OU clientId.");

const Data = z.object({
  name: z.string().trim().min(2).max(120), niche: z.string().trim().min(2).max(120), city: z.string().trim().min(2).max(120),
  phone: z.string().max(40).optional(), address: z.string().max(300).optional(), hours: z.array(z.string().max(80)).max(7).optional(),
  rating: z.number().min(0).max(5).nullable().optional(), reviews: z.number().int().min(0).optional(), mapsUrl: z.string().max(500).optional(),
  services: z.array(z.string().trim().max(80)).max(8).optional(), tagline: z.string().max(160).optional(), agency: z.string().max(120).optional(),
});

/** Dados para pré-preencher o formulário + site existente (se houver). */
export async function GET(req: Request) {
  try {
    const u = new URL(req.url);
    const t = Target.parse({ prospectId: u.searchParams.get("prospectId") ?? undefined, clientId: u.searchParams.get("clientId") ?? undefined });
    const site = check(await db().from("sites").select("slug,source,data,updated_at,views")
      .eq(t.prospectId ? "prospect_id" : "client_id", (t.prospectId ?? t.clientId)!).maybeSingle());

    const settings = check(await db().from("agency_settings").select("name").limit(1).maybeSingle()) as { name?: string } | null;
    let prospect: any = null, client: any = null;
    if (t.prospectId) prospect = check(await db().from("prospects").select("*").eq("id", t.prospectId).maybeSingle());
    else {
      client = check(await db().from("clients").select("name,vertical,city,phone").eq("id", t.clientId!).maybeSingle());
      prospect = check(await db().from("prospects").select("*").eq("client_id", t.clientId!).limit(1).maybeSingle());
    }
    if (!prospect && !client) return fail(404, "Lead ou cliente não encontrado.");
    const [qNiche, qCity] = String(prospect?.query ?? "").split(" em ");
    const data: SiteData = {
      name: client?.name || prospect?.name || "", niche: client?.vertical || qNiche || "", city: client?.city || qCity || "",
      phone: prospect?.phone || client?.phone || "", address: prospect?.address || "", hours: prospect?.hours ?? [],
      rating: prospect?.rating ?? null, reviews: prospect?.reviews_count ?? 0, mapsUrl: prospect?.maps_url || "",
      agency: settings?.name || "",
    };
    return ok({ site, data: { ...data, ...(site?.data ?? {}) } });
  } catch (e) { return handle(e); }
}

const Body = z.object({
  target: Target, data: Data,
  mode: z.enum(["modelo", "ia", "manual"]),
  html: z.string().max(400_000).optional(),
});

/** Gera (modelo ou IA) ou recebe (colado) o HTML e publica em /s/[slug]. Um site por lead/cliente. */
export async function POST(req: Request) {
  try {
    const { target, data, mode, html: pasted } = Body.parse(await req.json());
    let html: string | null;
    if (mode === "modelo") html = buildSiteHtml(data);
    else if (mode === "manual") {
      html = extractHtml(pasted ?? "");
      if (!html) return fail(400, "O texto colado não é um HTML completo (precisa ter <html> … </html>).");
    } else {
      const { system, prompt } = buildSitePrompt(data);
      const who = await currentUser();
      await guard(who, "llm", 1);
      const g = await generate(system, prompt, 16000, await aiModel("site"));
      await recordUsage(who, { kind: "llm", action: "site_ia", query: `${data.name} — ${data.city}`, units: 1, model: g.model,
        input_tokens: g.inputTokens, output_tokens: g.outputTokens, cost_usd: llmCostUsd(g.model, g.inputTokens, g.outputTokens) });
      html = extractHtml(g.text);
      if (!html) return fail(502, "A IA não devolveu um HTML válido. Tente de novo ou use o modelo.");
    }

    const col = target.prospectId ? "prospect_id" : "client_id";
    const id = (target.prospectId ?? target.clientId)!;
    const existing = check(await db().from("sites").select("id,slug").eq(col, id).maybeSingle()) as { id: string; slug: string } | null;
    const me = await currentUser();
    const now = new Date().toISOString();

    let slug = existing?.slug;
    if (!slug) {
      const base = siteSlug(data.name, data.city);
      const taken = check(await db().from("sites").select("slug").like("slug", `${base}%`)) as { slug: string }[];
      slug = taken.some((t) => t.slug === base) ? `${base}-${taken.length + 1}` : base;
    }
    const row = { slug, [col]: id, data, html, source: mode, updated_at: now, ...(existing ? {} : { created_by: me?.email ?? "" }) };
    check(existing ? await db().from("sites").update(row).eq("id", existing.id) : await db().from("sites").insert(row));
    return ok({ slug, path: `/s/${slug}`, source: mode });
  } catch (e) {
    if (e instanceof Anthropic.APIError) return fail(502, `Erro da IA (${e.status ?? "rede"}): ${e.message}`);
    return handle(e);
  }
}
