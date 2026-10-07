import { z } from "zod";
import { db } from "@/lib/supabase";
import { check, handle, ok } from "@/lib/http";

export const dynamic = "force-dynamic";

const Body = z.object({
  label: z.string().min(1).max(200),
  content: z.string().max(200_000),
  /** true quando o texto acabou de vir da IA: também vira o "original" para o botão Restaurar. */
  fromAi: z.boolean().optional().default(false),
});

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const clientId = z.string().uuid().parse(params.id);
    const { label, content, fromAi } = Body.parse(await req.json());
    const row: Record<string, unknown> = { client_id: clientId, phase_label: label, content, updated_at: new Date().toISOString() };
    if (fromAi) row.original_content = content;
    // Upsert pela chave única (client_id, phase_label): uma linha por seção, sem duplicar.
    check(await db().from("client_phases").upsert(row, { onConflict: "client_id,phase_label" }));
    check(await db().from("clients").update({ updated_at: new Date().toISOString() }).eq("id", clientId));
    return ok({ saved: true });
  } catch (e) { return handle(e); }
}
