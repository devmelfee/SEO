import { z } from "zod";
import { db } from "@/lib/supabase";
import { check, fail, handle, ok } from "@/lib/http";

export const dynamic = "force-dynamic";

const Body = z.object({
  /** Buscas inteiras (ex.: as cidades selecionadas em "Onde prospectar"). */
  queries: z.array(z.string().min(3).max(200)).max(12).optional().default([]),
  /** Leads avulsos. */
  prospectIds: z.array(z.string().uuid()).max(500).optional().default([]),
  filter: z.enum(["all", "hot", "no_site"]).default("all"),
});

/** Coloca leads num projeto. Leads já em outro projeto mudam para este. */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const projectId = z.string().uuid().parse(params.id);
    const { queries, prospectIds, filter } = Body.parse(await req.json());
    if (!queries.length && !prospectIds.length) return fail(400, "Escolha cidades ou leads.");

    let sel = db().from("prospects").select("id,score,website,issues");
    sel = queries.length ? sel.in("query", queries) : sel.in("id", prospectIds);
    const rows = check(await sel) as { id: string; score: number; website: string; issues: { code: string }[] }[];
    const ids = rows.filter((r) =>
      filter === "all" ? true
      : filter === "hot" ? r.score >= 50
      : !r.website || r.issues?.some((i) => i.code === "social_only"),
    ).map((r) => r.id);

    if (ids.length) {
      check(await db().from("prospects").update({ project_id: projectId, updated_at: new Date().toISOString() }).in("id", ids));
      check(await db().from("projects").update({ updated_at: new Date().toISOString() }).eq("id", projectId));
    }
    return ok({ added: ids.length });
  } catch (e) { return handle(e); }
}
