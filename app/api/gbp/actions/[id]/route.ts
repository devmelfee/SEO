import { z } from "zod";
import { db } from "@/lib/supabase";
import { currentUser } from "@/lib/session";
import { check, fail, handle, ok } from "@/lib/http";
import { DESCRIPTION_MAX, POST_MAX, type GbpAction } from "@/lib/gbp";
import { applyAction, clientSiteUrl, loadClient } from "@/lib/gbpApply";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
type Ctx = { params: { id: string } };

async function load(id: string): Promise<GbpAction | null> {
  return check(await db().from("gbp_actions").select("*").eq("id", z.string().uuid().parse(id)).maybeSingle()) as GbpAction | null;
}

const Patch = z.object({
  // "aplicada" aqui = aplicada à mão (modo assistido); "pendente" desfaz ignorar.
  status: z.enum(["pendente", "aplicada", "ignorada"]).optional(),
  text: z.string().trim().min(1).max(4000).optional(),
  scheduledFor: z.string().datetime().nullable().optional(),
});

/** Edita o texto antes de aplicar, marca como feita à mão ou ignora. */
export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const a = await load(params.id);
    if (!a) return fail(404, "Ação não encontrada.");
    const b = Patch.parse(await req.json());
    const me = await currentUser();
    const now = new Date().toISOString();
    const upd: Record<string, unknown> = { updated_at: now };
    if (b.text !== undefined) {
      if (a.status === "aplicada") return fail(409, "Esta ação já foi aplicada; crie uma nova.");
      if (a.kind === "descricao" && b.text.length > DESCRIPTION_MAX) return fail(400, `A descrição aceita até ${DESCRIPTION_MAX} caracteres (tem ${b.text.length}).`);
      if (a.kind === "post" && b.text.length > POST_MAX) return fail(400, `O post aceita até ${POST_MAX} caracteres.`);
      const key = a.kind === "site" ? "url" : a.kind === "resposta_avaliacao" ? "reply" : a.kind === "pergunta" ? "answer" : "text";
      upd.payload = { ...a.payload, [key]: b.text };
    }
    if (b.scheduledFor !== undefined) upd.scheduled_for = b.scheduledFor;
    if (b.status) {
      if (a.status === "aplicada" && b.status !== "aplicada") return fail(409, "Ação já aplicada não volta para a fila.");
      upd.status = b.status; upd.error = null;
      if (b.status === "aplicada" && a.status !== "aplicada") Object.assign(upd, { applied_via: "manual", applied_at: now, applied_by: me?.email ?? "" });
    }
    return ok(check(await db().from("gbp_actions").update(upd).eq("id", a.id).select("*").single()));
  } catch (e) { return handle(e); }
}

/** Aplica pela API do Google. */
export async function POST(req: Request, { params }: Ctx) {
  try {
    const a = await load(params.id);
    if (!a) return fail(404, "Ação não encontrada.");
    const client = await loadClient(a.client_id);
    if (!client) return fail(404, "Cliente não encontrado.");
    const me = await currentUser();
    const site = a.kind === "post" ? (await clientSiteUrl(a.client_id, new URL(req.url).origin)) : null;
    const row = await applyAction(a, client, me?.email ?? "", site?.external ? site.url : "");
    return ok(row);
  } catch (e) { return handle(e); }
}
