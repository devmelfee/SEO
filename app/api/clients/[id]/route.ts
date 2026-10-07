import { z } from "zod";
import { db } from "@/lib/supabase";
import { check, fail, handle, ok } from "@/lib/http";
import { CLIENT_COLS, ClientInput, toRow } from "@/lib/schemas";

export const dynamic = "force-dynamic";
type Ctx = { params: { id: string } };
const Id = z.string().uuid();

export async function GET(_: Request, { params }: Ctx) {
  try {
    const id = Id.parse(params.id);
    const client = check(await db().from("clients").select(CLIENT_COLS).eq("id", id).maybeSingle());
    if (!client) return fail(404, "Cliente não encontrado.");
    const phases = check(await db().from("client_phases")
      .select("phase_label,content,original_content,updated_at").eq("client_id", id));
    return ok({ client, phases });
  } catch (e) { return handle(e); }
}

export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const id = Id.parse(params.id);
    const input = ClientInput.parse(await req.json());
    const row = check(await db().from("clients")
      .update({ ...toRow(input), updated_at: new Date().toISOString() })
      .eq("id", id).select(CLIENT_COLS).maybeSingle());
    if (!row) return fail(404, "Cliente não encontrado.");
    return ok(row);
  } catch (e) { return handle(e); }
}

export async function DELETE(_: Request, { params }: Ctx) {
  try {
    const id = Id.parse(params.id);
    check(await db().from("clients").delete().eq("id", id));
    return ok({ deleted: id });
  } catch (e) { return handle(e); }
}
