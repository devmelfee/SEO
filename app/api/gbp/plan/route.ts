import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/lib/supabase";
import { currentUser } from "@/lib/session";
import { check, fail, handle, ok } from "@/lib/http";
import { generate } from "@/lib/claude";
import { aiModel, guard, recordUsage } from "@/lib/usage";
import { llmCostUsd } from "@/lib/limits";
import { actionsFromPlan, DESCRIPTION_MAX, parsePlan, POST_MAX } from "@/lib/gbp";
import { clientSiteUrl, loadClient } from "@/lib/gbpApply";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Textos da etapa Entrega que viram ações (rótulos de lib/phases.ts).
const SOURCES = ["Descrição GBP (3 versões)", "Seção de Serviços (8 serviços)", "10 Perguntas & Respostas para GBP", "Calendário de posts (8 semanas)"];

const SYSTEM = "Você converte textos de SEO local já escritos em um plano estruturado para o Perfil da Empresa no Google. Responda SOMENTE com um objeto JSON válido, sem comentários.";

/**
 * Transforma o que a IA já escreveu na Entrega em ações aplicáveis (descrição, serviços, site, posts agendados,
 * perguntas). Substitui só as ações PENDENTES; o que já foi aplicado ou ignorado fica no histórico.
 */
export async function POST(req: Request) {
  try {
    const { clientId } = z.object({ clientId: z.string().uuid() }).parse(await req.json());
    const client = await loadClient(clientId);
    if (!client) return fail(404, "Cliente não encontrado.");
    const phases = check(await db().from("client_phases").select("phase_label,content").eq("client_id", clientId).in("phase_label", SOURCES)) as { phase_label: string; content: string }[];
    const texts = phases.filter((p) => p.content?.trim());
    if (!texts.length) return fail(400, "Gere antes pelo menos a Descrição, os Serviços ou o Calendário de posts nesta etapa.");

    const prompt = `Empresa: ${client.name} — ${client.vertical} em ${client.city}.

TEXTOS JÁ ESCRITOS (use estes; escolha a melhor versão quando houver várias):
${texts.map((p) => `### ${p.phase_label}\n${p.content.slice(0, 12000)}`).join("\n\n")}

Devolva este JSON:
{"descricao": "a melhor versão da descrição, até ${DESCRIPTION_MAX} caracteres, sem contagem de caracteres no fim",
 "servicos": [{"nome": "nome curto do serviço", "descricao": "até 300 caracteres"}],
 "posts": [{"semana": 1, "texto": "texto completo do post, até ${POST_MAX} caracteres, sem hashtags em excesso"}],
 "perguntas": [{"pergunta": "...", "resposta": "..."}]}

Regras: use só o que está nos textos; não invente preços, prêmios, números ou depoimentos; deixe a lista vazia quando o texto correspondente não existir; no máximo 12 posts, na ordem do calendário.`;

    const me = await currentUser();
    await guard(me, "llm", 1);
    const g = await generate(SYSTEM, prompt, 12000, await aiModel("text"));
    await recordUsage(me, { kind: "llm", action: "gbp_plano", query: `${client.name} — ${client.city}`, units: 1, model: g.model,
      input_tokens: g.inputTokens, output_tokens: g.outputTokens, cost_usd: llmCostUsd(g.model, g.inputTokens, g.outputTokens) });
    const plan = parsePlan(g.text);
    if (!plan) return fail(502, "A IA não devolveu um plano válido. Tente de novo.");

    const site = await clientSiteUrl(clientId, new URL(req.url).origin);
    // Só o site de outro app vai para o perfil: a prévia (/s/…) é marcada como "não é o site oficial".
    const actions = actionsFromPlan(plan, { siteUrl: site.external ? site.url : undefined });
    if (!actions.length) return fail(502, "Nada aproveitável nos textos. Gere a Descrição ou os Serviços e tente de novo.");

    check(await db().from("gbp_actions").delete().eq("client_id", clientId).eq("status", "pendente").neq("kind", "resposta_avaliacao"));
    const rows = check(await db().from("gbp_actions").insert(actions.map((a, i) => ({ ...a, client_id: clientId, created_by: me?.email ?? "", created_at: new Date(Date.now() + i).toISOString() }))).select("*"));
    return ok({ created: (rows as unknown[]).length });
  } catch (e) {
    if (e instanceof Anthropic.APIError) return fail(502, `Erro da IA (${e.status ?? "rede"}): ${e.message}`);
    return handle(e);
  }
}
