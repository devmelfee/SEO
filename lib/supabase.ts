import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

export function supabaseConfigured(): boolean {
  return !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

/** Cliente com service_role: só no servidor. As tabelas têm RLS sem políticas, então o navegador não lê nada direto. */
export function db(): SupabaseClient {
  if (!supabaseConfigured()) throw new ConfigError("Supabase não configurado (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).");
  cached ??= createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
    // O Next guarda respostas de fetch em cache; leitura do banco nunca pode vir velha.
    global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }) },
  });
  return cached;
}

export class ConfigError extends Error {}
