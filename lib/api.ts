// Chamadas do navegador para as rotas do próprio app. Erro HTTP vira exceção com a mensagem do servidor.

export class ApiError extends Error {
  constructor(message: string, public code?: string) { super(message); }
}
/** Erro de limite de uso: a tela oferece "Solicitar mais" pelo WhatsApp do administrador. */
export const isLimitError = (e: unknown) => e instanceof ApiError && e.code === "limit_reached";

export async function api<T = any>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const res = await fetch(path, {
    method: init?.method ?? (init?.body ? "POST" : "GET"),
    headers: init?.body ? { "Content-Type": "application/json" } : undefined,
    body: init?.body ? JSON.stringify(init.body) : undefined,
  });
  const json = await res.json().catch(() => null);
  // Avisa a tela quando algo que gasta (busca no Google ou IA) rodou ou foi barrado pelo limite.
  if (typeof window !== "undefined" && init?.body && /^\/api\/(radar|places|generate|sites)/.test(path)) {
    window.dispatchEvent(new CustomEvent("usage-changed"));
    if (json?.error?.code === "limit_reached") window.dispatchEvent(new CustomEvent("usage-limit", { detail: json.error.message }));
  }
  if (res.status === 401 && typeof window !== "undefined") window.location.href = "/login";
  if (!res.ok) throw new ApiError(json?.error?.message ?? `Erro ${res.status}`, json?.error?.code);
  return json?.data as T;
}

export type Status = { auth: boolean; anthropic: boolean; supabase: boolean; places: boolean; model: string };

export type Section = { content: string; original: string };

export type ClientRow = {
  id: string; name: string; url: string; vertical: string; city: string; pricing: string; goal: string;
  real_data: string; completed_phases: number[]; updated_at: string;
  client_phases?: { count: number }[];
};

export async function generateText(system: string, prompt: string, maxTokens = 4096): Promise<string> {
  return (await api<{ text: string }>("/api/generate", { body: { system, prompt, maxTokens } })).text;
}

export function downloadTxt(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function copyText(t: string): Promise<boolean> {
  try { await navigator.clipboard.writeText(t); return true; } catch { return false; }
}
