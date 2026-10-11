// Perfil da Empresa no Google: regras puras da fila de ações e do relatório (sem rede).
// Testadas em lib/gbp.test.ts. As chamadas HTTP ficam em lib/gbpApi.ts.

export type ActionKind = "descricao" | "servicos" | "post" | "resposta_avaliacao" | "pergunta" | "site" | "foto" | "horario" | "outro";
export type ActionStatus = "pendente" | "aplicada" | "falhou" | "ignorada";

export type GbpAction = {
  id: string; client_id: string; kind: ActionKind; title: string; payload: Record<string, any>;
  status: ActionStatus; applied_via: "api" | "manual" | null; error: string | null;
  scheduled_for: string | null; applied_at: string | null; applied_by: string | null; created_at: string;
};

/** O que cada tipo de ação muda e se a API do Google permite aplicar sozinho. */
export const KIND_INFO: Record<ActionKind, { label: string; api: boolean; where: string }> = {
  descricao: { label: "Descrição do perfil", api: true, where: "Editar perfil › Sobre › Descrição" },
  servicos: { label: "Serviços", api: true, where: "Editar perfil › Serviços" },
  post: { label: "Post", api: true, where: "Adicionar atualização" },
  resposta_avaliacao: { label: "Resposta a avaliação", api: true, where: "Avaliações › Responder" },
  site: { label: "Site no perfil", api: true, where: "Editar perfil › Contato › Site" },
  pergunta: { label: "Pergunta e resposta", api: false, where: "Perguntas e respostas (o Google desligou a API em 3/11/2025)" },
  foto: { label: "Foto", api: false, where: "Adicionar foto" },
  horario: { label: "Horário", api: false, where: "Editar perfil › Horário" },
  outro: { label: "Outro ajuste", api: false, where: "Editar perfil" },
};

/** Painel do Google onde o dono ou a agência aplica à mão (modo assistido). */
export const GBP_HOME = "https://business.google.com/locations";

export const DESCRIPTION_MAX = 750;
export const POST_MAX = 1500;
export const SERVICE_DESC_MAX = 300;

export type Plan = {
  descricao?: string;
  servicos?: { nome: string; descricao?: string }[];
  posts?: { texto: string; semana?: number }[];
  perguntas?: { pergunta: string; resposta: string }[];
};

/** Extrai o JSON do plano da resposta da IA (com ou sem bloco ```json). */
export function parsePlan(text: string): Plan | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = (fenced ? fenced[1] : text).trim();
  const start = raw.indexOf("{"), end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const j = JSON.parse(raw.slice(start, end + 1));
    return j && typeof j === "object" ? (j as Plan) : null;
  } catch { return null; }
}

const clip = (s: unknown, n: number) => String(s ?? "").replace(/\s+\n/g, "\n").trim().slice(0, n);

/** Próximas datas de post: segundas e quintas às 10h (horário de Brasília = 13h UTC), a partir de amanhã. */
export function postSchedule(count: number, from: Date = new Date()): string[] {
  const out: string[] = [];
  const d = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate() + 1, 13));
  while (out.length < count) {
    const wd = d.getUTCDay();
    if (wd === 1 || wd === 4) out.push(d.toISOString());
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

export type NewAction = { kind: ActionKind; title: string; payload: Record<string, unknown>; scheduled_for?: string | null };

/** Converte o plano da IA em ações da fila. Corta no limite de cada campo do Google. */
export function actionsFromPlan(plan: Plan, opts: { siteUrl?: string; maxPosts?: number; from?: Date } = {}): NewAction[] {
  const out: NewAction[] = [];
  const desc = clip(plan.descricao, DESCRIPTION_MAX);
  if (desc.length >= 50) out.push({ kind: "descricao", title: "Trocar a descrição do perfil", payload: { text: desc } });

  const services = (plan.servicos ?? [])
    .map((s) => ({ name: clip(s?.nome, 120), description: clip(s?.descricao, SERVICE_DESC_MAX) }))
    .filter((s) => s.name.length > 1).slice(0, 20);
  if (services.length) out.push({ kind: "servicos", title: `Cadastrar ${services.length} serviço${services.length > 1 ? "s" : ""}`, payload: { items: services } });

  if (opts.siteUrl) out.push({ kind: "site", title: "Colocar o site no perfil", payload: { url: opts.siteUrl } });

  const posts = (plan.posts ?? []).map((p) => clip(p?.texto, POST_MAX)).filter((t) => t.length >= 40).slice(0, opts.maxPosts ?? 12);
  const dates = postSchedule(posts.length, opts.from);
  posts.forEach((text, i) => out.push({ kind: "post", title: `Post ${i + 1} de ${posts.length}`, payload: { text }, scheduled_for: dates[i] }));

  for (const q of (plan.perguntas ?? []).slice(0, 10)) {
    const pergunta = clip(q?.pergunta, 300), resposta = clip(q?.resposta, 1000);
    if (pergunta && resposta) out.push({ kind: "pergunta", title: pergunta, payload: { question: pergunta, answer: resposta } });
  }
  return out;
}

/** Texto que o modo assistido copia para colar no Google. */
export function assistedText(a: Pick<GbpAction, "kind" | "payload">): string {
  const p = a.payload ?? {};
  switch (a.kind) {
    case "servicos": return (p.items ?? []).map((s: { name: string; description?: string }) => (s.description ? `${s.name}\n${s.description}` : s.name)).join("\n\n");
    case "site": return String(p.url ?? "");
    case "pergunta": return `${p.question ?? ""}\n\n${p.answer ?? ""}`;
    case "resposta_avaliacao": return String(p.reply ?? "");
    default: return String(p.text ?? "");
  }
}

// ── Serviços: mescla sem apagar o que o dono já tinha ──────────────────────────
export type ServiceItem = {
  isOffered?: boolean;
  structuredServiceItem?: { serviceTypeId: string; description?: string };
  freeFormServiceItem?: { category: string; label: { displayName: string; description?: string; languageCode?: string } };
};

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

/** Mantém os serviços existentes e acrescenta (ou atualiza a descrição de) os novos, pelo nome. */
export function mergeServiceItems(existing: ServiceItem[], items: { name: string; description?: string }[], category: string): ServiceItem[] {
  const out = existing.map((s) => ({ ...s }));
  for (const it of items) {
    const i = out.findIndex((s) => s.freeFormServiceItem && norm(s.freeFormServiceItem.label.displayName) === norm(it.name));
    const label = { displayName: it.name, ...(it.description ? { description: it.description } : {}), languageCode: "pt" };
    if (i >= 0) out[i] = { ...out[i], freeFormServiceItem: { category: out[i].freeFormServiceItem!.category, label } };
    else out.push({ isOffered: true, freeFormServiceItem: { category, label } });
  }
  return out;
}

// ── Relatório (Performance API) ────────────────────────────────────────────────
export const REPORT_METRICS = [
  "BUSINESS_IMPRESSIONS_MOBILE_SEARCH", "BUSINESS_IMPRESSIONS_DESKTOP_SEARCH",
  "BUSINESS_IMPRESSIONS_MOBILE_MAPS", "BUSINESS_IMPRESSIONS_DESKTOP_MAPS",
  "CALL_CLICKS", "WEBSITE_CLICKS", "BUSINESS_DIRECTION_REQUESTS", "BUSINESS_CONVERSATIONS",
] as const;

export type Totals = { views: number; calls: number; website: number; directions: number; messages: number };
type DatedValue = { date: { year: number; month: number; day: number }; value?: string };
type Series = { dailyMetric: string; timeSeries?: { datedValues?: DatedValue[] } };

const ymd = (d: { year: number; month: number; day: number }) => Date.UTC(d.year, d.month - 1, d.day);

/** Soma as métricas diárias num intervalo [from, to] (datas UTC, inclusive). */
export function sumMetrics(series: Series[], from: Date, to: Date): Totals {
  const t: Totals = { views: 0, calls: 0, website: 0, directions: 0, messages: 0 };
  const a = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate());
  const b = Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate());
  for (const s of series) {
    for (const v of s.timeSeries?.datedValues ?? []) {
      const at = ymd(v.date); if (at < a || at > b) continue;
      const n = Number(v.value ?? 0) || 0;
      if (s.dailyMetric.startsWith("BUSINESS_IMPRESSIONS")) t.views += n;
      else if (s.dailyMetric === "CALL_CLICKS") t.calls += n;
      else if (s.dailyMetric === "WEBSITE_CLICKS") t.website += n;
      else if (s.dailyMetric === "BUSINESS_DIRECTION_REQUESTS") t.directions += n;
      else if (s.dailyMetric === "BUSINESS_CONVERSATIONS") t.messages += n;
    }
  }
  return t;
}

/** Variação percentual arredondada; null quando não há base para comparar. */
export function change(now: number, before: number): number | null {
  if (!before) return null;
  return Math.round(((now - before) / before) * 100);
}

const fmt = (n: number) => n.toLocaleString("pt-BR");
const delta = (now: number, before: number) => {
  const c = change(now, before);
  return c === null ? "" : c === 0 ? " (igual ao mês anterior)" : ` (${c > 0 ? "+" : ""}${c}% sobre o mês anterior)`;
};

/** Mensagem de WhatsApp do relatório mensal. Só números reais; o que não mudou não vira elogio. */
export function reportMessage(o: { company: string; consultant?: string; now: Totals; before: Totals; done: string[] }): string {
  const lines = [
    `Olá! ${o.consultant ? `Aqui é ${o.consultant}. ` : ""}Este é o resumo dos últimos 30 dias da ${o.company} no Google:`,
    "",
    `• ${fmt(o.now.views)} visualizações do perfil${delta(o.now.views, o.before.views)}`,
    `• ${fmt(o.now.calls)} ligações${delta(o.now.calls, o.before.calls)}`,
    `• ${fmt(o.now.directions)} pedidos de rota${delta(o.now.directions, o.before.directions)}`,
    `• ${fmt(o.now.website)} cliques no site${delta(o.now.website, o.before.website)}`,
  ];
  if (o.now.messages || o.before.messages) lines.push(`• ${fmt(o.now.messages)} conversas${delta(o.now.messages, o.before.messages)}`);
  if (o.done.length) lines.push("", "O que fizemos no perfil:", ...o.done.slice(0, 8).map((d) => `• ${d}`));
  lines.push("", "Qualquer dúvida, me chama aqui.");
  return lines.join("\n");
}

/** Resumo legível de uma ação aplicada, para o relatório. */
export function doneLabel(a: Pick<GbpAction, "kind" | "payload">): string {
  switch (a.kind) {
    case "descricao": return "Descrição do perfil reescrita";
    case "servicos": return `${(a.payload?.items ?? []).length} serviços cadastrados`;
    case "post": return "Post publicado";
    case "resposta_avaliacao": return "Avaliação respondida";
    case "site": return "Site ligado ao perfil";
    case "pergunta": return "Pergunta frequente respondida";
    case "foto": return "Foto publicada";
    case "horario": return "Horário atualizado";
    default: return "Ajuste no perfil";
  }
}

/** Agrupa as ações aplicadas no período para o relatório ("3× Post publicado"). */
export function doneSummary(actions: Pick<GbpAction, "kind" | "payload">[]): string[] {
  const count = new Map<string, number>();
  for (const a of actions) { const l = doneLabel(a); count.set(l, (count.get(l) ?? 0) + 1); }
  return [...count].map(([l, n]) => (n > 1 ? `${n}× ${l.toLowerCase()}` : l));
}

/** Estrelas da API v4 ("FIVE") em número. */
export const STARS: Record<string, number> = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 };
