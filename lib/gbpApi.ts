import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { db } from "./supabase";
import { check } from "./http";
import { mergeServiceItems, REPORT_METRICS, type ServiceItem } from "./gbp";

// Perfil da Empresa no Google: OAuth da agência e chamadas às APIs. A agência conecta UMA conta Google que
// é Gerente dos perfis dos clientes; o refresh token fica cifrado (AES-256-GCM) em google_connection.

export const GBP_SCOPE = "https://www.googleapis.com/auth/business.manage";

export class GbpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export function oauthConfigured(): boolean {
  return !!(process.env.GOOGLE_OAUTH_CLIENT_ID && process.env.GOOGLE_OAUTH_CLIENT_SECRET);
}

/** Base das APIs. GOOGLE_API_BASE_OVERRIDE existe só para testes locais (um servidor falso no lugar do Google). */
function api(host: string, path: string): string {
  const o = process.env.GOOGLE_API_BASE_OVERRIDE;
  return o ? `${o.replace(/\/$/, "")}/${host}${path}` : `https://${host}${path}`;
}

// ── Cifra do token ─────────────────────────────────────────────────────────────
function key(): Buffer {
  const k = process.env.GOOGLE_TOKEN_KEY;
  if (k) return createHash("sha256").update(k).digest();
  const fallback = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!fallback) throw new GbpError(503, "Defina GOOGLE_TOKEN_KEY para guardar a conexão com o Google.");
  return createHash("sha256").update(`gbp-token:${fallback}`).digest();
}
export function seal(plain: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return [iv, c.getAuthTag(), enc].map((b) => b.toString("base64url")).join(".");
}
export function unseal(sealed: string): string {
  const [iv, tag, enc] = sealed.split(".").map((p) => Buffer.from(p, "base64url"));
  const d = createDecipheriv("aes-256-gcm", key(), iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(enc), d.final()]).toString("utf8");
}

// ── OAuth ──────────────────────────────────────────────────────────────────────
export function redirectUri(origin: string): string {
  return process.env.GOOGLE_OAUTH_REDIRECT_URI || `${origin}/api/google/callback`;
}

export function authUrl(origin: string, state: string): string {
  const q = new URLSearchParams({
    client_id: process.env.GOOGLE_OAUTH_CLIENT_ID ?? "", redirect_uri: redirectUri(origin), response_type: "code",
    scope: `openid email ${GBP_SCOPE}`, access_type: "offline", prompt: "consent", include_granted_scopes: "true", state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${q}`;
}

async function tokenRequest(body: Record<string, string>): Promise<any> {
  const res = await fetch(api("oauth2.googleapis.com", "/token"), {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: process.env.GOOGLE_OAUTH_CLIENT_ID ?? "", client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET ?? "", ...body }),
    cache: "no-store",
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new GbpError(res.status === 400 ? 401 : 502, `Google recusou o login (${j.error ?? res.status}). Conecte a conta de novo.`);
  return j;
}

/** Troca o código do OAuth pelo refresh token e guarda a conexão (cifrada). */
export async function saveConnection(code: string, origin: string, by: string): Promise<string> {
  const t = await tokenRequest({ code, grant_type: "authorization_code", redirect_uri: redirectUri(origin) });
  if (!t.refresh_token) throw new GbpError(400, "O Google não devolveu acesso permanente. Remova o app em myaccount.google.com/permissions e conecte de novo.");
  if (!String(t.scope ?? "").includes(GBP_SCOPE)) throw new GbpError(400, "A permissão para gerenciar o Perfil da Empresa não foi concedida.");
  let email = "";
  try { email = JSON.parse(Buffer.from(String(t.id_token).split(".")[1], "base64url").toString()).email ?? ""; } catch { /* sem e-mail: segue */ }
  check(await db().from("google_connection").upsert({
    id: 1, email, refresh_token_enc: seal(t.refresh_token), scopes: String(t.scope ?? ""), connected_by: by, connected_at: new Date().toISOString(),
  }));
  return email;
}

export async function connection(): Promise<{ email: string; connected_at: string } | null> {
  return check(await db().from("google_connection").select("email,connected_at").eq("id", 1).maybeSingle()) as any;
}

let cached: { token: string; until: number } | null = null;
async function accessToken(): Promise<string> {
  if (cached && cached.until > Date.now() + 60_000) return cached.token;
  const row = check(await db().from("google_connection").select("refresh_token_enc").eq("id", 1).maybeSingle()) as { refresh_token_enc: string } | null;
  if (!row) throw new GbpError(409, "Conecte a conta Google da agência em Entrega › Perfil do Google.");
  const t = await tokenRequest({ refresh_token: unseal(row.refresh_token_enc), grant_type: "refresh_token" });
  cached = { token: t.access_token, until: Date.now() + (Number(t.expires_in) || 3600) * 1000 };
  return cached.token;
}
export function forgetToken() { cached = null; }

/** Chamada autenticada. Mensagens de erro em português, com o motivo do Google. */
async function call(host: string, path: string, init: { method?: string; body?: unknown } = {}): Promise<any> {
  const res = await fetch(api(host, path), {
    method: init.method ?? "GET",
    headers: { Authorization: `Bearer ${await accessToken()}`, ...(init.body ? { "Content-Type": "application/json" } : {}) },
    body: init.body ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = j?.error?.message ?? res.statusText;
    const hint = res.status === 429 || /quota/i.test(msg) ? " — A API do Perfil ainda não foi liberada para o projeto (cota 0) ou a cota acabou."
      : res.status === 403 ? " — A conta conectada não é Gerente deste perfil, ou a API não está ativada no projeto." : "";
    throw new GbpError(502, `Google respondeu ${res.status}: ${msg}${hint}`);
  }
  return j;
}

const INFO = "mybusinessbusinessinformation.googleapis.com";
const V4 = "mybusiness.googleapis.com";

// ── Contas e perfis ────────────────────────────────────────────────────────────
export type Location = { account: string; location: string; title: string; address: string; website: string };

export async function listLocations(): Promise<Location[]> {
  const acc = await call("mybusinessaccountmanagement.googleapis.com", "/v1/accounts?pageSize=20");
  const out: Location[] = [];
  for (const a of acc.accounts ?? []) {
    let page = "";
    do {
      const r = await call(INFO, `/v1/${a.name}/locations?readMask=name,title,storefrontAddress,websiteUri&pageSize=100${page ? `&pageToken=${page}` : ""}`);
      for (const l of r.locations ?? []) {
        const ad = l.storefrontAddress;
        out.push({ account: a.name, location: l.name, title: l.title ?? "", website: l.websiteUri ?? "",
          address: ad ? [...(ad.addressLines ?? []), ad.locality].filter(Boolean).join(", ") : "" });
      }
      page = r.nextPageToken ?? "";
    } while (page && out.length < 500);
  }
  return out;
}

// ── Aplicar ────────────────────────────────────────────────────────────────────
export type Target = { account: string; location: string };
export type Applied = { previous: unknown; result: unknown };

export async function setDescription(t: Target, text: string): Promise<Applied> {
  const before = await call(INFO, `/v1/${t.location}?readMask=profile`);
  const r = await call(INFO, `/v1/${t.location}?updateMask=profile.description`, { method: "PATCH", body: { profile: { description: text } } });
  return { previous: { description: before.profile?.description ?? "" }, result: { description: r.profile?.description ?? text } };
}

export async function setWebsite(t: Target, url: string): Promise<Applied> {
  const before = await call(INFO, `/v1/${t.location}?readMask=websiteUri`);
  const r = await call(INFO, `/v1/${t.location}?updateMask=websiteUri`, { method: "PATCH", body: { websiteUri: url } });
  return { previous: { websiteUri: before.websiteUri ?? "" }, result: { websiteUri: r.websiteUri ?? url } };
}

export async function addServices(t: Target, items: { name: string; description?: string }[]): Promise<Applied> {
  const before = await call(INFO, `/v1/${t.location}?readMask=serviceItems,categories`);
  const category = before.categories?.primaryCategory?.name;
  if (!category) throw new GbpError(400, "O perfil não tem categoria principal; defina a categoria antes de cadastrar serviços.");
  const merged = mergeServiceItems((before.serviceItems ?? []) as ServiceItem[], items, category);
  const r = await call(INFO, `/v1/${t.location}?updateMask=serviceItems`, { method: "PATCH", body: { serviceItems: merged } });
  return { previous: { serviceItems: before.serviceItems ?? [] }, result: { count: (r.serviceItems ?? merged).length } };
}

export async function createPost(t: Target, text: string, siteUrl?: string): Promise<Applied> {
  const body: Record<string, unknown> = { languageCode: "pt-BR", summary: text, topicType: "STANDARD" };
  if (siteUrl) body.callToAction = { actionType: "LEARN_MORE", url: siteUrl };
  const r = await call(V4, `/v4/${t.account}/${t.location}/localPosts`, { method: "POST", body });
  return { previous: null, result: { name: r.name, searchUrl: r.searchUrl ?? null } };
}

export async function replyReview(reviewName: string, comment: string): Promise<Applied> {
  const r = await call(V4, `/v4/${reviewName}/reply`, { method: "PUT", body: { comment } });
  return { previous: null, result: { updateTime: r.updateTime ?? null } };
}

export type Review = { name: string; reviewer: string; stars: number; comment: string; createTime: string; replied: boolean };
export async function listReviews(t: Target): Promise<Review[]> {
  const r = await call(V4, `/v4/${t.account}/${t.location}/reviews?pageSize=50`);
  const STARS: Record<string, number> = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 };
  return (r.reviews ?? []).map((v: any) => ({
    name: v.name, reviewer: v.reviewer?.displayName ?? "Cliente", stars: STARS[v.starRating] ?? 0,
    comment: v.comment ?? "", createTime: v.createTime ?? "", replied: !!v.reviewReply,
  }));
}

/** Métricas diárias do perfil (Performance API) entre duas datas. */
export async function dailyMetrics(location: string, from: Date, to: Date): Promise<any[]> {
  const q = new URLSearchParams();
  for (const m of REPORT_METRICS) q.append("dailyMetrics", m);
  const d = (p: string, x: Date) => { q.set(`dailyRange.${p}.year`, String(x.getUTCFullYear())); q.set(`dailyRange.${p}.month`, String(x.getUTCMonth() + 1)); q.set(`dailyRange.${p}.day`, String(x.getUTCDate())); };
  d("start_date", from); d("end_date", to);
  const r = await call("businessprofileperformance.googleapis.com", `/v1/${location}:fetchMultiDailyMetricsTimeSeries?${q}`);
  return (r.multiDailyMetricTimeSeries ?? []).flatMap((m: any) => m.dailyMetricTimeSeries ?? []);
}
