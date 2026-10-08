import { z } from "zod";
import { db } from "@/lib/supabase";
import { check, fail, handle, ok } from "@/lib/http";
import { STATUSES } from "@/lib/opportunity";

export const dynamic = "force-dynamic";

const Body = z.object({
  status: z.enum(STATUSES).optional(),
  notes: z.string().max(5000).optional(),
  client_id: z.string().uuid().nullable().optional(),
  project_id: z.string().uuid().nullable().optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = z.string().uuid().parse(params.id);
    const body = Body.parse(await req.json());
    const row = check(await db().from("prospects").update({ ...body, updated_at: new Date().toISOString() })
      .eq("id", id).select("*").maybeSingle());
    if (!row) return fail(404, "Lead não encontrado.");
    return ok(row);
  } catch (e) { return handle(e); }
}
