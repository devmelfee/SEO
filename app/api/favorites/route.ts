import { z } from "zod";
import { db } from "@/lib/supabase";
import { currentUser } from "@/lib/session";
import { check, handle, ok } from "@/lib/http";

export const dynamic = "force-dynamic";

/** Buscas favoritas da equipe: aparecem primeiro e como atalho no Radar. */
export async function GET() {
  try { return ok(check(await db().from("favorite_searches").select("query,created_by,created_at").order("created_at", { ascending: false }))); }
  catch (e) { return handle(e); }
}

const Q = z.object({ query: z.string().trim().min(3).max(200) });

export async function POST(req: Request) {
  try {
    const { query } = Q.parse(await req.json());
    const me = await currentUser();
    check(await db().from("favorite_searches").upsert({ query, created_by: me?.email ?? "" }, { onConflict: "query" }));
    return ok({ query }, 201);
  } catch (e) { return handle(e); }
}

export async function DELETE(req: Request) {
  try {
    const { query } = Q.parse({ query: new URL(req.url).searchParams.get("query") });
    check(await db().from("favorite_searches").delete().eq("query", query));
    return ok({ removed: query });
  } catch (e) { return handle(e); }
}
