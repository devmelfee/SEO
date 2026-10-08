import { test } from "node:test";
import assert from "node:assert/strict";
import { scoreOpportunity, type PlaceData } from "./opportunity.ts";

const base: PlaceData = { id: "x", name: "A", website: "https://a.com", phone: "11 9999", rating: 4.8, reviews: 200,
  hasHours: true, photos: 10, types: ["dentist", "doctor"], status: "OPERATIONAL" };
const ctx = { rank: 10, leaderReviews: 300, total: 20 };

test("perfil completo tem nota baixa de oportunidade", () => {
  const r = scoreOpportunity(base, ctx);
  assert.equal(r.issues.length, 0);
  assert.equal(r.score, 5); // só o bônus de posição 4–20
});

test("sem site é o maior peso", () => {
  const r = scoreOpportunity({ ...base, website: "" }, ctx);
  assert.equal(r.issues[0].code, "no_website");
  assert.equal(r.score, 40);
});

test("perfil fraco chega perto de 100 e não passa", () => {
  const r = scoreOpportunity({ ...base, website: "", phone: "", rating: 3.5, reviews: 3, hasHours: false, photos: 0, types: ["dentist"] }, ctx);
  assert.ok(r.score >= 90 && r.score <= 100, String(r.score));
});

test("top 3 perde pontos; fechado zera", () => {
  assert.equal(scoreOpportunity({ ...base, website: "" }, { ...ctx, rank: 2 }).score, 25);
  assert.equal(scoreOpportunity({ ...base, status: "CLOSED_PERMANENTLY" }, ctx).score, 0);
});

test("longe do líder só conta acima de 10 avaliações", () => {
  assert.ok(scoreOpportunity({ ...base, reviews: 40 }, ctx).issues.some((i) => i.code === "behind_leader"));
  assert.ok(!scoreOpportunity({ ...base, reviews: 5 }, ctx).issues.some((i) => i.code === "behind_leader"));
});

test("sem nota é diferente de nota baixa", () => {
  const r = scoreOpportunity({ ...base, rating: undefined, reviews: 0 }, ctx);
  assert.ok(r.issues.some((i) => i.code === "no_rating"));
  assert.ok(!r.issues.some((i) => i.code === "low_rating"));
});
