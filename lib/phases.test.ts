import { test } from "node:test";
import assert from "node:assert/strict";
import { fill, blockReason, missingFields, slugify, isValidUrl, PHASES } from "./phases.ts";
import { formatPlaces } from "./places.ts";

const full = { clientName: "Hidro Fix", vertical: "Encanadores", city: "São Paulo" };

test("fill substitui todos os marcadores", () => {
  const out = fill("{clientName} {vertical} {city} {url} {realData}", { ...full, clientUrl: "https://x.com", realData: "R" });
  assert.equal(out, "Hidro Fix Encanadores São Paulo Site do cliente: https://x.com R");
});

test("fill usa marcadores visíveis quando falta dado", () => {
  assert.equal(fill("{vertical}|{city}|{url}|{realData}", {}), "[VERTICAL]|[CIDADE]||[SEM DADOS REAIS]");
});

test("nenhum prompt fica com marcador sem substituir", () => {
  for (const p of PHASES) for (const part of p.parts ?? []) {
    assert.doesNotMatch(fill(part.prompt, { ...full, realData: "x" }), /\{[a-zA-Z]+\}/, part.label);
  }
});

test("missingFields ignora espaços em branco", () => {
  assert.deepEqual(missingFields({ clientName: "  ", vertical: "X", city: "Y" }), ["clientName"]);
});

test("blockReason exige Fase 1 e dados reais quando o prompt pede", () => {
  const audit = PHASES[1].parts![0];
  assert.match(blockReason(audit, {})!, /Configuração Inicial/);
  assert.match(blockReason(audit, full)!, /dados reais/);
  assert.equal(blockReason(audit, { ...full, realData: "dados" }), null);
  assert.equal(blockReason(PHASES[2].parts![0], full), null);
});

test("slugify preserva letras acentuadas", () => {
  assert.equal(slugify("Hidro Fix-São Paulo"), "hidro-fix-sao-paulo");
  assert.equal(slugify("!!!"), "arquivo");
});

test("isValidUrl", () => {
  assert.equal(isValidUrl("https://a.com"), true);
  assert.equal(isValidUrl("javascript:alert(1)"), false);
  assert.equal(isValidUrl("a.com"), false);
});

test("formatPlaces", () => {
  const out = formatPlaces([{ displayName: { text: "A" }, rating: 4.5, userRatingCount: 10, types: ["plumber", "establishment"] }]);
  assert.match(out, /1\. A/);
  assert.match(out, /Avaliações: 10 · Nota: 4.5/);
  assert.match(out, /Tipos: plumber$/m);
});

test("investimento vem das configurações", async () => {
  const { investment } = await import("./phases.ts");
  assert.match(investment({}), /\[VALOR\]/);
  assert.equal(investment({ monthlyPrice: "R$ 1.000", trialPrice: "R$ 500" }), "teste de 30 dias por R$ 500 + mensalidade de R$ 1.000");
});
