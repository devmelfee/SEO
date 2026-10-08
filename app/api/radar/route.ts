import { z } from "zod";
import { fail, handle, ok } from "@/lib/http";
import { GoogleError } from "@/lib/google";
import { runRadarSearch } from "@/lib/radar";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const Body = z.object({
  query: z.string().trim().min(3).max(200),
  max: z.union([z.literal(20), z.literal(40), z.literal(60)]).default(20),
});

export async function POST(req: Request) {
  try {
    const { query, max } = Body.parse(await req.json());
    return ok(await runRadarSearch(query, max));
  } catch (e) {
    if (e instanceof GoogleError) return fail(e.status, e.message);
    return handle(e);
  }
}
