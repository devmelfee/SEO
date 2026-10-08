import { test } from "node:test";
import assert from "node:assert/strict";
import { decodeCursor, encodeCursor, hashKey, keyFromHeaders, leadsToCsv, newApiKey, toPublicLead } from "./leadApi.ts";

const row = { id: "u1", place_id: "ChIJ1", name: "Pet Feliz", phone: "(11) 98888-7777", website: "https://instagram.com/pet",
  query: "Pet shop em Jundiaí", rating: 4.2, reviews_count: 8, score: 72, status: "abordado",
  issues: [{ code: "social_only", label: "Só rede social", detail: "x", weight: 10 }], lat: -23.1, lng: -46.8, hours: ["seg: 9-18"] };

test("chave nova: formato, prefixo e hash; só aceita do cabeçalho", () => {
  const k = newApiKey();
  assert.match(k.key, /^seo_[A-Za-z0-9_-]{40}$/);
  assert.equal(k.prefix, k.key.slice(0, 12));
  assert.equal(k.hash, hashKey(k.key));
  assert.equal(keyFromHeaders(new Headers({ authorization: `Bearer ${k.key}` })), k.key);
  assert.equal(keyFromHeaders(new Headers({ "x-api-key": k.key })), k.key);
  assert.equal(keyFromHeaders(new Headers({ authorization: "Bearer abc" })), null);
});

test("lead público: snake_case, whatsapp normalizado, sem campos internos", () => {
  const l = toPublicLead(row, "https://app/s/pet");
  assert.equal(l.whatsapp, "+5511988887777");
  assert.equal(l.has_own_site, false); // só rede social
  assert.equal(l.niche, "Pet shop");
  assert.equal(l.city, "Jundiaí");
  assert.deepEqual(l.issues[0], { code: "social_only", label: "Só rede social", detail: "x" });
  assert.deepEqual(l.location, { lat: -23.1, lng: -46.8 });
  assert.equal(l.site_preview_url, "https://app/s/pet");
  assert.equal(toPublicLead({ ...row, place_id: "busca:abc" }).google_place_id, null);
});

test("cursor ida e volta; lixo vira 0", () => {
  assert.equal(decodeCursor(encodeCursor(150)), 150);
  assert.equal(decodeCursor("lixo"), 0);
  assert.equal(decodeCursor(null), 0);
});

test("CSV: BOM, ';', aspas e proteção contra fórmula", () => {
  const csv = leadsToCsv([toPublicLead({ ...row, name: '=HYPERLINK("x")', address: "Rua A; 10" })]);
  assert.ok(csv.startsWith("﻿id;nome;"));
  assert.match(csv, /"'=HYPERLINK\(""x""\)"/);
  assert.match(csv, /"Rua A; 10"/);
});
