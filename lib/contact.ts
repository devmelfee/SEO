// Validação de contato: CNPJ (dígitos + dados públicos da Receita), decisores do quadro societário,
// conferência de telefone e classificação de links. Funções puras, testadas em lib/contact.test.ts.

export const CONTACT_STATUSES = ["nao_verificado", "confirmado", "invalido", "sem_whatsapp"] as const;
export type ContactStatus = (typeof CONTACT_STATUSES)[number];
export const CONTACT_LABEL: Record<ContactStatus, string> = {
  nao_verificado: "Contato não verificado", confirmado: "Contato confirmado", invalido: "Número inválido", sem_whatsapp: "Sem WhatsApp",
};

export const onlyDigits = (s: string | null | undefined) => (s ?? "").replace(/\D/g, "");

/** CNPJ com 14 dígitos e dígitos verificadores corretos. */
export function isValidCnpj(raw: string): boolean {
  const c = onlyDigits(raw);
  if (c.length !== 14 || /^(\d)\1{13}$/.test(c)) return false;
  const dv = (base: string, w: number[]) => {
    const s = base.split("").reduce((acc, d, i) => acc + Number(d) * w[i], 0) % 11;
    return s < 2 ? 0 : 11 - s;
  };
  const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const d1 = dv(c.slice(0, 12), w1);
  const d2 = dv(c.slice(0, 12) + d1, [6, ...w1]);
  return c.endsWith(`${d1}${d2}`);
}
export const formatCnpj = (raw: string) => onlyDigits(raw).replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");

export type Partner = { name: string; role: string; since: string | null; decision_maker: boolean };
export type CompanyData = {
  cnpj: string; legal_name: string; trade_name: string | null; status: string; status_date: string | null;
  opened_at: string | null; activity: string | null; size: string | null; mei: boolean;
  phones: string[]; email: string | null; address: string | null; city: string | null; state: string | null;
  partners: Partner[]; fetched_at: string; source: "Receita Federal (via BrasilAPI)";
};

// Quem assina e decide: administrador, titular, presidente, diretor (e o próprio MEI).
const DECIDES = /administrador|titular|presidente|diretor|empres[aá]rio|propriet/i;

/** Converte a resposta da BrasilAPI (/api/cnpj/v1/{cnpj}) no formato que guardamos. */
export function mapBrasilApi(r: Record<string, any>, now = new Date()): CompanyData {
  const phone = (x: unknown) => { const d = onlyDigits(String(x ?? "")); return d.length >= 10 ? d : null; };
  const mei = r.opcao_pelo_mei === true;
  const partners: Partner[] = (Array.isArray(r.qsa) ? r.qsa : []).map((s: Record<string, any>) => ({
    name: String(s.nome_socio ?? "").trim(), role: String(s.qualificacao_socio ?? "").trim(),
    since: s.data_entrada_sociedade ?? null, decision_maker: DECIDES.test(String(s.qualificacao_socio ?? "")),
  })).filter((p: Partner) => p.name);
  return {
    cnpj: onlyDigits(String(r.cnpj ?? "")), legal_name: String(r.razao_social ?? ""), trade_name: r.nome_fantasia || null,
    status: String(r.descricao_situacao_cadastral ?? "DESCONHECIDA").toUpperCase(), status_date: r.data_situacao_cadastral ?? null,
    opened_at: r.data_inicio_atividade ?? null, activity: r.cnae_fiscal_descricao ?? null, size: r.porte ?? null, mei,
    phones: [phone(r.ddd_telefone_1), phone(r.ddd_telefone_2)].filter((x): x is string => !!x),
    email: typeof r.email === "string" && r.email.includes("@") ? r.email.toLowerCase() : null,
    address: [r.descricao_tipo_de_logradouro, r.logradouro, r.numero, r.bairro].filter(Boolean).join(" ").trim() || null,
    city: r.municipio ?? null, state: r.uf ?? null, partners, fetched_at: now.toISOString(), source: "Receita Federal (via BrasilAPI)",
  };
}

/** Mesmo número? Compara DDD + 8 últimos dígitos (ignora 55, 0 e o 9 extra). */
export function samePhone(a: string | null | undefined, b: string | null | undefined): boolean {
  const n = (x: string) => { const d = onlyDigits(x).replace(/^55(?=\d{10,11}$)/, "").replace(/^0/, ""); return d.length >= 10 ? d.slice(0, 2) + d.slice(-8) : ""; };
  const x = n(a ?? ""), y = n(b ?? "");
  return !!x && x === y;
}

export type LinkKind = "site" | "instagram" | "facebook" | "whatsapp" | "linktree" | "outro";
export function linkKind(url: string): LinkKind {
  const h = (() => { try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return ""; } })();
  if (/instagram\.com$/.test(h)) return "instagram";
  if (/facebook\.com$|fb\.com$/.test(h)) return "facebook";
  if (/wa\.me$|whatsapp\.com$/.test(h)) return "whatsapp";
  if (/linktr\.ee$|linkbio|beacons\.ai$/.test(h)) return "linktree";
  return h ? "site" : "outro";
}

export type LinkResult = { url: string; kind: LinkKind; state: "ok" | "fora_do_ar" | "nao_encontrado" | "nao_verificavel"; http: number | null; final_url: string | null; checked_at: string };

/** Interpreta a resposta: redes sociais respondem 200 até para perfil que não existe, então só 404 é conclusivo. */
export function classifyLink(url: string, http: number | null, finalUrl: string | null, now = new Date()): LinkResult {
  const kind = linkKind(url);
  let state: LinkResult["state"];
  if (http === 404 || http === 410) state = "nao_encontrado";
  else if (kind === "instagram" || kind === "facebook") state = http && http < 400 ? "nao_verificavel" : http === null ? "fora_do_ar" : "nao_verificavel";
  else if (http === null || http >= 500) state = "fora_do_ar";
  else if (http >= 400) state = http === 401 || http === 403 || http === 429 ? "nao_verificavel" : "nao_encontrado";
  else state = "ok";
  return { url, kind, state, http, final_url: finalUrl, checked_at: now.toISOString() };
}

/** Bloqueia endereços internos (proteção contra SSRF ao abrir links de terceiros). */
export function isPrivateAddress(ip: string): boolean {
  if (/^(127\.|10\.|0\.|169\.254\.|192\.168\.)/.test(ip)) return true;
  const m = ip.match(/^172\.(\d+)\./); if (m && +m[1] >= 16 && +m[1] <= 31) return true;
  if (/^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./.test(ip)) return true;
  const v6 = ip.toLowerCase();
  return v6 === "::1" || v6 === "::" || v6.startsWith("fc") || v6.startsWith("fd") || v6.startsWith("fe80") || v6.startsWith("::ffff:127.") || v6.startsWith("::ffff:10.") || v6.startsWith("::ffff:192.168.");
}

/** Primeiro nome para a saudação ("MARIA DA SILVA" → "Maria"). */
export function firstName(full: string | null | undefined): string {
  const w = (full ?? "").trim().split(/\s+/)[0] ?? "";
  return w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : "";
}
