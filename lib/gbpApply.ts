import "server-only";
import { db } from "./supabase";
import { check } from "./http";
import { KIND_INFO, type GbpAction } from "./gbp";
import { addServices, createPost, GbpError, replyReview, setDescription, setWebsite, type Applied } from "./gbpApi";

export type ClientGbp = { id: string; gbp_account: string | null; gbp_location: string | null };

/** Aplica UMA ação pela API do Google e grava o resultado (ou o erro) na fila. Nunca aplica duas vezes. */
export async function applyAction(a: GbpAction, client: ClientGbp, by: string, siteUrl = ""): Promise<GbpAction> {
  if (a.status === "aplicada") return a;
  if (!KIND_INFO[a.kind].api) throw new GbpError(400, `${KIND_INFO[a.kind].label}: o Google não permite aplicar pela API. Use "Copiar e abrir no Google".`);
  if (!client.gbp_account || !client.gbp_location) throw new GbpError(409, "Escolha o perfil do Google deste cliente antes de aplicar.");
  const t = { account: client.gbp_account, location: client.gbp_location };
  const p = a.payload ?? {};
  let r: Applied;
  try {
    switch (a.kind) {
      case "descricao": r = await setDescription(t, String(p.text ?? "")); break;
      case "site": r = await setWebsite(t, String(p.url ?? "")); break;
      case "servicos": r = await addServices(t, p.items ?? []); break;
      case "post": r = await createPost(t, String(p.text ?? ""), siteUrl || undefined); break;
      case "resposta_avaliacao": r = await replyReview(String(p.reviewName ?? ""), String(p.reply ?? "")); break;
      default: throw new GbpError(400, "Tipo de ação sem aplicação automática.");
    }
  } catch (e) {
    const error = e instanceof Error ? e.message : "Erro";
    return check(await db().from("gbp_actions").update({ status: "falhou", error, updated_at: new Date().toISOString() })
      .eq("id", a.id).select("*").single()) as GbpAction;
  }
  const now = new Date().toISOString();
  return check(await db().from("gbp_actions").update({
    status: "aplicada", applied_via: "api", previous: r.previous, result: r.result, error: null, applied_at: now, applied_by: by, updated_at: now,
  }).eq("id", a.id).neq("status", "aplicada").select("*").single()) as GbpAction;
}

export async function loadClient(id: string): Promise<ClientGbp & { name: string; vertical: string; city: string; phone: string; gbp_title: string | null } | null> {
  return check(await db().from("clients").select("id,name,vertical,city,phone,gbp_account,gbp_location,gbp_title").eq("id", id).maybeSingle()) as any;
}

/** Link certo do site do cliente (de outro app, IA ou modelo), ou "" se ainda não há site. */
export async function clientSiteUrl(clientId: string, origin: string): Promise<{ url: string; external: boolean }> {
  const { publicSiteUrl } = await import("./site");
  const lead = check(await db().from("prospects").select("id").eq("client_id", clientId).limit(1).maybeSingle()) as { id: string } | null;
  const q = db().from("sites").select("slug,source,external_url").order("updated_at", { ascending: false });
  const rows = check(await (lead ? q.or(`client_id.eq.${clientId},prospect_id.eq.${lead.id}`) : q.eq("client_id", clientId)).limit(1)) as any[];
  return { url: publicSiteUrl(rows[0], origin), external: rows[0]?.source === "externo" };
}
