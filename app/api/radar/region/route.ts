import { z } from "zod";
import { db, supabaseConfigured } from "@/lib/supabase";
import { fail, handle, ok } from "@/lib/http";
import { GoogleError } from "@/lib/google";
import { runRadarSearch } from "@/lib/radar";
import { summarizeMarket } from "@/lib/market";

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

    if (supabaseConfigured()) {
      const rows = results.filter((r) => r.summary).map((r) => ({
        niche, city: r.city, query: r.query, total: r.summary!.total, no_site: r.summary!.noSite,
        avg_reviews: r.summary!.avgReviews, leader_reviews: r.summary!.leaderReviews, hot: r.summary!.hot, opportunity: r.summary!.opportunity,
      }));
      if (rows.length) {
        const { error } = await db().from("market_snapshots").insert(rows);
        if (error) console.error("market_snapshots:", error.message);
      }
    }
    results.sort((a, b) => (b.summary?.opportunity ?? -1) - (a.summary?.opportunity ?? -1));
    return ok({ niche, results });
  } catch (e) {
    if (e instanceof GoogleError) return fail(e.status, e.message);
    return handle(e);
  }
}
