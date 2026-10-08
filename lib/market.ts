// Retrato de um mercado (nicho × cidade) a partir dos leads pontuados. Função pura, testada em lib/market.test.ts.

export type ScoredLead = { score: number; reviews_count: number; website: string; issues: { code: string }[] };

export type MarketSummary = {
  total: number;
  noSite: number;        // sem site ou só rede social
  avgReviews: number;
  leaderReviews: number;
  hot: number;           // nota de oportunidade >= 50
  opportunity: number;   // 0–100: onde vale mais prospectar
};

export const HOT = 50;

export function summarizeMarket(leads: ScoredLead[]): MarketSummary {
  const total = leads.length;
  if (!total) return { total: 0, noSite: 0, avgReviews: 0, leaderReviews: 0, hot: 0, opportunity: 0 };
  const noSite = leads.filter((l) => !l.website || l.issues.some((i) => i.code === "social_only")).length;
  const reviews = leads.map((l) => l.reviews_count ?? 0);
  const avgReviews = Math.round(reviews.reduce((a, b) => a + b, 0) / total);
  const leaderReviews = Math.max(...reviews);
  const hot = leads.filter((l) => l.score >= HOT).length;
  // Muitos leads quentes e sem site = mais vendas possíveis; concorrência fraca (poucas avaliações) = resultado mais rápido.
  const weakCompetition = 1 - Math.min(avgReviews / 150, 1);
  const volume = Math.min(total / 20, 1); // mercado pequeno demais pesa menos
  const opportunity = Math.round(100 * volume * (0.45 * (hot / total) + 0.35 * (noSite / total) + 0.2 * weakCompetition));
  return { total, noSite, avgReviews, leaderReviews, hot, opportunity };
}

/** Cidades sugeridas por região (o usuário pode editar a lista). */
export const REGION_PRESETS: Record<string, string[]> = {
  "Região de Jundiaí": ["Jundiaí", "Várzea Paulista", "Campo Limpo Paulista", "Itupeva", "Louveira", "Jarinu", "Cabreúva", "Itatiba", "Vinhedo", "Valinhos"],
  "Região de Campinas": ["Campinas", "Valinhos", "Vinhedo", "Paulínia", "Sumaré", "Hortolândia", "Indaiatuba", "Americana"],
  "Grande São Paulo": ["São Paulo", "Guarulhos", "Osasco", "Santo André", "São Bernardo do Campo", "Barueri", "Mogi das Cruzes", "Diadema"],
};
