import { test } from "node:test";
import assert from "node:assert/strict";
import { buildSiteHtml, buildSitePrompt, extractHtml, siteSlug, whatsappNumber } from "./site.ts";

const d = { name: "Peekaboo Babies & Kids", niche: "Loja de roupa infantil", city: "Jundiaí", phone: "(11) 91017-9782",
  address: "R. Silva Jardim, 176 - Jundiaí", hours: ["segunda-feira: 13:00 – 18:00"], rating: 4.5, reviews: 13 };

test("whatsapp só para celular", () => {
  assert.equal(whatsappNumber("(11) 91017-9782"), "5511910179782");
  assert.equal(whatsappNumber("+55 11 91017-9782"), "5511910179782");
  assert.equal(whatsappNumber("(11) 4521-0000"), null);
  assert.equal(whatsappNumber(""), null);
});

test("slug sem acento", () => assert.equal(siteSlug("Peekaboo Babies & Kids", "Jundiaí"), "peekaboo-babies-kids-jundiai"));

test("modelo usa dados reais, escapa HTML e marca prévia/noindex", () => {
  const html = buildSiteHtml({ ...d, name: 'Loja <script>alert(1)</script>' });
  assert.match(html, /noindex/);
  assert.match(html, /Prévia de site/);
  assert.doesNotMatch(html, /<script>alert/);
  assert.match(buildSiteHtml(d), /wa\.me\/5511910179782/);
  assert.match(buildSiteHtml(d), /4,5<\/b> no Google · 13 avaliações/);
  assert.match(buildSiteHtml(d), /segunda-feira/);
});

test("sem nota não mostra avaliações; fixo vira Ligar", () => {
  const html = buildSiteHtml({ ...d, rating: null, reviews: 0, phone: "(11) 4521-0000" });
  assert.doesNotMatch(html, /no Google ·/);
  assert.doesNotMatch(html, /wa\.me/);
  assert.match(html, /tel:1145210000/);
});

test("prompt proíbe inventar e leva os dados", () => {
  const { prompt } = buildSitePrompt(d);
  assert.match(prompt, /PROIBIDO inventar depoimentos/);
  assert.match(prompt, /wa\.me\/5511910179782/);
  assert.match(prompt, /R\. Silva Jardim/);
});

test("extractHtml aceita bloco de código e recusa lixo", () => {
  assert.match(extractHtml("Aqui:\n```html\n<html><body>x</body></html>\n```")!, /^<!doctype html>/);
  assert.equal(extractHtml("não sei fazer"), null);
});
