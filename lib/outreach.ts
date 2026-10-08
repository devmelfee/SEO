// Abordagem por WhatsApp: mensagens personalizadas pelo problema do lead e sequência de follow-up.
// Funções puras, testadas em lib/outreach.test.ts. O envio é sempre manual (1 a 1) pelo WhatsApp da pessoa.
import { whatsappNumber } from "./site.ts";

export type OutreachLead = {
  place_id: string; name: string; query: string; phone: string; website: string;
  rating: number | null; reviews_count: number; rank_in_search: number;
  issues: { code: string }[];
};
export type OutreachCtx = { sender?: string; agency?: string; siteUrl?: string; leaderReviews?: number };

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

/** O problema que mais vende, na ordem do que o dono sente primeiro. */
export function mainHook(l: OutreachLead, ctx: OutreachCtx = {}): string {
  const codes = new Set(l.issues.map((i) => i.code));
  const where = `"${niche(l.query)} em ${city(l.query)}"`;
  if (codes.has("no_website")) return `vi que a ${l.name} aparece no Google Maps quando alguém procura ${where}, mas não tem site — quem clica não encontra mais informações e acaba chamando o concorrente`;
  if (codes.has("social_only")) return `vi que no Google o "site" da ${l.name} leva só para o Instagram/WhatsApp. Isso faz o Google mostrar outras lojas na frente em buscas como ${where}`;
  if (codes.has("few_reviews") || codes.has("behind_leader")) {
    const lead = ctx.leaderReviews ? ` enquanto o primeiro colocado tem ${ctx.leaderReviews}` : "";
    return `vi que a ${l.name} tem ${l.reviews_count} avaliações no Google${lead}. Em buscas como ${where}, isso pesa muito na escolha do cliente`;
  }
  if (codes.has("low_rating") && l.rating) return `vi que a nota da ${l.name} no Google está em ${String(l.rating).replace(".", ",")}. Dá para melhorar isso respondendo e organizando as avaliações`;
  if (codes.has("no_hours") || codes.has("no_phone")) return `vi que o perfil da ${l.name} no Google está incompleto (horário/telefone), e isso faz perder clientes que procuram ${where}`;
  return `fiz uma análise de como a ${l.name} aparece no Google para ${where} e encontrei alguns ajustes simples que trazem mais clientes`;
}

export function buildMessage(l: OutreachLead, step: number, ctx: OutreachCtx = {}): string {
  const me = ctx.sender ? `Sou ${ctx.sender}${ctx.agency ? `, da ${ctx.agency}` : ""}` : ctx.agency ? `Sou da ${ctx.agency}` : "Trabalho com Google Maps para negócios locais";
  const greet = pick(l.place_id + step, ["Olá! Tudo bem?", "Oi, tudo bem?", "Olá, boa tarde! Tudo certo?"]);
  const site = ctx.siteUrl ? `\n\nFiz até uma prévia de como poderia ficar o site de vocês: ${ctx.siteUrl}` : "";
  if (step <= 1) {
    const ask = pick(l.place_id, [
      "Posso te mandar uma análise rápida, sem compromisso?",
      "Faz sentido eu te mostrar em 5 minutos o que daria para ajustar?",
      "Quer que eu te envie o diagnóstico completo? É gratuito.",
    ]);
    return `${greet} ${me}. Pesquisando ${niche(l.query)} em ${city(l.query)}, ${mainHook(l, ctx)}.${site}\n\n${ask}`;
  }
  if (step === 2) {
    return pick(l.place_id + "f2", [
      `Oi! Passando só para ver se você conseguiu olhar minha mensagem sobre a ${l.name} no Google.${ctx.siteUrl ? ` A prévia do site continua aqui: ${ctx.siteUrl}` : ""} Se preferir, te explico por áudio rapidinho.`,
      `Olá! Conseguiu ver o que te mandei sobre a ${l.name}? São ajustes simples que costumam trazer mais ligações já no primeiro mês.${ctx.siteUrl ? ` Prévia do site: ${ctx.siteUrl}` : ""}`,
    ]);
  }
  return `Oi! Última mensagem, prometo 🙂 Se em algum momento quiser melhorar como a ${l.name} aparece no Google${ctx.siteUrl ? ` (ou colocar aquele site no ar: ${ctx.siteUrl})` : ""}, é só me chamar. Se não quiser receber mais mensagens, é só responder "parar" que eu não envio mais.`;
}

/** Link do WhatsApp com a mensagem pronta, ou null se o telefone não for celular. */
export function waLink(phone: string, text: string): string | null {
  const n = whatsappNumber(phone);
  return n ? `https://wa.me/${n}?text=${encodeURIComponent(text)}` : null;
}
