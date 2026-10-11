import { handle, ok } from "@/lib/http";
import { listLocations } from "@/lib/gbpApi";

export const dynamic = "force-dynamic";

/** Perfis do Google que a conta conectada gerencia. */
export async function GET() {
  try { return ok(await listLocations()); } catch (e) { return handle(e); }
}
