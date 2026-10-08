import { z } from "zod";
import { fail, handle, ok } from "@/lib/http";
import { GoogleError } from "@/lib/google";
import { runRadarSearch } from "@/lib/radar";
import { currentUser } from "@/lib/session";
import { guard, PLACES_USD, recordUsage } from "@/lib/usage";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const Body = z.object({
  query: z.string().trim().min(3).max(200),
  max: z.union([z.literal(20), z.literal(40), z.literal(60)]).default(20),
});

export async function POST(req: Request) {
  try {
    const { query, max } = Body.parse(await req.json());
    const me = await currentUser();
    await guard(me, "places", max / 20); // cada 20 empresas = 1 consulta ao Google
    const r = await runRadarSearch(query, max);
    await recordUsage(me, { kind: "places", action: "radar", query, units: r.requests, cost_usd: r.requests * PLACES_USD });
    return ok(r);
  } catch (e) {
    if (e instanceof GoogleError) return fail(e.status, e.message);
    return handle(e);
  }
}
