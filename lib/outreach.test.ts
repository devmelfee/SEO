import { test } from "node:test";
import assert from "node:assert/strict";
import { buildMessage, isDue, mainHook, nextFollowup, waLink } from "./outreach.ts";

const lead = { place_id: "abc", name: "Pet Feliz", query: "Pet shop em Itupeva", phone: "(11) 91234-5678", website: "",
  rating: 4.2, reviews_count: 8, rank_in_search: 6, issues: [{ code: "no_website" }, { code: "few_reviews" }] };

test("o gancho segue o problema principal", () => {
  assert.match(mainHook(lead), /não tem site/);
  assert.match(mainHook({ ...lead, issues: [{ code: "social_only" }] }), /Instagram/);
  assert.match(mainHook({ ...lead, issues: [{ code: "few_reviews" }] }, { leaderReviews: 120 }), /8 avaliações.*120/);
});

test("1ª mensagem personalizada, com prévia quando houver site", () => {
  const m = buildMessage(lead, 1, { sender: "Ana", agency: "Agência X", siteUrl: "https://app/s/pet" });
  assert.match(m, /Sou Ana, da Agência X/);
  assert.match(m, /pet shop em Itupeva/);
  assert.match(m, /https:\/\/app\/s\/pet/);
});

test("com decisor identificado, cumprimenta pelo nome", () => {
  assert.match(buildMessage(lead, 1, { contactName: "Maria" }), /^(Olá, Maria!|Oi, Maria,)/);
});

test("última mensagem oferece parar o contato", () => {
  assert.match(buildMessage(lead, 3), /responder "parar"/);
});

test("sequência: +2 dias, +3 dias, fim", () => {
  const base = new Date("2026-10-08T15:00:00");
  assert.equal(nextFollowup(1, base)!.getDate(), 10);
  assert.equal(nextFollowup(2, base)!.getDate(), 11);
  assert.equal(nextFollowup(3, base), null);
  assert.equal(isDue("2026-10-08T09:00:00", base), true);
  assert.equal(isDue(null, base), false);
});

test("link só para celular", () => {
  assert.match(waLink("(11) 91234-5678", "oi")!, /^https:\/\/wa\.me\/5511912345678\?text=oi$/);
  assert.equal(waLink("(11) 4444-0000", "oi"), null);
});

test("etapa e datas de cada passo", async () => {
  const { stageOf, stepDates, cooldownMs } = await import("./outreach.ts");
  assert.equal(stageOf(null), 1); assert.equal(stageOf(1), 2); assert.equal(stageOf(2), 3); assert.equal(stageOf(3), 4);
  const d = stepDates(1, { 1: "2026-10-06T12:00:00.000Z" }, "2026-10-08T12:00:00.000Z");
  assert.deepEqual(d.map((x) => x.done), [true, false, false]);
  assert.equal(d[1].date, "2026-10-08T12:00:00.000Z");
  assert.ok(d[2].date && new Date(d[2].date) > new Date(d[1].date!)); // último = lembrete + 3 dias
  assert.equal(stepDates(0, {}, null)[0].date, null);
  assert.equal(cooldownMs(0), 45_000); assert.equal(cooldownMs(1), 90_000);
});
