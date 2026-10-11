import { test } from "node:test";
import assert from "node:assert/strict";
import { acceptLink, buildProposalHtml, clientWaLink, defaultProposal, diagnosisMessage, proposalMessage } from "./proposal.ts";

const base = {
  company: "Pet Feliz", niche: "Pet shop", city: "Jundiaí", agency: "Agência X", consultant: "Ana", agencyWhatsapp: "(11) 99999-0000",
  trialPrice: "R$ 497", monthlyPrice: "R$ 997",
  issues: [{ label: "Sem site", detail: "Quem clica não acha mais informações." }],
  self: { reviews: 8, rating: 4.2, site: false },
  rivals: [{ name: "Pet Top", reviews: 240, rating: 4.8, site: true }],
};

test("proposta nasce com o nome da empresa, problemas reais e comparação", () => {
  const p = defaultProposal(base, new Date("2026-10-08T12:00:00Z"));
  assert.equal(p.problems[0].title, "Sem site");
  assert.equal(p.comparison[0].you, true);
  assert.equal(p.comparison[1].name, "Pet Top");
  const html = buildProposalHtml(p);
  assert.match(html, /Proposta para Pet Feliz/);
  assert.match(html, /R\$ 497/);
  assert.match(html, /Aceitar proposta/);
  assert.doesNotMatch(html, /<script/i);
});

test("sem problemas do Radar usa diagnóstico genérico; sem concorrentes não mostra tabela", () => {
  const p = defaultProposal({ company: "X", niche: "Dentista", city: "Itu" });
  assert.equal(p.problems.length, 3);
  assert.doesNotMatch(buildProposalHtml(p), /<table/);
});

test("escapa HTML vindo dos campos", () => {
  const p = defaultProposal({ ...base, company: "<img src=x onerror=alert(1)>" });
  assert.doesNotMatch(buildProposalHtml(p), /<img src=x/);
  assert.doesNotMatch(buildProposalHtml({ ...p, siteUrl: "javascript:alert(1)" }), /javascript:/);
});

test("aceita: mostra confirmação no lugar do botão", () => {
  const html = buildProposalHtml(defaultProposal(base), { accepted: true, acceptedAt: "2026-10-09T12:00:00Z" });
  assert.match(html, /Proposta aceita/);
  assert.doesNotMatch(html, /<form/);
});

test("mensagens e links de WhatsApp", () => {
  const p = defaultProposal(base);
  assert.match(acceptLink(p)!, /^https:\/\/wa\.me\/5511999990000\?text=.*Pet%20Feliz/);
  assert.match(proposalMessage(p, "https://app/p/x"), /Pet Feliz.*\n.*https:\/\/app\/p\/x/s);
  assert.match(diagnosisMessage("Pet Feliz", "Jundiaí", p.problems, "Ana"), /1\. Sem site/);
  assert.equal(clientWaLink("(11) 4444-0000", "oi"), null);
  assert.equal(acceptLink({ ...p, agencyWhatsapp: "" }), null);
});

test("oferta completa: nome e garantia na página; proposta antiga sem esses campos continua abrindo", () => {
  const p = defaultProposal(base);
  const html = buildProposalHtml(p);
  assert.match(html, /Plano Destaque no Google: o que vamos fazer/);
  assert.match(html, /Nossa garantia/);
  const old = buildProposalHtml({ ...p, offerName: undefined, guarantee: undefined });
  assert.match(old, /<h2>O que vamos fazer<\/h2>/);
  assert.doesNotMatch(old, /Nossa garantia/);
});
