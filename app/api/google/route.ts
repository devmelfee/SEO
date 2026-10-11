import { db } from "@/lib/supabase";
import { currentUser } from "@/lib/session";
import { check, fail, handle, ok } from "@/lib/http";
import { connection, forgetToken, oauthConfigured } from "@/lib/gbpApi";

export const dynamic = "force-dynamic";

/** Estado da conexão da agência com o Google (nunca devolve o token). */
export async function GET() {
  try {
    return ok({ configured: oauthConfigured(), connection: oauthConfigured() ? await connection() : null });
  } catch (e) { return handle(e); }
}

/** Desconecta a conta Google da agência (só administrador). */
export async function DELETE() {
  try {
    const me = await currentUser();
    if (me?.role !== "admin") return fail(403, "Só o administrador desconecta a conta Google.");
    check(await db().from("google_connection").delete().eq("id", 1));
    forgetToken();
    return ok({ disconnected: true });
  } catch (e) { return handle(e); }
}
