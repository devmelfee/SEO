// Sessão por senha compartilhada da equipe. Cookie = HMAC-SHA256(SESSION_SECRET, "seo-session:" + expira).
// Usa Web Crypto para funcionar tanto no middleware (Edge) quanto nas rotas (Node).

export const SESSION_COOKIE = "seo_session";
const MAX_AGE_S = 60 * 60 * 24 * 14; // 14 dias

const enc = new TextEncoder();

function secret(): string | null {
  const s = process.env.SESSION_SECRET || process.env.APP_PASSWORD;
  return s ? s : null;
}

export function authConfigured(): boolean {
  return !!process.env.APP_PASSWORD;
}

async function hmac(data: string, key: string): Promise<string> {
  const k = await crypto.subtle.importKey("raw", enc.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", k, enc.encode(data));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export async function createSessionToken(): Promise<{ value: string; maxAge: number }> {
  const key = secret();
  if (!key) throw new Error("APP_PASSWORD não configurada");
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE_S;
  return { value: `${exp}.${await hmac(`seo-session:${exp}`, key)}`, maxAge: MAX_AGE_S };
}

export async function verifySessionToken(token: string | undefined): Promise<boolean> {
  const key = secret();
  if (!key || !token) return false;
  const [expStr, sig] = token.split(".");
  const exp = Number(expStr);
  if (!exp || !sig || exp < Date.now() / 1000) return false;
  return safeEqual(sig, await hmac(`seo-session:${exp}`, key));
}

export async function passwordMatches(input: string): Promise<boolean> {
  const pw = process.env.APP_PASSWORD;
  if (!pw) return false;
  // Compara os HMACs (mesmo tamanho) para não vazar o tamanho da senha pelo tempo.
  const k = "seo-pw-compare";
  return safeEqual(await hmac(input, k), await hmac(pw, k));
}
