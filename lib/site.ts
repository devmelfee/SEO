// Gerador de site de prévia (landing page de 1 página). Funções puras, testadas em lib/site.test.ts.
// O HTML é servido em /s/[slug] isolado (CSP sandbox, sem JavaScript) e marcado como noindex.

export type SiteData = {
  name: string;
  niche: string;
  city: string;
  phone?: string;
  address?: string;
  hours?: string[];
  rating?: number | null;
  reviews?: number;
  mapsUrl?: string;
  services?: string[];
  tagline?: string;
  agency?: string;
};

const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

/** Celular brasileiro → número para wa.me (55 + DDD + número). Fixo ou inválido → null. */
export function whatsappNumber(phone?: string): string | null {
  const d = (phone ?? "").replace(/\D/g, "").replace(/^0+/, "");
  const local = d.startsWith("55") && d.length >= 12 ? d.slice(2) : d;
  // DDD (2) + 9 + 8 dígitos = celular
  return /^\d{2}9\d{8}$/.test(local) ? `55${local}` : null;
}

export function siteSlug(name: string, city: string): string {
  const s = `${name}-${city}`.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
  return s || "site";
}

/** Serviços genéricos por nicho quando o usuário não informou (sempre editáveis). */
export function defaultServices(niche: string): string[] {
  const n = niche.toLowerCase();
  if (/roupa|moda|boutique|loja/.test(n)) return ["Novidades toda semana", "Atendimento personalizado", "Compra pelo WhatsApp", "Retirada na loja"];
  if (/dent|odonto/.test(n)) return ["Avaliação e limpeza", "Clareamento", "Implantes", "Ortodontia"];
  if (/pet|veterin/.test(n)) return ["Banho e tosa", "Consultas", "Rações e acessórios", "Leva e traz"];
  if (/encan|hidr/.test(n)) return ["Desentupimento", "Caça-vazamentos", "Instalações hidráulicas", "Atendimento de emergência"];
  if (/eletric/.test(n)) return ["Instalações elétricas", "Quadros e disjuntores", "Manutenção preventiva", "Atendimento de emergência"];
  if (/advog/.test(n)) return ["Consultoria", "Ações e processos", "Acordos", "Atendimento online"];
  if (/oficina|mec[aâ]nic|auto/.test(n)) return ["Revisão completa", "Freios e suspensão", "Troca de óleo", "Diagnóstico"];
  return ["Atendimento personalizado", "Orçamento sem compromisso", "Profissionais experientes", "Atendimento pelo WhatsApp"];
}

function themeColor(seed: string): string {
  const palette = ["#7C3AED", "#0D9488", "#DB2777", "#2563EB", "#EA580C", "#059669", "#9333EA", "#0891B2"];
  let h = 0; for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return palette[h % palette.length];
}

/** Site pronto a partir de um modelo — funciona sem IA. Só usa dados reais; o que falta não aparece. */
export function buildSiteHtml(d: SiteData): string {
  const color = themeColor(d.name + d.niche);
  const wa = whatsappNumber(d.phone);
  const services = (d.services?.filter(Boolean).length ? d.services! : defaultServices(d.niche)).slice(0, 6);
  const tagline = d.tagline?.trim() || `${d.niche} em ${d.city}`;
  const waText = encodeURIComponent(`Olá! Vi o site da ${d.name} e gostaria de mais informações.`);
  const mapsQuery = encodeURIComponent(`${d.name} ${d.address || d.city}`);
  const mapsLink = d.mapsUrl || `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`;
  const telDigits = (d.phone ?? "").replace(/\D/g, "");
  const ld = {
    "@context": "https://schema.org", "@type": "LocalBusiness", name: d.name,
    ...(d.address ? { address: d.address } : {}), ...(d.phone ? { telephone: d.phone } : {}),
    areaServed: d.city,
  };

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${esc(d.name)} — ${esc(tagline)}</title>
<meta name="description" content="${esc(`${d.name}: ${d.niche} em ${d.city}.${d.address ? ` ${d.address}.` : ""}`)}">
<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, "\\u003c")}</script>
<style>
:root{--c:${color};--ink:#0f172a;--muted:#475569;--bg:#ffffff;--soft:#f8fafc;--line:#e2e8f0}
*{box-sizing:border-box}body{margin:0;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:var(--ink);background:var(--bg);line-height:1.6}
a{color:inherit}.wrap{max-width:1040px;margin:0 auto;padding:0 20px}
.ribbon{background:#0f172a;color:#fff;text-align:center;font-size:12px;padding:6px 12px}
header{padding:14px 0;border-bottom:1px solid var(--line)}header .wrap{display:flex;justify-content:space-between;align-items:center;gap:12px}
.brand{font-weight:800;font-size:18px}.hero{background:linear-gradient(135deg,var(--c),#0f172a);color:#fff;padding:72px 0 64px}
.hero h1{font-size:clamp(28px,5vw,46px);line-height:1.15;margin:0 0 12px}.hero p{font-size:18px;opacity:.92;margin:0 0 26px;max-width:620px}
.btns{display:flex;gap:12px;flex-wrap:wrap}.btn{display:inline-block;padding:14px 22px;border-radius:12px;font-weight:700;text-decoration:none;font-size:15px}
.btn-wa{background:#22c55e;color:#06230f}.btn-ghost{background:rgba(255,255,255,.14);color:#fff;border:1px solid rgba(255,255,255,.35)}
.btn-c{background:var(--c);color:#fff}
.stars{display:inline-flex;gap:8px;align-items:center;background:rgba(255,255,255,.14);padding:8px 14px;border-radius:999px;margin-bottom:18px;font-size:14px}
section{padding:56px 0}section.soft{background:var(--soft)}h2{font-size:26px;margin:0 0 20px}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px}
.card{background:#fff;border:1px solid var(--line);border-radius:14px;padding:20px}.card b{display:block;font-size:16px;margin-bottom:4px}
.card span{color:var(--muted);font-size:14px}.info{display:grid;grid-template-columns:1fr 1fr;gap:24px}
.hours{list-style:none;padding:0;margin:0}.hours li{display:flex;justify-content:space-between;border-bottom:1px solid var(--line);padding:8px 0;font-size:14px}
.map{width:100%;height:300px;border:0;border-radius:14px}
.cta{background:var(--c);color:#fff;text-align:center}.cta h2{color:#fff}.cta p{opacity:.9;margin:0 0 22px}
footer{padding:26px 0;color:var(--muted);font-size:13px;text-align:center}
.float{position:fixed;right:18px;bottom:18px;background:#22c55e;color:#06230f;font-weight:800;padding:14px 18px;border-radius:999px;text-decoration:none;box-shadow:0 8px 24px rgba(0,0,0,.2)}
@media(max-width:720px){.info{grid-template-columns:1fr}.hero{padding:52px 0}}
</style>
</head>
<body>
<div class="ribbon">Prévia de site criada para apresentação${d.agency ? ` por ${esc(d.agency)}` : ""} · não é o site oficial da empresa</div>
<header><div class="wrap"><span class="brand">${esc(d.name)}</span>${wa ? `<a class="btn btn-c" href="https://wa.me/${wa}?text=${waText}" target="_blank" rel="noopener">WhatsApp</a>` : telDigits ? `<a class="btn btn-c" href="tel:${telDigits}">Ligar</a>` : ""}</div></header>
<div class="hero"><div class="wrap">
${d.rating && d.reviews ? `<div class="stars">★ ${esc(d.rating.toFixed(1).replace(".", ","))} no Google · ${esc(d.reviews)} avaliações</div>` : ""}
<h1>${esc(d.name)}</h1>
<p>${esc(tagline)}. ${d.address ? "Venha nos visitar ou fale com a gente agora." : "Fale com a gente agora."}</p>
<div class="btns">
${wa ? `<a class="btn btn-wa" href="https://wa.me/${wa}?text=${waText}" target="_blank" rel="noopener">Chamar no WhatsApp</a>` : ""}
${telDigits ? `<a class="btn btn-ghost" href="tel:${telDigits}">Ligar ${esc(d.phone)}</a>` : ""}
<a class="btn btn-ghost" href="${esc(mapsLink)}" target="_blank" rel="noopener">Como chegar</a>
</div></div></div>
<section><div class="wrap"><h2>O que oferecemos</h2><div class="grid">
${services.map((s) => `<div class="card"><b>${esc(s)}</b><span>Em ${esc(d.city)} e região</span></div>`).join("\n")}
</div></div></section>
<section class="soft"><div class="wrap info">
<div><h2>Onde estamos</h2>${d.address ? `<p>${esc(d.address)}</p>` : `<p>${esc(d.city)}</p>`}
<iframe class="map" loading="lazy" title="Mapa" src="https://www.google.com/maps?q=${mapsQuery}&output=embed"></iframe></div>
<div><h2>Horário</h2>${d.hours?.length ? `<ul class="hours">${d.hours.map((h) => { const [day, ...rest] = h.split(":"); return `<li><span>${esc(day)}</span><span>${esc(rest.join(":").trim())}</span></li>`; }).join("")}</ul>` : `<p>Consulte pelo telefone ou WhatsApp.</p>`}</div>
</div></section>
<section class="cta"><div class="wrap"><h2>Pronto para falar com a ${esc(d.name)}?</h2><p>Atendimento rápido em ${esc(d.city)}.</p>
${wa ? `<a class="btn btn-wa" href="https://wa.me/${wa}?text=${waText}" target="_blank" rel="noopener">Chamar no WhatsApp</a>` : telDigits ? `<a class="btn btn-wa" href="tel:${telDigits}">Ligar agora</a>` : ""}
</div></section>
<footer>© ${new Date().getFullYear()} ${esc(d.name)} · ${esc(d.city)}</footer>
${wa ? `<a class="float" href="https://wa.me/${wa}?text=${waText}" target="_blank" rel="noopener" aria-label="WhatsApp">WhatsApp</a>` : ""}
</body>
</html>`;
}

/** Prompt para a IA (ou para copiar no Claude.ai). Só dados reais; nada de depoimentos inventados. */
export function buildSitePrompt(d: SiteData): { system: string; prompt: string } {
  const wa = whatsappNumber(d.phone);
  const facts = [
    `Nome: ${d.name}`, `Nicho: ${d.niche}`, `Cidade: ${d.city}`,
    d.address && `Endereço: ${d.address}`, d.phone && `Telefone: ${d.phone}`,
    wa ? `WhatsApp (link): https://wa.me/${wa}` : "WhatsApp: não informado (use o botão Ligar)",
    d.hours?.length && `Horário: ${d.hours.join("; ")}`,
    d.rating && d.reviews ? `Nota no Google: ${d.rating} com ${d.reviews} avaliações` : "Avaliações: não informar",
    d.mapsUrl && `Link do Google Maps: ${d.mapsUrl}`,
    d.services?.length ? `Serviços/produtos: ${d.services.join(", ")}` : "Serviços: proponha 4 a 6 típicos do nicho, sem promessas específicas",
    d.tagline && `Frase de destaque: ${d.tagline}`,
  ].filter(Boolean).join("\n");
  return {
    system: "Você é web designer e copywriter sênior especializado em sites de negócios locais brasileiros que convertem em ligações e mensagens de WhatsApp. Responda SOMENTE com o código HTML completo, sem comentários nem explicações.",
    prompt: `Crie um site de 1 página (landing page) para apresentar como PRÉVIA ao dono da empresa abaixo.

DADOS REAIS (use só estes; o que não estiver aqui, deixe de fora):
${facts}

REQUISITOS
- Um único arquivo HTML completo (<!doctype html>), CSS dentro de <style>, SEM JavaScript e sem bibliotecas externas.
- Mobile first, bonito e profissional, fonte do sistema, cor principal combinando com o nicho, bom contraste.
- <meta name="robots" content="noindex, nofollow"> e uma faixa no topo: "Prévia de site criada para apresentação${d.agency ? ` por ${d.agency}` : ""} · não é o site oficial da empresa".
- Seções: topo com nome e botão principal; hero com frase forte usando "${d.niche} em ${d.city}" e botões (WhatsApp, Ligar, Como chegar); serviços; diferenciais; onde estamos (endereço + mapa em iframe https://www.google.com/maps?q=NOME+ENDERECO&output=embed); horário; chamada final; rodapé; botão flutuante de WhatsApp.
- SEO local: <title> e meta description com nicho + cidade, títulos h1/h2 com palavras-chave naturais e JSON-LD LocalBusiness só com os dados reais.
- PROIBIDO inventar depoimentos, nomes de clientes, prêmios, anos de experiência, preços ou números. Se citar a nota do Google, use exatamente a informada.
- Textos em português do Brasil, curtos e diretos, focados em fazer a pessoa chamar no WhatsApp ou ligar.`,
  };
}

/** Extrai o HTML da resposta da IA (com ou sem bloco ```html) e confere o mínimo. */
export function extractHtml(text: string): string | null {
  const fenced = text.match(/```(?:html)?\s*([\s\S]*?)```/i);
  const html = (fenced ? fenced[1] : text).trim();
  if (!/<html[\s>]/i.test(html) || !/<\/html>/i.test(html)) return null;
  return html.startsWith("<!doctype") || html.startsWith("<!DOCTYPE") ? html : `<!doctype html>\n${html}`;
}
