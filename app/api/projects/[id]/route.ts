import { z } from "zod";
import { db } from "@/lib/supabase";
import { check, fail, handle, ok } from "@/lib/http";

export const dynamic = "force-dynamic";
type Ctx = { params: { id: string } };

const Patch = z.object({ name: z.string().trim().min(2).max(120).optional(), notes: z.string().max(2000).optional() });

export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const id = z.string().uuid().parse(params.id);
    const row = check(await db().from("projects").update({ ...Patch.parse(await req.json()), updated_at: new Date().toISOString() })
      .eq("id", id).select("*").maybeSingle());
    return row ? ok(row) : fail(404, "Projeto não encontrado.");
  } catch (e) { return handle(e); }
}

/** Apaga o projeto; os leads continuam no Radar, só perdem o vínculo. */
export async function DELETE(_: Request, { params }: Ctx) {
  try {
    const id = z.string().uuid().parse(params.id);
    check(await db().from("projects").delete().eq("id", id));
    return ok({ deleted: id });
  } catch (e) { return handle(e); }
}
