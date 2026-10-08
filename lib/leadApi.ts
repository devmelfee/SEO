// Formato público dos leads na API v1 (snake_case, estável) e utilidades puras: chave, cursor, CSV.
// Testado em lib/leadApi.test.ts. Mudou o formato? Adicione campos; nunca renomeie nem remova.
import { createHash, randomBytes } from "node:crypto";
import { whatsappNumber } from "./site.ts";

export const API_SCOPES = ["read", "write"] as const;
export type ApiScope = (typeof API_SCOPES)[number];

/** Nova chave: "seo_" + 40 caracteres aleatórios. Só o hash vai para o banco. */
export function newApiKey(): { key: string; prefix: string; hash: string } {
  const key = `seo_${randomBytes(30).toString("base64url")}`;
  return { key, prefix: key.slice(0, 12), hash: hashKey(key) };
}
export const hashKey = (key: string) => createHash("sha256").update(key).digest("hex");
export const looksLikeKey = (k: string) => /^seo_[A-Za-z0-9_-]{30,60}$/.test(k);

/** Lê a chave de "Authorization: Bearer seo_..." ou "X-Api-Key". Nunca da URL (vaza em log). */
export function keyFromHeaders(h: Headers): string | null {
  const auth = h.get("authorization") ?? "";
  const m = auth.match(/^Bearer\s+(\S+)$/i);
  const k = m?.[1] ?? h.get("x-api-key") ?? "";
  return looksLikeKey(k) ? k : null;
}

export const encodeCursor = (offset: number) => Buffer.from(JSON.stringify({ o: offset })).toString("base64url");
export function decodeCursor(c: string | null): number {
  if (!c) return 0;
  try { const o = JSON.parse(Buffer.from(c, "base64url").toString()).o; return Number.isInteger(o) && o >= 0 ? o : 0; } catch { return 0; }
}

type Row = Record<string, any>;
export type PublicLead = ReturnType<typeof toPublicLead>;

export function toPublicLead(p: Row, siteUrl: string | null = null) {
  const [niche, city] = String(p.query ?? "").split(" em ");
  const socialOnly = (p.issues ?? []).some((i: Row) => i.code === "social_only");
  return {
    id: p.id as string,
    name: p.name as string,
    phone: (p.phone as string) || null,
    whatsapp: whatsappNumber(p.phone) ? `+${whatsappNumber(p.phone)}` : null,
    website: (p.website as string) || null,
    has_own_site: !!p.website && !socialOnly,
    address: (p.address as string) || null,
    niche: niche?.trim() || null,
    city: city?.trim() || null,
    search_query: p.query as string,
    google_maps_url: (p.maps_url as string) || null,
    google_place_id: String(p.place_id ?? "").startsWith("busca:") ? null : (p.place_id as string),
    rating: p.rating ?? null,
    reviews_count: p.reviews_count ?? 0,
    rank_in_search: p.rank_in_search ?? null,
    opportunity_score: p.score ?? 0,
    issues: (p.issues ?? []).map((i: Row) => ({ code: i.code, label: i.label, detail: i.detail })),
    status: (p.status as string) ?? "novo",
    project_id: p.project_id ?? null,
    client_id: p.client_id ?? null,
    notes: (p.notes as string) || "",
    contact_step: p.contact_step ?? 0,
    last_contact_at: p.last_contact_at ?? null,
    next_followup_at: p.next_followup_at ?? null,
    opening_hours: p.hours ?? [],
    location: p.lat != null && p.lng != null ? { lat: p.lat, lng: p.lng } : null,
    site_preview_url: siteUrl,
    created_at: p.created_at ?? null,
    updated_at: p.updated_at ?? null,
  };
}

const CSV_COLS: [string, (l: PublicLead) => unknown][] = [
  ["id", (l) => l.id], ["nome", (l) => l.name], ["telefone", (l) => l.phone], ["whatsapp", (l) => l.whatsapp],
  ["site", (l) => l.website], ["tem_site_proprio", (l) => (l.has_own_site ? "sim" : "não")], ["endereco", (l) => l.address],
  ["nicho", (l) => l.niche], ["cidade", (l) => l.city], ["nota_google", (l) => l.rating], ["avaliacoes", (l) => l.reviews_count],
  ["nota_oportunidade", (l) => l.opportunity_score], ["problemas", (l) => l.issues.map((i: { label: string }) => i.label).join("; ")],
  ["status", (l) => l.status], ["google_maps", (l) => l.google_maps_url], ["site_previa", (l) => l.site_preview_url],
  ["atualizado_em", (l) => l.updated_at],
];

/** CSV para Excel/Google Planilhas: separador ";" (padrão BR), BOM UTF-8 e aspas escapadas. */
export function leadsToCsv(leads: PublicLead[]): string {
  const cell = (v: unknown) => {
    const s = v == null ? "" : String(v);
    // Evita "injeção de fórmula" ao abrir no Excel.
    const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
    return /[";\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  return "﻿" + [CSV_COLS.map(([h]) => h).join(";"), ...leads.map((l) => CSV_COLS.map(([, f]) => cell(f(l))).join(";"))].join("\r\n");
}
