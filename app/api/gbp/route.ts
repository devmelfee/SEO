import { z } from "zod";
import { db } from "@/lib/supabase";
import { currentUser } from "@/lib/session";
import { check, fail, handle, ok } from "@/lib/http";
import { clientSiteUrl, loadClient } from "@/lib/gbpApply";
import { connection, oauthConfigured } from "@/lib/gbpApi";

export const dynamic = "force-dynamic";

/** Tudo da etapa Entrega › Perfil do Google de um cliente: conexão, perfil ligado, site e fila de ações. */
export async function GET(req: Request) {
  try {
    const clientId = z.string().uuid().parse(new URL(req.url).searchParams.get("clientId"));
    const client = await loadClient(clientId);
    if (!client) return fail(404, "Cliente não encontrado.");
    const actions = check(await db().from("gbp_actions").select("*").eq("client_id", clientId).order("created_at"));
    const site = await clientSiteUrl(clientId, new URL(req.url).origin);
    return ok({
      configured: oauthConfigured(), connection: oauthConfigured() ? await connection() : null,
      profile: client.gbp_location ? { account: client.gbp_account, location: client.gbp_location, title: client.gbp_title } : null,
      site, actions,
    });
  } catch (e) { return handle(e); }
}

const Link = z.object({
  clientId: z.string().uuid(),
  account: z.string().regex(/^accounts\/[\w-]+$/).nullable(),
  location: z.string().regex(/^locations\/[\w-]+$/).nullable(),
  title: z.string().max(200).optional(),
});

/** Liga (ou desliga, com nulos) o perfil do Google a este cliente. */
export async function PUT(req: Request) {
  try {
    const b = Link.parse(await req.json());
    if (!(await currentUser())) return fail(401, "Faça login.");
    check(await db().from("clients").update({ gbp_account: b.account, gbp_location: b.location, gbp_title: b.location ? b.title ?? "" : null, updated_at: new Date().toISOString() }).eq("id", b.clientId));
    return ok({ linked: !!b.location });
  } catch (e) { return handle(e); }
}
