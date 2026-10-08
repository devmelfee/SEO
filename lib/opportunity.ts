// Nota de oportunidade de um estabelecimento (0–100; maior = mais fácil de vender e mais a melhorar).
// Função pura: recebe os dados do Google e o contexto da busca. Testada em lib/opportunity.test.ts.

export type PlaceData = {
  id: string;
  name: string;
  website?: string;
  phone?: string;
  rating?: number;
  reviews: number;
  hasHours: boolean;
  photos: number;
  types: string[];
  status?: string; // OPERATIONAL | CLOSED_TEMPORARILY | CLOSED_PERMANENTLY
};

export type Issue = {
  code: "no_website" | "social_only" | "few_reviews" | "behind_leader" | "low_rating" | "no_rating" | "no_hours" | "no_phone" | "few_photos" | "few_categories" | "closed";
  label: string;
  detail: string;
  weight: number;
};

export type SearchContext = { rank: number; leaderReviews: number; total: number };

export function scoreOpportunity(p: PlaceData, ctx: SearchContext): { score: number; issues: Issue[] } {
  const issues: Issue[] = [];
  const add = (code: Issue["code"], label: string, detail: string, weight: number) => issues.push({ code, label, detail, weight });

  if (p.status && p.status !== "OPERATIONAL") {
    return { score: 0, issues: [{ code: "closed", label: "Fechado", detail: `Status no Google: ${p.status}`, weight: 0 }] };
  }

  const social = socialNetwork(p.website);
  if (!p.website?.trim()) add("no_website", "Sem site", "Não tem site no perfil do Google — oportunidade de criar um.", 35);
  else if (social) add("social_only", "Sem site próprio", `O "site" do perfil é um link de ${social} — não ranqueia nem passa credibilidade como um site.`, 30);

  if (p.reviews < 10) add("few_reviews", "Poucas avaliações", `Só ${p.reviews} avaliação(ões).`, 20);
  else if (p.reviews < 30) add("few_reviews", "Poucas avaliações", `${p.reviews} avaliações — abaixo do mínimo competitivo (30+).`, 12);

  if (ctx.leaderReviews > 0 && p.reviews < ctx.leaderReviews * 0.25 && p.reviews >= 10) {
    add("behind_leader", "Longe do líder", `${p.reviews} avaliações contra ${ctx.leaderReviews} do líder da busca.`, 8);
  }

  if (p.rating == null) add("no_rating", "Sem nota", "Ainda não tem nota no Google.", 10);
  else if (p.rating < 4.0) add("low_rating", "Nota baixa", `Nota ${p.rating.toFixed(1)} — abaixo de 4,0 afasta clientes.`, 12);
  else if (p.rating < 4.4) add("low_rating", "Nota a melhorar", `Nota ${p.rating.toFixed(1)} — o topo costuma ter 4,5+.`, 6);

  if (!p.hasHours) add("no_hours", "Sem horário", "Horário de funcionamento não informado.", 8);
  if (!p.phone?.trim()) add("no_phone", "Sem telefone", "Telefone não aparece no perfil.", 8);
  if (p.photos < 5) add("few_photos", "Poucas fotos", `${p.photos} foto(s) no perfil.`, 7);

  const specific = p.types.filter((t) => !["point_of_interest", "establishment", "store", "health", "finance"].includes(t));
  if (specific.length < 2) add("few_categories", "Poucas categorias", "Só a categoria principal — faltam categorias secundárias.", 6);

  let score = issues.reduce((s, i) => s + i.weight, 0);
  // Posições 4–20: já aparecem e querem subir (melhor perfil de venda). Top 3 já está bem.
  if (ctx.rank >= 4 && ctx.rank <= 20) score += 5;
  if (ctx.rank <= 3) score -= 10;
  return { score: Math.max(0, Math.min(100, Math.round(score))), issues };
}

/** WhatsApp, Instagram etc. cadastrados como site: não contam como site próprio. */
export function socialNetwork(url?: string): string | null {
  if (!url) return null;
  let host = "";
  try { host = new URL(url).hostname.replace(/^www\./, "").toLowerCase(); } catch { return null; }
  const map: [RegExp, string][] = [
    [/(^|\.)(wa\.me|whatsapp\.com|api\.whatsapp\.com)$/, "WhatsApp"], [/(^|\.)instagram\.com$/, "Instagram"],
    [/(^|\.)(facebook\.com|fb\.com|fb\.me)$/, "Facebook"], [/(^|\.)(linktr\.ee|linktree\.com|beacons\.ai|bio\.link)$/, "Linktree"],
    [/(^|\.)tiktok\.com$/, "TikTok"], [/(^|\.)(shopee\.com\.br|mercadolivre\.com\.br)$/, "marketplace"],
  ];
  return map.find(([re]) => re.test(host))?.[1] ?? null;
}

export const STATUSES = ["novo", "abordado", "proposta", "fechado", "descartado"] as const;
export type ProspectStatus = (typeof STATUSES)[number];
