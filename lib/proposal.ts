// Proposta comercial com o nome da empresa: dados → página pública (/p/slug) e mensagens de WhatsApp.
// Funções puras, testadas em lib/proposal.test.ts. Nada aqui chama IA: a proposta sai na hora.
import { whatsappNumber } from "./site.ts";

export type Problem = { title: string; detail: string };
export type Rival = { name: string; reviews: number; rating: number | null; site: boolean; you?: boolean };

export type ProposalData = {
  company: string; niche: string; city: string;
  agency: string; consultant: string; agencyWhatsapp: string;
  problems: Problem[];
  comparison: Rival[];
  deliverables: string[];
  trialPrice: string; monthlyPrice: string; terms: string;
  siteUrl: string;
  validDays: number;
  date: string; // ISO
};

export const DEFAULT_DELIVERABLES = [
  "Otimização completa do Perfil da Empresa no Google (categorias, serviços, horários, fotos)",
  "Site profissional com botão de WhatsApp, pronto para aparecer no Google",
  "2 a 3 publicações por semana no Perfil do Google",
  "Pedido e resposta de avaliações para subir a nota e o número de avaliações",
  "Cadastro e correção de dados em diretórios (endereço e telefone iguais em todo lugar)",
  "Relatório mensal com posição no Google Maps, ligações e cliques",
];

const GENERIC_PROBLEMS: Problem[] = [
  { title: "Perfil do Google incompleto", detail: "Informações que faltam fazem o Google mostrar concorrentes na frente." },
  { title: "Poucas avaliações recentes", detail: "Avaliações são o que mais pesa na escolha do cliente e no ranking do Maps." },
  { title: "Sem rotina de publicações", detail: "Perfis ativos aparecem mais — no Google e nas buscas feitas por IA." },
];

type Seed = {
  company: string; niche: string; city: string;
  agency?: string; consultant?: string; agencyWhatsapp?: string;
  trialPrice?: string; monthlyPrice?: string; siteUrl?: string;
  issues?: { label: string; detail: string }[];
  self?: { reviews: number; rating: number | null; site: boolean } | null;
  rivals?: { name: string; reviews: number; rating: number | null; site: boolean }[];
};

/** Proposta inicial a partir do que o sistema já sabe do lead (problemas do Radar e concorrentes da busca). */
export function defaultProposal(s: Seed, now = new Date()): ProposalData {
  const problems = (s.issues ?? []).filter((i) => i.label).slice(0, 5).map((i) => ({ title: i.label, detail: i.detail }));
  const comparison: Rival[] = [
    ...(s.self ? [{ name: s.company, ...s.self, you: true }] : []),
    ...(s.rivals ?? []).slice(0, 3),
  ];
  return {
    company: s.company, niche: s.niche, city: s.city,
    agency: s.agency ?? "", consultant: s.consultant ?? "", agencyWhatsapp: s.agencyWhatsapp ?? "",
    problems: problems.length ? problems : GENERIC_PROBLEMS,
    comparison: comparison.length > 1 ? comparison : [],
    deliverables: [...DEFAULT_DELIVERABLES],
    trialPrice: s.trialPrice ?? "", monthlyPrice: s.monthlyPrice ?? "",
    terms: "Sem fidelidade: depois do teste, mensal, e você pode cancelar quando quiser.",
    siteUrl: s.siteUrl ?? "", validDays: 7, date: now.toISOString(),
  };
}

const esc = (v: unknown) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const fmtDate = (iso: string, plusDays = 0) => {
  const d = new Date(iso); d.setDate(d.getDate() + plusDays);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric", timeZone: "America/Sao_Paulo" });
};
const safeUrl = (u: string) => (/^https?:\/\//i.test(u) ? u : "");

/** Texto que o cliente manda ao aceitar (vai para o WhatsApp da agência). */
export function acceptMessage(p: ProposalData): string {
  return `Olá${p.consultant ? `, ${p.consultant}` : ""}! Aceito a proposta para a ${p.company}. Como seguimos?`;
}
export function acceptLink(p: ProposalData): string | null {
  const n = whatsappNumber(p.agencyWhatsapp);
  return n ? `https://wa.me/${n}?text=${encodeURIComponent(acceptMessage(p))}` : null;
}

/** Página da proposta: HTML estático, sem JavaScript, pronta para imprimir/salvar em PDF. */
export function buildProposalHtml(p: ProposalData, opts: { accepted?: boolean; acceptedAt?: string | null } = {}): string {
  const brand = p.agency || "Proposta comercial";
  const contact = whatsappNumber(p.agencyWhatsapp);
  const price = [p.trialPrice && `<div class="price"><span>Teste de 30 dias</span><strong>${esc(p.trialPrice)}</strong></div>`,
    p.monthlyPrice && `<div class="price"><span>Depois, por mês</span><strong>${esc(p.monthlyPrice)}</strong></div>`].filter(Boolean).join("");
  const rows = p.comparison.map((r) => `<tr${r.you ? ' class="you"' : ""}><td>${esc(r.name)}${r.you ? " <em>(vocês)</em>" : ""}</td>
    <td>${r.reviews}</td><td>${r.rating ?? "—"}</td><td>${r.site ? "Sim" : "<b>Não</b>"}</td></tr>`).join("");
  const site = safeUrl(p.siteUrl);
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>Proposta — ${esc(p.company)}</title>
<style>
*{box-sizing:border-box}body{margin:0;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#0f172a;background:#f1f5f9;line-height:1.55}
.wrap{max-width:780px;margin:0 auto;padding:24px 16px 48px}.card{background:#fff;border-radius:16px;padding:28px;box-shadow:0 1px 3px #0f172a14;margin-bottom:16px}
.top{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;color:#475569;font-size:14px}
h1{font-size:28px;line-height:1.2;margin:10px 0 4px}h2{font-size:18px;margin:0 0 12px}.muted{color:#64748b;font-size:14px}
.prob{border-left:4px solid #f59e0b;padding:8px 12px;margin:0 0 10px;background:#fffbeb;border-radius:0 8px 8px 0}.prob b{display:block}
table{width:100%;border-collapse:collapse;font-size:14px}th,td{text-align:left;padding:8px;border-bottom:1px solid #e2e8f0}th{color:#64748b;font-weight:600}
tr.you td{background:#eff6ff;font-weight:600}ul.del{padding-left:0;list-style:none;margin:0}ul.del li{padding:8px 0 8px 30px;position:relative;border-bottom:1px solid #f1f5f9}
ul.del li:before{content:"✓";position:absolute;left:4px;color:#16a34a;font-weight:800}
.prices{display:flex;gap:12px;flex-wrap:wrap;margin:8px 0 12px}.price{flex:1 1 200px;border:2px solid #e2e8f0;border-radius:12px;padding:14px}
.price span{display:block;color:#64748b;font-size:13px}.price strong{font-size:24px}
.cta{display:block;width:100%;border:0;border-radius:12px;padding:16px;font-size:17px;font-weight:800;color:#fff;background:#16a34a;cursor:pointer;text-align:center;text-decoration:none}
.ok{background:#dcfce7;color:#166534;border-radius:12px;padding:16px;font-weight:700;text-align:center}a{color:#2563eb}
@media print{body{background:#fff}.card{box-shadow:none;padding:12px 0}.noprint{display:none}}
</style></head><body><div class="wrap">
<div class="card"><div class="top"><strong>${esc(brand)}</strong><span>${esc(fmtDate(p.date))}</span></div>
<h1>Proposta para ${esc(p.company)}</h1>
<p class="muted">Mais clientes pelo Google para ${esc(p.niche.toLowerCase())} em ${esc(p.city)}${p.consultant ? ` · preparada por ${esc(p.consultant)}` : ""}</p></div>
<div class="card"><h2>O que encontramos</h2>${p.problems.map((x) => `<div class="prob"><b>${esc(x.title)}</b>${esc(x.detail)}</div>`).join("")}</div>
${rows ? `<div class="card"><h2>Vocês x quem aparece na frente</h2><table><thead><tr><th>Empresa</th><th>Avaliações</th><th>Nota</th><th>Site</th></tr></thead><tbody>${rows}</tbody></table>
<p class="muted">Dados públicos do Google Maps na busca "${esc(p.niche.toLowerCase())} em ${esc(p.city)}".</p></div>` : ""}
<div class="card"><h2>O que vamos fazer</h2><ul class="del">${p.deliverables.filter(Boolean).map((d) => `<li>${esc(d)}</li>`).join("")}</ul>
${site ? `<p style="margin-top:14px">👉 Prévia do site que preparamos para vocês: <a href="${esc(site)}" target="_blank" rel="noopener">${esc(site)}</a></p>` : ""}</div>
<div class="card"><h2>Investimento</h2>${price ? `<div class="prices">${price}</div>` : `<p class="muted">Valores a combinar.</p>`}
<p class="muted">${esc(p.terms)} Proposta válida até ${esc(fmtDate(p.date, p.validDays))}.</p></div>
<div class="card noprint">${opts.accepted
    ? `<div class="ok">✅ Proposta aceita${opts.acceptedAt ? ` em ${esc(fmtDate(opts.acceptedAt))}` : ""}. Em breve entramos em contato!</div>`
    : `<form method="post"><button class="cta" type="submit">✅ Aceitar proposta</button></form>
<p class="muted" style="text-align:center;margin:10px 0 0">Ao aceitar, abrimos o WhatsApp para combinar o início.</p>`}
${contact ? `<p style="text-align:center;margin:14px 0 0"><a href="https://wa.me/${contact}" target="_blank" rel="noopener">Tirar dúvidas no WhatsApp</a></p>` : ""}</div>
</div></body></html>`;
}

/** Mensagem para mandar a proposta pelo WhatsApp do cliente. */
export function proposalMessage(p: ProposalData, url: string): string {
  return `Olá! Tudo bem? ${p.consultant ? `Aqui é ${p.consultant}${p.agency ? `, da ${p.agency}` : ""}. ` : ""}Preparei a proposta para a ${p.company} aparecer mais no Google em ${p.city}:\n${url}\n\nSe fizer sentido, é só clicar em "Aceitar proposta" no fim da página. Qualquer dúvida, me chama aqui.`;
}

/** Resumo do diagnóstico para mandar antes da proposta (gera conversa). */
export function diagnosisMessage(company: string, city: string, problems: Problem[], sender = ""): string {
  const top = problems.slice(0, 3).map((x, i) => `${i + 1}. ${x.title} — ${x.detail}`).join("\n");
  return `Olá! ${sender ? `Aqui é ${sender}. ` : ""}Fiz uma análise de como a ${company} aparece no Google em ${city}. Os 3 pontos que mais estão tirando clientes de vocês:\n\n${top}\n\nPosso te mostrar como resolver em 10 minutos?`;
}

/** Link do WhatsApp do cliente com a mensagem, ou null se não houver celular. */
export function clientWaLink(phone: string | undefined, text: string): string | null {
  const n = whatsappNumber(phone);
  return n ? `https://wa.me/${n}?text=${encodeURIComponent(text)}` : null;
}
