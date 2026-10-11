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
  // Tons sóbrios, de comércio de bairro: verde-floresta, tijolo, azul-marinho, ocre, petróleo.
  const palette = ["#1F5E4A", "#8A3B25", "#1E4E79", "#7A5A12", "#245B66", "#5B3A5E"];
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
:root{--c:${color};--ink:#1c1917;--muted:#57534e;--bg:#ffffff;--cream:#faf7f2;--line:#e7e5e4}
*{box-sizing:border-box}body{margin:0;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:var(--ink);background:var(--bg);line-height:1.6}
a{color:inherit}.wrap{max-width:980px;margin:0 auto;padding:0 20px}
h1,h2{font-family:Georgia,"Times New Roman",serif;font-weight:700;letter-spacing:-.01em}
.ribbon{background:#f5f5f4;color:#78716c;text-align:center;font-size:12px;padding:6px 12px}
header{padding:16px 0;border-bottom:1px solid var(--line)}header .wrap{display:flex;justify-content:space-between;align-items:center;gap:12px}
.brand{font-family:Georgia,serif;font-weight:700;font-size:19px}.brand small{display:block;font-family:system-ui,sans-serif;font-weight:400;font-size:12.5px;color:var(--muted)}
.tel{font-weight:600;text-decoration:none;color:var(--c);white-space:nowrap}
.hero{background:var(--cream);padding:56px 0 48px;border-bottom:1px solid var(--line)}
.hero h1{font-size:clamp(30px,6vw,52px);line-height:1.1;margin:0 0 10px;color:var(--ink)}
.lead{font-size:18px;color:var(--muted);margin:0 0 8px;max-width:600px}.rating{font-size:15px;color:var(--ink);margin:0 0 26px}.rating b{color:#b45309}
.btns{display:flex;gap:10px;flex-wrap:wrap}.btn{display:inline-flex;align-items:center;justify-content:center;padding:13px 22px;border-radius:10px;font-weight:600;text-decoration:none;font-size:15.5px}
.btn-main{background:var(--c);color:#fff}.btn-line{background:#fff;color:var(--ink);border:1px solid #d6d3d1}
section{padding:48px 0}h2{font-size:26px;margin:0 0 18px}
.list{list-style:none;margin:0;padding:0;border-top:1px solid var(--line)}.list li{padding:14px 0;border-bottom:1px solid var(--line);font-size:17px;display:flex;gap:12px;align-items:baseline}
.list li:before{content:"";width:8px;height:8px;border-radius:50%;background:var(--c);flex-shrink:0;transform:translateY(-2px)}
.info{display:grid;grid-template-columns:1.2fr 1fr;gap:32px}.addr{margin:0 0 12px;font-size:16px}
.hours{list-style:none;padding:0;margin:0}.hours li{display:flex;justify-content:space-between;gap:12px;border-bottom:1px solid var(--line);padding:9px 0;font-size:15px}
.hours li span:first-child{display:inline-block}.hours li span:first-child::first-letter{text-transform:uppercase}
.map{width:100%;height:260px;border:1px solid var(--line);border-radius:12px;margin-top:4px}
footer{padding:28px 0;color:#78716c;font-size:13px;text-align:center;border-top:1px solid var(--line)}
.bar{display:none}
@media(max-width:720px){.info{grid-template-columns:1fr}.hero{padding:40px 0 36px}.tel{display:none}
 body{padding-bottom:76px}.bar{display:grid;grid-template-columns:${wa && telDigits ? "1fr 1fr" : "1fr"};gap:8px;position:fixed;left:0;right:0;bottom:0;padding:10px 12px calc(10px + env(safe-area-inset-bottom));background:#fff;border-top:1px solid var(--line)}
 .bar .btn{padding:13px 10px}}
</style>
</head>
<body>
<div class="ribbon">Prévia de site criada para apresentação${d.agency ? ` por ${esc(d.agency)}` : ""} · não é o site oficial da empresa</div>
<header><div class="wrap"><span class="brand">${esc(d.name)}<small>${esc(d.niche)} · ${esc(d.city)}</small></span>${telDigits ? `<a class="tel" href="tel:${telDigits}">${esc(d.phone)}</a>` : ""}</div></header>
<div class="hero"><div class="wrap">
<h1>${esc(d.name)}</h1>
<p class="lead">${esc(tagline)}${d.address ? ` — ${esc(d.address)}` : ""}.</p>
${d.rating && d.reviews ? `<p class="rating"><b>★ ${esc(d.rating.toFixed(1).replace(".", ","))}</b> no Google · ${esc(d.reviews)} avaliações</p>` : `<p class="rating"></p>`}
<div class="btns">
${wa ? `<a class="btn btn-main" href="https://wa.me/${wa}?text=${waText}" target="_blank" rel="noopener">Falar no WhatsApp</a>` : telDigits ? `<a class="btn btn-main" href="tel:${telDigits}">Ligar agora</a>` : ""}
<a class="btn btn-line" href="${esc(mapsLink)}" target="_blank" rel="noopener">Como chegar</a>
</div></div></div>
<section><div class="wrap"><h2>Serviços</h2><ul class="list">
${services.map((x) => `<li>${esc(x)}</li>`).join("\n")}
</ul></div></section>
<section style="background:var(--cream);border-top:1px solid var(--line)"><div class="wrap info">
<div><h2>Onde estamos</h2><p class="addr">${esc(d.address || d.city)}</p>
<iframe class="map" loading="lazy" title="Mapa" src="https://www.google.com/maps?q=${mapsQuery}&output=embed"></iframe></div>
<div><h2>Horário</h2>${d.hours?.length ? `<ul class="hours">${d.hours.map((h) => { const [day, ...rest] = h.split(":"); return `<li><span>${esc(day)}</span><span>${esc(rest.join(":").trim())}</span></li>`; }).join("")}</ul>` : `<p>Consulte pelo telefone ou WhatsApp.</p>`}</div>
</div></section>
<footer>${esc(d.name)} · ${esc(d.city)}${d.phone ? ` · ${esc(d.phone)}` : ""}</footer>
${wa || telDigits ? `<nav class="bar" aria-label="Contato">${telDigits ? `<a class="btn btn-line" href="tel:${telDigits}">Ligar</a>` : ""}${wa ? `<a class="btn btn-main" href="https://wa.me/${wa}?text=${waText}" target="_blank" rel="noopener">WhatsApp</a>` : ""}</nav>` : ""}
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

REQUISITOS TÉCNICOS
- Um único arquivo HTML completo (<!doctype html>), CSS dentro de <style>, SEM JavaScript e sem bibliotecas, fontes ou imagens externas.
- <meta name="robots" content="noindex, nofollow"> e uma faixa discreta no topo: "Prévia de site criada para apresentação${d.agency ? ` por ${d.agency}` : ""} · não é o site oficial da empresa".
- SEO local: <title> e meta description com nicho + cidade, um único h1, h2 com palavras-chave naturais e JSON-LD LocalBusiness só com os dados reais.

APARÊNCIA (deve parecer feito por um designer local, não por IA)
- Fundo claro e quente (branco e um creme suave tipo #faf7f2), texto quase preto, UMA cor de destaque sóbria que combine com o nicho, usada só em botões e detalhes.
- Títulos em serifa (Georgia), texto em fonte do sistema. Hierarquia por tamanho e espaço, não por enfeite.
- PROIBIDO: gradientes, texto com gradiente, emojis, ícones de caractere (✓ ★ ✆), selos inventados, cards todos iguais em grade como estrutura da página, sombras pesadas, borda colorida grossa na lateral, frases genéricas como "qualidade e excelência", "o melhor de ${d.city}" ou "em ${d.city} e região".
- Ícones, se usar, em SVG inline simples. Bom contraste (texto no mínimo 4.5:1).
- Mobile first: no celular, barra fixa no rodapé com os botões WhatsApp e Ligar (os que existirem nos dados); no computador, os mesmos botões no topo e no hero. Sem botão flutuante redondo.

CONTEÚDO
- Topo: nome da empresa e botão principal.
- Hero: o que a empresa é e onde fica, em uma frase concreta usando "${d.niche.toLowerCase()} em ${d.city}"; subtítulo curto; botões WhatsApp, Ligar e Como chegar (só os que tiverem dado).
- Serviços em lista simples com uma linha de descrição cada.
- Se houver nota do Google, mostre exatamente a informada, com o número de avaliações.
- Onde estamos: endereço + mapa em iframe https://www.google.com/maps?q=NOME+ENDERECO&output=embed (com loading="lazy"); horário em tabela simples.
- Chamada final curta e rodapé com nome, endereço e telefone.
- PROIBIDO inventar depoimentos, nomes de clientes, prêmios, anos de experiência, preços, números, fotos ou e-mail. O que não está em DADOS REAIS fica de fora.
- Português do Brasil, frases curtas, sem exclamação em excesso, focadas em fazer a pessoa chamar no WhatsApp ou ligar.`,
  };
}

/** Extrai o HTML da resposta da IA (com ou sem bloco ```html) e confere o mínimo. */
export function extractHtml(text: string): string | null {
  const fenced = text.match(/```(?:html)?\s*([\s\S]*?)```/i);
  const html = (fenced ? fenced[1] : text).trim();
  if (!/<html[\s>]/i.test(html) || !/<\/html>/i.test(html)) return null;
  return html.startsWith("<!doctype") || html.startsWith("<!DOCTYPE") ? html : `<!doctype html>\n${html}`;
}

/** Origem do site: modelo pronto, IA (inclui HTML colado) ou link de site feito em outro app. */
export type SiteSource = "modelo" | "ia" | "manual" | "externo";
export type SiteRef = { slug: string; source?: string | null; external_url?: string | null };

/** O link certo para mandar ao cliente: o endereço externo quando o site foi feito em outro app; senão, /s/slug. */
export function publicSiteUrl(site: SiteRef | null | undefined, origin: string): string {
  if (!site) return "";
  if (site.source === "externo" && site.external_url) return site.external_url;
  return `${origin.replace(/\/$/, "")}/s/${site.slug}`;
}

const PRIVATE_HOST = /^(localhost|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|0\.|\[?::1\]?$|.*\.local$|.*\.internal$)/i;

/** Valida o link de um site feito em outro app. Aceita sem "https://" e devolve normalizado, ou null. */
export function normalizeExternalUrl(raw: string): string | null {
  const v = raw.trim();
  if (!v || /\s/.test(v)) return null;
  let u: URL;
  try { u = new URL(/^[a-z][a-z0-9+.-]*:/i.test(v) ? v : `https://${v}`); } catch { return null; }
  if (u.protocol !== "https:" && u.protocol !== "http:") return null;
  if (u.username || u.password) return null;
  if (!u.hostname.includes(".") || PRIVATE_HOST.test(u.hostname)) return null;
  return u.toString();
}
