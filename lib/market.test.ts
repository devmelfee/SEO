import { test } from "node:test";
import assert from "node:assert/strict";
import { summarizeMarket } from "./market.ts";

const lead = (score: number, reviews: number, website = "", social = false) =>
  ({ score, reviews_count: reviews, website, issues: social ? [{ code: "social_only" }] : [] });

test("mercado vazio", () => assert.equal(summarizeMarket([]).opportunity, 0));

test("rede social conta como sem site", () => {
  const s = summarizeMarket([lead(60, 5), lead(40, 10, "https://instagram.com/x", true), lead(10, 90, "https://a.com")]);
  assert.equal(s.noSite, 2);
  assert.equal(s.hot, 1);
  assert.equal(s.leaderReviews, 90);
  assert.equal(s.avgReviews, 35);
});

test("mercado fraco e sem site vale mais que mercado maduro", () => {
  const fraco = summarizeMarket(Array.from({ length: 20 }, () => lead(70, 8)));
  const maduro = summarizeMarket(Array.from({ length: 20 }, () => lead(10, 200, "https://a.com")));
  assert.ok(fraco.opportunity > 80, String(fraco.opportunity));
  assert.ok(maduro.opportunity < 10, String(maduro.opportunity));
});

test("mercado com poucas empresas pesa menos", () => {
  const pequeno = summarizeMarket(Array.from({ length: 4 }, () => lead(70, 8)));
  const grande = summarizeMarket(Array.from({ length: 20 }, () => lead(70, 8)));
  assert.ok(pequeno.opportunity < grande.opportunity);
});
