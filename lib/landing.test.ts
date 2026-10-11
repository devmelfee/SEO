import { test } from "node:test";
import assert from "node:assert/strict";
import { cityPotential, cleanParam, JUNDIAI_PCT, monthlyLoss, quizScore, weekHours } from "./landing.ts";

test("potencial da cidade usa o dado real de Jundiaí e as premissas da pessoa", () => {
  assert.equal(JUNDIAI_PCT, 64);
  const r = cityPotential({ empresas: 684, semSitePct: 64, fechamentoPct: 3, mensalidade: 997 });
  assert.deepEqual(r, { semSite: 438, contratos: 13, mensal: 12961, anual: 155532 });
  assert.equal(cityPotential({ empresas: -5, semSitePct: 300, fechamentoPct: 3, mensalidade: 997 }).semSite, 0);
});

test("perda do dono: buscas × quem vira cliente × a fatia de quem aparece × ticket", () => {
  assert.deepEqual(monthlyLoss({ buscas: 300, viramClientePct: 10, suaFatiaPct: 33, ticket: 80 }), { clientes: 10, mensal: 800, anual: 9600 });
  assert.equal(monthlyLoss({ buscas: NaN, viramClientePct: 10, suaFatiaPct: 33, ticket: 80 }).mensal, 0);
});

test("autodiagnóstico: nota pelos pesos e faltas da mais cara para a mais barata", () => {
  const r = quizScore({ perfil: true, site: false, avaliacoes: false, respostas: true, horario: true, fotos: false, servicos: false, posts: false });
  assert.equal(r.nota, 40); assert.equal(r.respondidas, 8); assert.equal(r.faixa, "critica");
  assert.match(r.faltas[0], /Site|Avaliações/);
  assert.equal(quizScore({}).respondidas, 0);
  assert.equal(quizScore({ perfil: true, site: true, avaliacoes: true, respostas: true, horario: true, fotos: true, servicos: true, posts: true }).nota, 100);
});

test("semana de prospecção: horas à mão contra com o app", () => {
  const w = weekHours(40, 3);
  assert.ok(w.mao > 10 && w.app < 2, JSON.stringify(w));
  assert.equal(w.poupadas, Math.round((w.mao - w.app) * 10) / 10);
});

test("parâmetro da URL não injeta HTML", () => {
  assert.equal(cleanParam('<script>alert("x")</script>Pet'), "scriptalert(x)/scriptPet");
  assert.equal(cleanParam("  Pet   Feliz "), "Pet Feliz");
  assert.equal(cleanParam(undefined), "");
});
