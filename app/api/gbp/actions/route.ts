import { z } from "zod";
import { db } from "@/lib/supabase";
import { currentUser } from "@/lib/session";
import { check, fail, handle, ok } from "@/lib/http";
import { DESCRIPTION_MAX, POST_MAX } from "@/lib/gbp";

export const dynamic = "force-dynamic";

const Body = z.object({
  clientId: z.string().uuid(),
  kind: z.enum(["descricao", "post", "pergunta", "site", "foto", "horario", "outro"]),
  title: z.string().trim().min(1).max(200),
  text: z.string().trim().min(1).max(4000),
  scheduledFor: z.string().datetime().optional(),
});

/** Acrescenta uma ação à mão na fila (o texto já pronto, de qualquer origem). */
export async function POST(req: Request) {
  try {
    const b = Body.parse(await req.json());
    const me = await currentUser();
    if (b.kind === "descricao" && b.text.length > DESCRIPTION_MAX) return fail(400, `A descrição do Google aceita até ${DESCRIPTION_MAX} caracteres (tem ${b.text.length}).`);
    if (b.kind === "post" && b.text.length > POST_MAX) return fail(400, `O post aceita até ${POST_MAX} caracteres.`);
    const payload = b.kind === "site" ? { url: b.text } : { text: b.text };
    const row = check(await db().from("gbp_actions").insert({
      client_id: b.clientId, kind: b.kind, title: b.title, payload, scheduled_for: b.scheduledFor ?? null, created_by: me?.email ?? "",
    }).select("*").single());
    return ok(row, 201);
  } catch (e) { return handle(e); }
}
