import { test } from "node:test";
import assert from "node:assert/strict";
import { allowance, llmCostUsd, mergeLimits, meter, meters, DEFAULT_LIMITS } from "./limits.ts";

const now = new Date("2026-10-08T15:00:00Z");
const ago = (h: number) => new Date(now.getTime() - h * 3600e3).toISOString();

test("mergeLimits: pessoa sobrepõe a agência; null é sem limite", () => {
  const l = mergeLimits({ searches_window: 5 }, { searches_week: null, window_hours: 2 });
  assert.equal(l.searches_window, 5);
  assert.equal(l.searches_week, null);
  assert.equal(l.window_hours, 2);
  assert.equal(l.ai_week, DEFAULT_LIMITS.ai_week);
  assert.equal(mergeLimits({ window_hours: -3 }).window_hours, DEFAULT_LIMITS.window_hours);
});

test("meter conta só a janela e diz quando libera", () => {
  const ev = [
    { kind: "places" as const, units: 3, created_at: ago(6) },
    { kind: "places" as const, units: 2, created_at: ago(4) },
    { kind: "places" as const, units: 3, created_at: ago(1) },
    { kind: "llm" as const, units: 1, created_at: ago(1) },
  ];
  const m = meter(ev, "places", 5, 5 * 3600e3, now);
  assert.equal(m.used, 5);
  assert.equal(m.resetAt, new Date(now.getTime() + 1 * 3600e3).toISOString()); // o de 4h atrás sai em 1h
  assert.equal(meter(ev, "places", 10, 5 * 3600e3, now).resetAt, null);
});

test("liberação manual zera o que veio antes", () => {
  const ev = [{ kind: "places" as const, units: 9, created_at: ago(2) }];
  assert.equal(meter(ev, "places", 10, 5 * 3600e3, now, new Date(now.getTime() - 3600e3)).used, 0);
});

test("allowance bloqueia pela janela ou pela semana", () => {
  const l = mergeLimits({ searches_window: 10, searches_week: 12 });
  const ev = [{ kind: "places" as const, units: 8, created_at: ago(30) }, { kind: "places" as const, units: 3, created_at: ago(1) }];
  const m = meters(ev, "places", l, now);
  assert.deepEqual(allowance(m, 1), { ok: true });
  const r = allowance(m, 3);
  assert.equal(r.ok, false);
  assert.equal(!r.ok && r.which, "week");
  assert.deepEqual(allowance(meters(ev, "places", mergeLimits({ searches_window: null, searches_week: null }), now), 99), { ok: true });
});

test("custo de IA por modelo", () => {
  assert.equal(llmCostUsd("claude-sonnet-4-6", 1e6, 1e6), 18);
  assert.equal(llmCostUsd("modelo-desconhecido", 1e6, 0), 3);
});

test("modelos escolhíveis têm preço próprio e o rápido é o mais barato", async () => {
  const { AI_MODELS, llmCostUsd, DEFAULT_AI_MODEL, modelInfo } = await import("./limits.ts");
  assert.ok(modelInfo(DEFAULT_AI_MODEL));
  const costs = AI_MODELS.map((m) => llmCostUsd(m.id, 1500, 3000));
  assert.deepEqual([...costs].sort((a, b) => a - b), costs); // Rápido < Equilibrado < Premium
  assert.equal(llmCostUsd("claude-haiku-5-5", 1e6, 1e6), 0.6);
});
