// Abordagem por WhatsApp: mensagens personalizadas pelo problema do lead e sequência de follow-up.
// Funções puras, testadas em lib/outreach.test.ts. O envio é sempre manual (1 a 1) pelo WhatsApp da pessoa.
import { whatsappNumber } from "./site.ts";

export type OutreachLead = {
  place_id: string; name: string; query: string; phone: string; website: string;
  rating: number | null; reviews_count: number; rank_in_search: number;
  issues: { code: string }[];
};
export type OutreachCtx = { sender?: string; agency?: string; siteUrl?: string; leaderReviews?: number; contactName?: string };

/** Dias até o próximo lembrete depois de cada passo (1º contato → +2 dias → +3 dias → fim). */
export const FOLLOWUP_DAYS: Record<number, number | null> = { 1: 2, 2: 3, 3: null };
export const MAX_STEP = 3;

export function nextFollowup(step: number, from: Date = new Date()): Date | null {
  const days = FOLLOWUP_DAYS[step];
  if (days == null) return null;
  const d = new Date(from); d.setDate(d.getDate() + days); d.setHours(9, 0, 0, 0);
  return d;
}

export function isDue(nextAt: string | null | undefined, now: Date = new Date()): boolean {
  return !!nextAt && new Date(nextAt).getTime() <= now.getTime();
}

const pick = <T,>(seed: string, list: T[]): T => {
  let h = 0; for (const c of seed) h = (h * 33 + c.charCodeAt(0)) >>> 0;
  return list[h % list.length];
};

const city = (q: string) => q.split(" em ")[1]?.trim() || "sua cidade";
const niche = (q: string) => q.split(" em ")[0]?.trim().toLowerCase() || "seu segmento";

/**
 * O problema que mais vende, na ordem do que o dono sente primeiro.
 * Regras de copy (skill cold-email adaptada ao WhatsApp): uma observação específica e verificável,
 * o efeito no cliente dele, sem jargão de SEO e sem travessão.
 */
export function mainHook(l: OutreachLead, ctx: OutreachCtx = {}): string {
  const codes = new Set(l.issues.map((i) => i.code));
  const where = `"${niche(l.query)} em ${city(l.query)}"`;
  if (codes.has("no_website")) return `vi que a ${l.name} aparece no Google Maps quando alguém procura ${where}, mas não tem site. Quem quer ver preço, foto ou serviço antes de ligar acaba clicando no concorrente`;
  if (codes.has("social_only")) return `vi que o link de site da ${l.name} no Google leva para o Instagram. Na busca por ${where}, o Google costuma pôr na frente quem tem site próprio`;
  if (codes.has("few_reviews") || codes.has("behind_leader")) {
    const lead = ctx.leaderReviews ? `, e o primeiro colocado tem ${ctx.leaderReviews}` : "";
    return `vi que a ${l.name} tem ${l.reviews_count} avaliações no Google${lead}. Quem procura ${where} costuma escolher pelo número de avaliações`;
  }
  if (codes.has("low_rating") && l.rating) return `vi que a nota da ${l.name} no Google está em ${String(l.rating).replace(".", ",")}. Responder as avaliações e pedir avaliação para os clientes satisfeitos costuma subir essa nota em poucas semanas`;
  if (codes.has("no_hours") || codes.has("no_phone")) return `vi que o perfil da ${l.name} no Google está sem ${codes.has("no_hours") ? "horário de funcionamento" : "telefone"}. Quem procura ${where} e não vê isso passa para o próximo da lista`;
  return `olhei como a ${l.name} aparece no Google para ${where} e vi alguns ajustes simples que costumam trazer mais ligações`;
}

/** O que o lembrete acrescenta: um ângulo novo, nunca "só passando para ver". */
function secondAngle(l: OutreachLead, ctx: OutreachCtx): string {
  const codes = new Set(l.issues.map((i) => i.code));
  if (ctx.siteUrl) return `Deixei pronta uma prévia de como ficaria o site da ${l.name}, com telefone, endereço e botão de WhatsApp: ${ctx.siteUrl}`;
  if (codes.has("few_reviews") || codes.has("behind_leader")) return `Uma ideia que funciona bem: um link curto para o cliente avaliar a ${l.name} direto no Google, mandado logo depois do atendimento. Posso montar esse link para você`;
  return `Posso te mandar um print comparando como a ${l.name} aparece no Google com os 3 primeiros da busca por ${niche(l.query)} em ${city(l.query)}`;
}

export function buildMessage(l: OutreachLead, step: number, ctx: OutreachCtx = {}): string {
  const me = ctx.sender ? `Sou ${ctx.sender}${ctx.agency ? `, da ${ctx.agency}` : ""}` : ctx.agency ? `Sou da ${ctx.agency}` : "Trabalho com Google Maps para negócios locais";
  const greet = ctx.contactName
    ? pick(l.place_id + step, [`Olá, ${ctx.contactName}! Tudo bem?`, `Oi, ${ctx.contactName}, tudo bem?`])
    : pick(l.place_id + step, ["Olá! Tudo bem?", "Oi, tudo bem?", "Olá, boa tarde! Tudo certo?"]);
  if (step <= 1) {
    const site = ctx.siteUrl ? `\n\nMontei uma prévia de como poderia ficar o site de vocês: ${ctx.siteUrl}` : "";
    const ask = pick(l.place_id, [
      "Quer que eu te mande o que encontrei? É só responder sim.",
      "Faz sentido eu te mostrar o que daria para ajustar?",
      "Posso te mandar os outros pontos que vi? Não tem custo.",
    ]);
    return `${greet} ${me}. Pesquisando ${niche(l.query)} em ${city(l.query)}, ${mainHook(l, ctx)}.${site}\n\n${ask}`;
  }
  if (step === 2) {
    const hi = ctx.contactName ? `Oi, ${ctx.contactName}!` : "Oi!";
    return `${hi} ${me}, te escrevi sobre a ${l.name} no Google.\n\n${secondAngle(l, ctx)}.\n\nSe preferir, te explico por áudio em 1 minuto.`;
  }
  const hi = ctx.contactName ? `Oi, ${ctx.contactName}!` : "Oi!";
  return `${hi} Não quero encher sua caixa, então esta é a última mensagem. Se um dia quiser que a ${l.name} apareça melhor no Google${ctx.siteUrl ? ` (a prévia do site fica em ${ctx.siteUrl})` : ""}, é só me chamar aqui. Se preferir não receber mais nada, é só responder "parar".`;
}

/** Link do WhatsApp com a mensagem pronta, ou null se o telefone não for celular. */
export function waLink(phone: string, text: string): string | null {
  const n = whatsappNumber(phone);
  return n ? `https://wa.me/${n}?text=${encodeURIComponent(text)}` : null;
}

/** Etapa em que o lead está: 1 = 1º contato, 2 = lembrete do 2º dia, 3 = último lembrete, 4 = sequência concluída. */
export function stageOf(contactStep: number | null | undefined): 1 | 2 | 3 | 4 {
  const s = contactStep ?? 0;
  return s <= 0 ? 1 : s >= MAX_STEP ? 4 : ((s + 1) as 2 | 3);
}

export type StepDate = { step: number; date: string | null; done: boolean };

/** Data de cada etapa: a real (quando já foi enviada) ou a prevista pela sequência. */
export function stepDates(contactStep: number | null | undefined, sent: Record<number, string>, nextAt: string | null | undefined): StepDate[] {
  const out: StepDate[] = [];
  let prev: Date | null = null;
  for (let step = 1; step <= MAX_STEP; step++) {
    if (sent[step]) { prev = new Date(sent[step]); out.push({ step, date: sent[step], done: true }); continue; }
    let planned: Date | null = null;
    if (step === (contactStep ?? 0) + 1 && nextAt) planned = new Date(nextAt);
    else if (prev && FOLLOWUP_DAYS[step - 1] != null) planned = nextFollowup(step - 1, prev);
    out.push({ step, date: planned?.toISOString() ?? null, done: false });
    prev = planned;
  }
  return out;
}

/** Intervalo entre envios no modo sequência (45–90 s): ritmo de gente, não de robô. */
export function cooldownMs(rand: number = Math.random()): number {
  return Math.round(45_000 + Math.min(1, Math.max(0, rand)) * 45_000);
}
