import { currentUser } from "@/lib/session";
import { fail, handle, ok } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const me = await currentUser();
    return me ? ok(me) : fail(401, "Sessão expirada.");
  } catch (e) { return handle(e); }
}
