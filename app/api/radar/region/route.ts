import { z } from "zod";
import { db, supabaseConfigured } from "@/lib/supabase";
import { fail, handle, ok } from "@/lib/http";
import { GoogleError } from "@/lib/google";
import { runRadarSearch } from "@/lib/radar";
import { summarizeMarket } from "@/lib/market";
import { check } from "@/lib/http";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const Body = z.object({
  niche: z.string().trim().min(2).max(120),
  cities: z.array(z.string().trim().min(2).max(80)).min(1).max(12),
});

/**
 * "Onde prospectar": roda o Radar do mesmo nicho em várias cidades (20 empresas cada),
 * grava os leads e devolve as cidades ordenadas pelo índice de oportunidade.
 */
export async function POST(req: Request) {
  try {
    const { niche, cities } = Body.parse(await req.json());
    const unique = [...new Set(cities)];
    const results: { city: string; query: string; error?: string; summary?: ReturnType<typeof summarizeMarket> }[] = [];

    // 4 buscas por vez: rápido sem estourar a cota do Google.
    for (let i = 0; i < unique.length; i += 4) {
      const batch = await Promise.all(unique.slice(i, i + 4).map(async (city) => {
        const query = `${niche} em ${city}`;
        try {
          const { prospects } = await runRadarSearch(query, 20);
          return { city, query, summary: summarizeMarket(prospects) };
        } catch (e) {
          if (e instanceof GoogleError && e.status === 503) throw e; // sem chave: aborta tudo
          return { city, query, error: (e as Error).message };
        }
      }));
      results.push(...batch);
    }

    const batchId = crypto.randomUUID();
    if (supabaseConfigured()) {
      const rows = results.filter((r) => r.summary).map((r) => ({
        batch_id: batchId, niche, city: r.city, query: r.query, total: r.summary!.total, no_site: r.summary!.noSite,
        avg_reviews: r.summary!.avgReviews, leader_reviews: r.summary!.leaderReviews, hot: r.summary!.hot, opportunity: r.summary!.opportunity,
      }));
      if (rows.length) {
        const { error } = await db().from("market_snapshots").insert(rows);
        if (error) console.error("market_snapshots:", error.message);
      }
    }
    results.sort((a, b) => (b.summary?.opportunity ?? -1) - (a.summary?.opportunity ?? -1));
    return ok({ batchId, niche, createdAt: new Date().toISOString(), results });
  } catch (e) {
    if (e instanceof GoogleError) return fail(e.status, e.message);
    return handle(e);
  }
}

type Snap = { batch_id: string | null; niche: string; city: string; query: string; total: number; no_site: number;
  avg_reviews: number; leader_reviews: number; hot: number; opportunity: number; created_at: string };

const toResult = (r: Snap) => ({ city: r.city, query: r.query, summary: {
  total: r.total, noSite: r.no_site, avgReviews: Number(r.avg_reviews), leaderReviews: r.leader_reviews, hot: r.hot, opportunity: r.opportunity } });

/** Sem ?batch: últimas análises (para reabrir sem gastar buscas no Google). Com ?batch=: o resultado daquela análise. */
export async function GET(req: Request) {
  try {
    const batch = new URL(req.url).searchParams.get("batch");
    if (batch) {
      const id = z.string().uuid().parse(batch);
      const rows = check(await db().from("market_snapshots").select("*").eq("batch_id", id).order("opportunity", { ascending: false })) as Snap[];
      if (!rows.length) return fail(404, "Análise não encontrada.");
      return ok({ batchId: id, niche: rows[0].niche, createdAt: rows[0].created_at, results: rows.map(toResult) });
    }
    const rows = check(await db().from("market_snapshots").select("batch_id,niche,city,created_at")
      .not("batch_id", "is", null).order("created_at", { ascending: false }).limit(600)) as Snap[];
    const batches = new Map<string, { batchId: string; niche: string; createdAt: string; cities: string[] }>();
    for (const r of rows) {
      const b = batches.get(r.batch_id!) ?? { batchId: r.batch_id!, niche: r.niche, createdAt: r.created_at, cities: [] };
      b.cities.push(r.city); batches.set(r.batch_id!, b);
    }
    return ok({ batches: [...batches.values()].slice(0, 30) });
  } catch (e) { return handle(e); }
}
