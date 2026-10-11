import { test } from "node:test";
import assert from "node:assert/strict";
import { actionsFromPlan, assistedText, change, doneSummary, mergeServiceItems, parsePlan, postSchedule, reportMessage, sumMetrics } from "./gbp.ts";

test("plano da IA: aceita JSON em bloco de código e recusa lixo", () => {
  assert.deepEqual(parsePlan('Aqui está:\n```json\n{"descricao":"x"}\n```'), { descricao: "x" });
  assert.deepEqual(parsePlan('{"posts":[]}'), { posts: [] });
  assert.equal(parsePlan("não sei"), null);
  assert.equal(parsePlan("{quebrado"), null);
});

test("ações do plano: corta nos limites do Google, agenda posts e só põe site quando há link", () => {
  const long = "a".repeat(900);
  const acts = actionsFromPlan({
    descricao: long,
    servicos: [{ nome: "Banho e tosa", descricao: "Com hora marcada." }, { nome: "" }],
    posts: [{ texto: "Post curto" }, { texto: "Promoção de banho para cães de porte pequeno nesta semana em Jundiaí." }],
    perguntas: [{ pergunta: "Vocês buscam o pet?", resposta: "Sim, no centro." }],
  }, { siteUrl: "https://pet.com.br/", from: new Date("2026-10-12T15:00:00Z") });
  const kinds = acts.map((a) => a.kind);
  assert.deepEqual(kinds, ["descricao", "servicos", "site", "post", "pergunta"]);
  assert.equal((acts[0].payload.text as string).length, 750);
  assert.equal((acts[1].payload.items as unknown[]).length, 1);
  assert.equal(acts[3].scheduled_for, "2026-10-15T13:00:00.000Z"); // próxima quinta, 10h de Brasília
  assert.equal(actionsFromPlan({ descricao: "x".repeat(100) }).some((a) => a.kind === "site"), false);
});

test("posts saem às segundas e quintas", () => {
  const d = postSchedule(4, new Date("2026-10-11T12:00:00Z")).map((x) => new Date(x).getUTCDay());
  assert.deepEqual(d, [1, 4, 1, 4]);
});

test("serviços: mantém os do dono e atualiza pelo nome, sem duplicar", () => {
  const existing = [
    { structuredServiceItem: { serviceTypeId: "job_type_id:dog_grooming" } },
    { freeFormServiceItem: { category: "categories/gcid:pet_store", label: { displayName: "Banho e Tosa", description: "antigo" } } },
  ];
  const out = mergeServiceItems(existing, [{ name: "banho e tosa", description: "novo" }, { name: "Hotel para cães" }], "categories/gcid:pet_store");
  assert.equal(out.length, 3);
  assert.equal(out[1].freeFormServiceItem!.label.description, "novo");
  assert.equal(out[2].freeFormServiceItem!.label.displayName, "Hotel para cães");
  assert.ok(out[0].structuredServiceItem);
});

test("modo assistido copia o texto certo de cada tipo", () => {
  assert.equal(assistedText({ kind: "site", payload: { url: "https://x.com" } }), "https://x.com");
  assert.equal(assistedText({ kind: "servicos", payload: { items: [{ name: "A", description: "a" }, { name: "B" }] } }), "A\na\n\nB");
  assert.equal(assistedText({ kind: "resposta_avaliacao", payload: { reply: "Obrigado!" } }), "Obrigado!");
});

test("relatório: soma por período, compara e só fala de números reais", () => {
  const v = (day: number, value: string) => ({ date: { year: 2026, month: 9, day }, value });
  const series = [
    { dailyMetric: "BUSINESS_IMPRESSIONS_MOBILE_MAPS", timeSeries: { datedValues: [v(1, "10"), v(20, "30")] } },
    { dailyMetric: "BUSINESS_IMPRESSIONS_DESKTOP_SEARCH", timeSeries: { datedValues: [v(20, "5")] } },
    { dailyMetric: "CALL_CLICKS", timeSeries: { datedValues: [v(2, "2"), v(21, "4")] } },
    { dailyMetric: "WEBSITE_CLICKS", timeSeries: { datedValues: [{ date: { year: 2026, month: 9, day: 22 } }] } },
  ];
  const before = sumMetrics(series, new Date("2026-09-01"), new Date("2026-09-10"));
  const now = sumMetrics(series, new Date("2026-09-11"), new Date("2026-09-30"));
  assert.deepEqual(before, { views: 10, calls: 2, website: 0, directions: 0, messages: 0 });
  assert.deepEqual(now, { views: 35, calls: 4, website: 0, directions: 0, messages: 0 });
  assert.equal(change(4, 2), 100); assert.equal(change(3, 0), null);
  const msg = reportMessage({ company: "Pet Feliz", consultant: "Ana", now, before, done: doneSummary([{ kind: "post", payload: {} }, { kind: "post", payload: {} }, { kind: "descricao", payload: {} }]) });
  assert.match(msg, /Aqui é Ana/);
  assert.match(msg, /35 visualizações do perfil \(\+250% sobre o mês anterior\)/);
  assert.match(msg, /2× post publicado/);
  assert.match(msg, /0 cliques no site$/m);
  assert.doesNotMatch(msg, /conversas/);
});
