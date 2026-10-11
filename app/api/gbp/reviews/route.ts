import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/lib/supabase";
import { currentUser } from "@/lib/session";
import { check, fail, handle, ok } from "@/lib/http";
import { generate } from "@/lib/claude";
import { aiModel, guard, recordUsage } from "@/lib/usage";
import { llmCostUsd } from "@/lib/limits";
import { listReviews } from "@/lib/gbpApi";
import { loadClient } from "@/lib/gbpApply";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Busca no Google as avaliações ainda sem resposta e escreve um rascunho para cada uma.
 * Os rascunhos entram na fila para a pessoa revisar: nada é publicado sem o clique em Aplicar.
 */
export async function POST(req: Request) {
  try {
    const { clientId } = z.object({ clientId: z.string().uuid() }).parse(await req.json());
    const client = await loadClient(clientId);
    if (!client) return fail(404, "Cliente não encontrado.");
    if (!client.gbp_account || !client.gbp_location) return fail(409, "Escolha o perfil do Google deste cliente antes.");

    const pendingNames = new Set((check(await db().from("gbp_actions").select("payload").eq("client_id", clientId).eq("kind", "resposta_avaliacao")) as { payload: any }[])
      .map((a) => a.payload?.reviewName));
    const open = (await listReviews({ account: client.gbp_account, location: client.gbp_location }))
      .filter((r) => !r.replied && !pendingNames.has(r.name)).slice(0, 15);
    if (!open.length) return ok({ created: 0 });

    const me = await currentUser();
    await guard(me, "llm", 1);
    const prompt = `Escreva respostas para avaliações do Google da empresa ${client.name} (${client.vertical} em ${client.city}).
Regras: português do Brasil, 2 a 4 frases, tom humano e específico ao que a pessoa escreveu, agradeça pelo nome; em nota baixa, peça desculpas sem discutir e convide a resolver por mensagem; não prometa descontos; não invente fatos.
Devolva SOMENTE um JSON: {"respostas": [{"i": 0, "resposta": "..."}]}

${open.map((r, i) => `[${i}] ${r.reviewer} · ${r.stars} estrela(s): ${r.comment || "(sem comentário)"}`).join("\n")}`;
    const g = await generate("Você é especialista em gestão de reputação de negócios locais.", prompt, 6000, await aiModel("text"));
    await recordUsage(me, { kind: "llm", action: "gbp_respostas", query: client.name, units: 1, model: g.model,
      input_tokens: g.inputTokens, output_tokens: g.outputTokens, cost_usd: llmCostUsd(g.model, g.inputTokens, g.outputTokens) });
    const m = g.text.match(/\{[\s\S]*\}/);
    let list: { i: number; resposta: string }[] = [];
    try { list = JSON.parse(m?.[0] ?? "{}").respostas ?? []; } catch { return fail(502, "A IA não devolveu as respostas em formato válido. Tente de novo."); }

    const rows = list.filter((x) => open[x.i] && x.resposta?.trim()).map((x) => {
      const r = open[x.i];
      return { client_id: clientId, kind: "resposta_avaliacao", title: `${r.reviewer} · ${r.stars}★`, created_by: me?.email ?? "",
        payload: { reviewName: r.name, reviewer: r.reviewer, stars: r.stars, comment: r.comment.slice(0, 2000), reply: x.resposta.trim().slice(0, 4000) } };
    });
    if (rows.length) check(await db().from("gbp_actions").insert(rows));
    return ok({ created: rows.length });
  } catch (e) {
    if (e instanceof Anthropic.APIError) return fail(502, `Erro da IA (${e.status ?? "rede"}): ${e.message}`);
    return handle(e);
  }
}
