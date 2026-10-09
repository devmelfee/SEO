import "server-only";
import { lookup } from "node:dns/promises";
import { classifyLink, isPrivateAddress, mapBrasilApi, onlyDigits, type CompanyData, type LinkResult } from "./contact";

const UA = "Mozilla/5.0 (compatible; SEOLocalBot/1.0; +verificacao-de-contato)";

/** Abre o link como um visitante (até 3 redirecionamentos, 7 s) e diz se está no ar. Recusa endereços internos. */
export async function checkLink(url: string): Promise<LinkResult> {
  let current = url;
  for (let hop = 0; hop < 4; hop++) {
    let u: URL;
    try { u = new URL(current); } catch { return classifyLink(url, null, null); }
    if (!/^https?:$/.test(u.protocol)) return classifyLink(url, null, null);
    try {
      const addrs = await lookup(u.hostname, { all: true });
      if (!addrs.length || addrs.some((a) => isPrivateAddress(a.address))) return classifyLink(url, null, null);
    } catch { return classifyLink(url, null, null); } // domínio não existe
    try {
      const res = await fetch(current, { method: "GET", redirect: "manual", headers: { "User-Agent": UA, Accept: "text/html" }, signal: AbortSignal.timeout(7000), cache: "no-store" });
      const loc = res.headers.get("location");
      if (res.status >= 300 && res.status < 400 && loc) { current = new URL(loc, current).toString(); continue; }
      res.body?.cancel().catch(() => {});
      return classifyLink(url, res.status, current !== url ? current : null);
    } catch { return classifyLink(url, null, null); }
  }
  return classifyLink(url, null, current);
}

export class CnpjError extends Error {}

/** Dados públicos da Receita Federal pelo CNPJ (BrasilAPI, gratuita). */
export async function fetchCnpj(cnpj: string): Promise<CompanyData> {
  let res: Response;
  try {
    res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${onlyDigits(cnpj)}`, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(10000), cache: "no-store" });
  } catch { throw new CnpjError("A consulta à Receita não respondeu. Tente de novo em alguns segundos."); }
  if (res.status === 404) throw new CnpjError("CNPJ não encontrado na Receita.");
  if (res.status === 429) throw new CnpjError("Muitas consultas seguidas à Receita. Espere um minuto.");
  if (!res.ok) throw new CnpjError(`A consulta à Receita falhou (${res.status}).`);
  return mapBrasilApi(await res.json());
}
