import { db } from "@/lib/supabase";
import { check, handle, ok } from "@/lib/http";
import { CLIENT_COLS, ClientInput, toRow } from "@/lib/schemas";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rows = check(await db().from("clients")
      .select(`${CLIENT_COLS},client_phases(count)`)
      .order("updated_at", { ascending: false }).limit(200));
    return ok(rows);
  } catch (e) { return handle(e); }
}

export async function POST(req: Request) {
  try {
    const input = ClientInput.parse(await req.json());
    const row = check(await db().from("clients").insert(toRow(input)).select(CLIENT_COLS).single());
    return ok(row, 201);
  } catch (e) { return handle(e); }
}
