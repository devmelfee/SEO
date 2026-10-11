import { z } from "zod";
import { db } from "@/lib/supabase";
import { check, fail, handle, ok } from "@/lib/http";
import { doneSummary, reportMessage, sumMetrics } from "@/lib/gbp";
import { dailyMetrics } from "@/lib/gbpApi";
import { loadClient } from "@/lib/gbpApply";

export const dynamic = "force-dynamic";
const SETTINGS_ID = "00000000-0000-0000-0000-000000000001";
const DAY = 86_400_000;

/**
 * Relatório dos últimos 30 dias contra os 30 anteriores, com o que foi aplicado no perfil no período.
 * O Google publica as métricas com alguns dias de atraso: a janela termina 3 dias atrás.
 */
export async function GET(req: Request) {
  try {
    const clientId = z.string().uuid().parse(new URL(req.url).searchParams.get("clientId"));
    const client = await loadClient(clientId);
    if (!client) return fail(404, "Cliente não encontrado.");
    if (!client.gbp_location) return fail(409, "Escolha o perfil do Google deste cliente antes.");
    const end = new Date(Date.now() - 3 * DAY), start = new Date(end.getTime() - 29 * DAY);
    const prevEnd = new Date(start.getTime() - DAY), prevStart = new Date(prevEnd.getTime() - 29 * DAY);
    const series = await dailyMetrics(client.gbp_location, prevStart, end);
    const now = sumMetrics(series, start, end), before = sumMetrics(series, prevStart, prevEnd);
    const applied = check(await db().from("gbp_actions").select("kind,payload").eq("client_id", clientId).eq("status", "aplicada")
      .gte("applied_at", start.toISOString())) as any[];
    const settings = check(await db().from("agency_settings").select("consultant").eq("id", SETTINGS_ID).maybeSingle()) as { consultant?: string } | null;
    const done = doneSummary(applied);
    return ok({
      period: { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) },
      now, before, done, phone: client.phone || "",
      message: reportMessage({ company: client.name, consultant: settings?.consultant ?? "", now, before, done }),
    });
  } catch (e) { return handle(e); }
}
