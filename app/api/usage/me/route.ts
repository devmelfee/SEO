import { currentUser } from "@/lib/session";
import { fail, handle, ok } from "@/lib/http";
import { usageStatus } from "@/lib/usage";

export const dynamic = "force-dynamic";

/** Quanto a pessoa já usou nas janelas e para quem pedir mais. */
export async function GET() {
  try {
    const me = await currentUser();
    if (!me) return fail(401, "Sessão expirada.");
    return ok({ email: me.email, role: me.role, ...(await usageStatus(me)) });
  } catch (e) { return handle(e); }
}
