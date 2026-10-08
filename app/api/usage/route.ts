import { z } from "zod";
import { db } from "@/lib/supabase";
import { currentUser } from "@/lib/session";
import { check, fail, handle, ok } from "@/lib/http";
import { mergeLimits, meters, WEEK_MS, type Limits, type UsageEvent } from "@/lib/limits";

export const dynamic = "force-dynamic";
const SETTINGS_ID = "00000000-0000-0000-0000-000000000001";

type Ev = UsageEvent & { user_email: string; action: string; query: string; model: string | null; input_tokens: number | null; output_tokens: number | null; cost_usd: number };
type Member = { email: string; role: string; phone: string; limits: Partial<Limits> | null; usage_reset_at: string | null };

async function requireAdmin() {
  const me = await currentUser();
  if (!me) return { error: fail(401, "Sessão expirada.") };
  if (me.role !== "admin") return { error: fail(403, "Só administradores veem o controle de gastos.") };
  return { me };
}

/** Painel de gastos: por pessoa, por tipo e as últimas buscas. `days` = período do relatório. */
export async function GET(req: Request) {
  try {
    const { error } = await requireAdmin(); if (error) return error;
    const days = z.coerce.number().int().min(1).max(365).catch(7).parse(new URL(req.url).searchParams.get("days"));
    const now = new Date();
    const from = new Date(now.getTime() - Math.max(days * 864e5, WEEK_MS)).toISOString();
    const periodStart = new Date(now.getTime() - days * 864e5).toISOString();

    const [ag, members, events] = await Promise.all([
      db().from("agency_settings").select("default_limits,usd_brl").eq("id", SETTINGS_ID).maybeSingle().then(check) as Promise<{ default_limits: Partial<Limits> | null; usd_brl: number | null } | null>,
      db().from("team_members").select("email,role,phone,limits,usage_reset_at").order("created_at").then(check) as Promise<Member[]>,
      db().from("usage_events").select("user_email,kind,action,query,units,model,input_tokens,output_tokens,cost_usd,created_at")
        .gte("created_at", from).order("created_at", { ascending: false }).limit(10000).then(check) as Promise<Ev[]>,
    ]);
    const inPeriod = events.filter((e) => e.created_at >= periodStart);
    const sum = (list: Ev[]) => ({
      searches: list.filter((e) => e.kind === "places").reduce((s, e) => s + e.units, 0),
      ai: list.filter((e) => e.kind === "llm").reduce((s, e) => s + e.units, 0),
      tokens: list.reduce((s, e) => s + (e.input_tokens ?? 0) + (e.output_tokens ?? 0), 0),
      placesUsd: list.filter((e) => e.kind === "places").reduce((s, e) => s + Number(e.cost_usd), 0),
      aiUsd: list.filter((e) => e.kind === "llm").reduce((s, e) => s + Number(e.cost_usd), 0),
    });

    const emails = new Set([...members.map((m) => m.email), ...inPeriod.map((e) => e.user_email)]);
    const people = [...emails].map((email) => {
      const m = members.find((x) => x.email === email);
      const mine = events.filter((e) => e.user_email === email);
      const limits = mergeLimits(ag?.default_limits, m?.limits);
      const since = m?.usage_reset_at ? new Date(m.usage_reset_at) : null;
      return {
        email, role: m?.role ?? "removido", phone: m?.phone ?? "", override: m?.limits ?? null, limits,
        places: meters(mine, "places", limits, now, since), llm: meters(mine, "llm", limits, now, since),
        period: sum(mine.filter((e) => e.created_at >= periodStart)),
      };
    });

    const byAction: Record<string, { count: number; units: number; usd: number }> = {};
    for (const e of inPeriod) {
      const a = (byAction[e.action || e.kind] ??= { count: 0, units: 0, usd: 0 });
      a.count++; a.units += e.units; a.usd += Number(e.cost_usd);
    }
    return ok({
      days, usdBrl: Number(ag?.usd_brl ?? 5.5), defaults: mergeLimits(ag?.default_limits), totals: sum(inPeriod),
      people, byAction, recent: inPeriod.slice(0, 150),
    });
  } catch (e) { return handle(e); }
}

const LimitsSchema = z.object({
  window_hours: z.number().int().min(1).max(168),
  searches_window: z.number().int().min(0).max(100000).nullable(),
  searches_week: z.number().int().min(0).max(100000).nullable(),
  ai_window: z.number().int().min(0).max(100000).nullable(),
  ai_week: z.number().int().min(0).max(100000).nullable(),
});
const Defaults = z.object({ default_limits: LimitsSchema, usd_brl: z.number().min(0.1).max(100).optional() });

/** Limites padrão da equipe (valem para quem não tem limite próprio) e câmbio do relatório. */
export async function PUT(req: Request) {
  try {
    const { error } = await requireAdmin(); if (error) return error;
    const body = Defaults.parse(await req.json());
    check(await db().from("agency_settings").upsert({ id: SETTINGS_ID, ...body, updated_at: new Date().toISOString() }));
    return ok(body);
  } catch (e) { return handle(e); }
}
