// Limites de uso por usuário, no estilo "janela de horas + semana": consultas ao Google e gerações de IA.
// Funções puras, testadas em lib/limits.test.ts. null = sem limite.

export type Limits = {
  window_hours: number;
  searches_window: number | null; searches_week: number | null;
  ai_window: number | null; ai_week: number | null;
};
export type Resource = "places" | "llm";
export type UsageEvent = { kind: Resource; units: number; created_at: string };
export type Meter = { used: number; limit: number | null; resetAt: string | null };
export type Meters = { window: Meter; week: Meter };

export const DEFAULT_LIMITS: Limits = { window_hours: 5, searches_window: 10, searches_week: 40, ai_window: 30, ai_week: 120 };
export const WEEK_MS = 7 * 24 * 3600e3;

const num = (v: unknown, fallback: number | null): number | null =>
  v === null ? null : typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.floor(v) : fallback;

/** Padrão da agência sobreposto pelo que foi definido para a pessoa (campo a campo). */
export function mergeLimits(base: Partial<Limits> | null | undefined, override?: Partial<Limits> | null): Limits {
  const pick = (k: keyof Limits) => (override && k in override ? override[k] : base && k in base ? base[k] : DEFAULT_LIMITS[k]);
  const hours = num(pick("window_hours"), DEFAULT_LIMITS.window_hours);
  return {
    window_hours: Math.min(168, Math.max(1, hours ?? DEFAULT_LIMITS.window_hours)),
    searches_window: num(pick("searches_window"), DEFAULT_LIMITS.searches_window),
    searches_week: num(pick("searches_week"), DEFAULT_LIMITS.searches_week),
    ai_window: num(pick("ai_window"), DEFAULT_LIMITS.ai_window),
    ai_week: num(pick("ai_week"), DEFAULT_LIMITS.ai_week),
  };
}

/** Uso numa janela móvel. `since` (liberação manual do admin) zera o que veio antes. */
export function meter(events: UsageEvent[], kind: Resource, limit: number | null, windowMs: number, now: Date, since?: Date | null): Meter {
  const start = Math.max(now.getTime() - windowMs, since?.getTime() ?? 0);
  const inWindow = events.filter((e) => e.kind === kind && new Date(e.created_at).getTime() > start)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
  const used = inWindow.reduce((s, e) => s + e.units, 0);
  let resetAt: string | null = null;
  if (limit !== null && used >= limit && inWindow.length) {
    // Quando sair da janela o suficiente para voltar a ficar abaixo do limite.
    let left = used;
    for (const e of inWindow) {
      left -= e.units;
      if (left < limit) { resetAt = new Date(new Date(e.created_at).getTime() + windowMs).toISOString(); break; }
    }
  }
  return { used, limit, resetAt };
}

export function meters(events: UsageEvent[], kind: Resource, l: Limits, now: Date, since?: Date | null): Meters {
  const [w, wk] = kind === "places" ? [l.searches_window, l.searches_week] : [l.ai_window, l.ai_week];
  return { window: meter(events, kind, w, l.window_hours * 3600e3, now, since), week: meter(events, kind, wk, WEEK_MS, now, since) };
}

/** Cabe mais `needed` unidades? Se não, devolve qual janela bloqueou e quando libera. */
export function allowance(m: Meters, needed: number): { ok: true } | { ok: false; which: "window" | "week"; left: number; resetAt: string | null } {
  for (const which of ["window", "week"] as const) {
    const { used, limit, resetAt } = m[which];
    if (limit !== null && used + needed > limit) return { ok: false, which, left: Math.max(0, limit - used), resetAt };
  }
  return { ok: true };
}

export type AiUse = "text" | "site";
export type AiModel = { id: string; tier: string; note: string; effort: "low" | "medium" | "high" };
/** Modelos que o administrador pode escolher. O esforço controla quanto o modelo "pensa" (e o custo). */
export const AI_MODELS: AiModel[] = [
  { id: "claude-haiku-5-5", tier: "Rápido", note: "o mais barato; bom para textos curtos", effort: "low" },
  { id: "claude-sonnet-5-5", tier: "Equilibrado", note: "recomendado para a maioria", effort: "medium" },
  { id: "claude-opus-5-5", tier: "Premium", note: "melhor qualidade; vale para sites e propostas", effort: "medium" },
];
export const DEFAULT_AI_MODEL = "claude-sonnet-5-5";
export const modelInfo = (id: string): AiModel | undefined => AI_MODELS.find((m) => m.id === id);

/** Tokens típicos por ação, usados enquanto não há histórico real para tirar a média. */
export const TYPICAL_TOKENS: Record<"texto_ia" | "site_ia", { input: number; output: number }> = {
  texto_ia: { input: 1500, output: 3000 },
  site_ia: { input: 2500, output: 10000 },
};

/** Preço por milhão de tokens (US$) dos modelos Claude; desconhecido cai no Sonnet 4.6. */
const LLM_PRICES: Record<string, [number, number]> = {
  "claude-haiku-5-5": [0.1, 0.5], "claude-haiku-4-5": [1, 5],
  "claude-sonnet-5-5": [2, 10], "claude-sonnet-5": [2, 10], "claude-sonnet-4-6": [3, 15],
  "claude-opus-5-5": [4, 20], "claude-opus-5": [5, 25], "claude-opus-4-8": [5, 25],
  "claude-fable-5-1": [10, 50],
};
export function llmCostUsd(model: string, inputTokens: number, outputTokens: number): number {
  const [i, o] = LLM_PRICES[model] ?? LLM_PRICES["claude-sonnet-4-6"];
  return (inputTokens * i + outputTokens * o) / 1e6;
}
