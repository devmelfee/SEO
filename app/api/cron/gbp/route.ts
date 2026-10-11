import { timingSafeEqual } from "node:crypto";
import { db, supabaseConfigured } from "@/lib/supabase";
import { check, fail, handle, ok } from "@/lib/http";
import type { GbpAction } from "@/lib/gbp";
import { applyAction, clientSiteUrl, loadClient } from "@/lib/gbpApply";
import { connection, oauthConfigured } from "@/lib/gbpApi";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  const got = req.headers.get("authorization") ?? "";
  const want = `Bearer ${secret}`;
  return !!secret && got.length === want.length && timingSafeEqual(Buffer.from(got), Buffer.from(want));
}

/** Publica os posts agendados que venceram (Vercel Cron, 1× por dia). Sem conexão com o Google, não faz nada. */
export async function GET(req: Request) {
  try {
    if (!authorized(req)) return fail(401, "Não autorizado.");
    if (!supabaseConfigured() || !oauthConfigured() || !(await connection())) return ok({ published: 0, skipped: "sem conexão com o Google" });
    const due = check(await db().from("gbp_actions").select("*").eq("kind", "post").eq("status", "pendente")
      .lte("scheduled_for", new Date().toISOString()).order("scheduled_for").limit(25)) as GbpAction[];
    let published = 0, failed = 0;
    const origin = new URL(req.url).origin;
    for (const a of due) {
      const client = await loadClient(a.client_id);
      if (!client?.gbp_location) continue;
      const site = await clientSiteUrl(a.client_id, origin);
      const r = await applyAction(a, client, "agendado", site.external ? site.url : "");
      if (r.status === "aplicada") published++; else failed++;
    }
    return ok({ published, failed });
  } catch (e) { return handle(e); }
}
