import "server-only";
import { db, supabaseConfigured } from "./supabase";
import { check, LimitError } from "./http";
import { allowance, mergeLimits, meters, WEEK_MS, type Limits, type Meters, type Resource, type UsageEvent } from "./limits";

const SETTINGS_ID = "00000000-0000-0000-0000-000000000001";
/** Custo de uma chamada ao Text Search com telefone/site/nota/horário (SKU Enterprise). Ajuste por env. */
export const PLACES_USD = Number(process.env.PLACES_COST_USD) || 0.035;

export type Me = { email: string; role: "admin" | "member" };
export type UsageStatus = {
  limited: boolean; limits: Limits; places: Meters; llm: Meters; adminWhatsapp: string; phone: string;
};

async function agency() {
  return check(await db().from("agency_settings").select("default_limits,whatsapp,usd_brl").eq("id", SETTINGS_ID).maybeSingle()) as
    { default_limits: Partial<Limits> | null; whatsapp: string | null; usd_brl: number | null } | null;
}

/** WhatsApp para pedir mais: o da agência; se vazio, o telefone do primeiro administrador. */
async function adminPhone(): Promise<string> {
  const { data } = await db().from("team_members").select("phone").eq("role", "admin").neq("phone", "").order("created_at").limit(1);
  return data?.[0]?.phone ?? "";
}

/** Uso e limites atuais de uma pessoa (últimos 7 dias bastam para as duas janelas). */
export async function usageStatus(me: Me, now = new Date()): Promise<UsageStatus> {
  const [ag, member, events] = await Promise.all([
    agency(),
    db().from("team_members").select("limits,usage_reset_at,phone").eq("email", me.email.toLowerCase()).maybeSingle().then(check) as Promise<
      { limits: Partial<Limits> | null; usage_reset_at: string | null; phone: string } | null>,
    db().from("usage_events").select("kind,units,created_at").eq("user_email", me.email.toLowerCase())
      .gte("created_at", new Date(now.getTime() - WEEK_MS).toISOString()).then(check) as Promise<UsageEvent[]>,
  ]);
  const limits = mergeLimits(ag?.default_limits, member?.limits);
  const since = member?.usage_reset_at ? new Date(member.usage_reset_at) : null;
  return {
    limited: me.role !== "admin", limits,
    places: meters(events, "places", limits, now, since), llm: meters(events, "llm", limits, now, since),
    adminWhatsapp: ag?.whatsapp || (await adminPhone()), phone: member?.phone ?? "",
  };
}

const fmtReset = (iso: string | null) => iso
  ? ` Libera ${new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}.`
  : "";

/** Barra o pedido se a pessoa já gastou o limite. Administradores não têm limite (mas o uso é registrado). */
export async function guard(me: Me | null, kind: Resource, needed: number) {
  if (!me || !supabaseConfigured()) return;
  const st = await usageStatus(me);
  if (!st.limited) return;
  const r = allowance(kind === "places" ? st.places : st.llm, needed);
  if (r.ok) return;
  const what = kind === "places" ? "consultas ao Google" : "gerações de IA";
  const period = r.which === "window" ? `nas últimas ${st.limits.window_hours}h` : "nesta semana";
  throw new LimitError(
    `Limite de ${what} ${period} atingido (restam ${r.left}, este pedido usa ${needed}).${fmtReset(r.resetAt)} Peça mais ao administrador.`,
    r.resetAt,
  );
}

export type UsageRecord = {
  kind: Resource; action: string; query?: string; units: number;
  model?: string; input_tokens?: number; output_tokens?: number; cost_usd: number;
};

/** Registra o gasto. Falha aqui não derruba a resposta ao usuário. */
export async function recordUsage(me: Me | null, r: UsageRecord) {
  if (!supabaseConfigured() || r.units <= 0) return;
  const { error } = await db().from("usage_events").insert({ user_email: me?.email.toLowerCase() ?? "", ...r, query: (r.query ?? "").slice(0, 300) });
  if (error) console.error("usage_events:", error.message);
}
