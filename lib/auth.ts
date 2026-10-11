// Login individual por e-mail e senha (Supabase Auth). Quem pode entrar: e-mails da tabela team_members.
// O primeiro usuário confirmado vira administrador (tabela vazia = instalação nova).
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { db } from "./supabase";

export type Role = "admin" | "member";

export function authConfigured(): boolean {
  return !!(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY);
}

/** URL e chave pública (anon) — podem ir para o navegador; a RLS sem políticas impede leitura das tabelas. */
export function publicAuthConfig() {
  return { url: process.env.SUPABASE_URL ?? "", anonKey: process.env.SUPABASE_ANON_KEY ?? "" };
}

type CookieStore = {
  getAll(): { name: string; value: string }[];
  setAll(c: { name: string; value: string; options: CookieOptions }[]): void;
};

export function authClient(cookies: CookieStore) {
  const { url, anonKey } = publicAuthConfig();
  return createServerClient(url, anonKey, { cookies, global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }) } });
}

/** Papel do e-mail na equipe, ou null se não tem acesso. Bootstrap: equipe vazia → primeiro vira admin. */
export async function membership(email: string | undefined | null, signupPhone?: unknown): Promise<Role | null> {
  if (!email) return null;
  const e = email.toLowerCase();
  const { data, error } = await db().from("team_members").select("role,phone").eq("email", e).maybeSingle();
  if (error) throw new Error("Equipe: " + error.message);
  if (data) {
    // Telefone informado no cadastro entra na equipe na primeira vez que a pessoa usa o app.
    if (!data.phone && typeof signupPhone === "string" && signupPhone.trim()) {
      await db().from("team_members").update({ phone: signupPhone.trim().slice(0, 30) }).eq("email", e);
    }
    return data.role as Role;
  }
  const { count } = await db().from("team_members").select("email", { count: "exact", head: true });
  if (count === 0) {
    const phone = typeof signupPhone === "string" ? signupPhone.trim().slice(0, 30) : "";
    const { error: insErr } = await db().from("team_members").insert({ email: e, role: "admin", added_by: "primeiro acesso", phone });
    if (!insErr) return "admin";
  }
  return null;
}
