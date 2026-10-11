// Contas das landing pages (puras, testadas em lib/landing.test.ts). Toda suposição é editável na tela
// e rotulada como estimativa: a página nunca promete faturamento nem posição no Google.

const clamp = (n: number, a: number, b: number) => Math.min(b, Math.max(a, Number.isFinite(n) ? n : 0));

/** Dado real: 438 de 684 empresas analisadas em Jundiaí não tinham site próprio. */
export const JUNDIAI = { analisadas: 684, semSite: 438 };
export const JUNDIAI_PCT = Math.round((JUNDIAI.semSite / JUNDIAI.analisadas) * 100); // 64

export type CityInput = { empresas: number; semSitePct: number; fechamentoPct: number; mensalidade: number };
export type CityResult = { semSite: number; contratos: number; mensal: number; anual: number };

/** Consultor: quanto a cidade vale, com a taxa de fechamento e o preço que a pessoa informar. */
export function cityPotential(i: CityInput): CityResult {
  const semSite = Math.round(clamp(i.empresas, 0, 100000) * clamp(i.semSitePct, 0, 100) / 100);
  const contratos = Math.floor(semSite * clamp(i.fechamentoPct, 0, 100) / 100);
  const mensal = contratos * clamp(i.mensalidade, 0, 100000);
  return { semSite, contratos, mensal, anual: mensal * 12 };
}

export type LossInput = { buscas: number; viramClientePct: number; suaFatiaPct: number; ticket: number };
export type LossResult = { clientes: number; mensal: number; anual: number };

/** Dono: clientes por mês que procuram o serviço e vão para quem aparece no mapa. */
export function monthlyLoss(i: LossInput): LossResult {
  const clientes = Math.round(clamp(i.buscas, 0, 1e6) * clamp(i.viramClientePct, 0, 100) / 100 * clamp(i.suaFatiaPct, 0, 100) / 100);
  const mensal = clientes * clamp(i.ticket, 0, 1e6);
  return { clientes, mensal, anual: mensal * 12 };
}

/** Autodiagnóstico do perfil no Google: 8 perguntas de sim ou não, cada uma com o peso do que ela custa. */
export const QUIZ = [
  { id: "perfil", q: "Sua empresa aparece no Google Maps quando você procura o nome dela?", peso: 20, falta: "Perfil da empresa no Google criado e verificado" },
  { id: "site", q: "O perfil tem um site próprio (não só Instagram ou WhatsApp)?", peso: 15, falta: "Site próprio ligado ao perfil" },
  { id: "avaliacoes", q: "Você tem mais de 30 avaliações no Google?", peso: 15, falta: "Avaliações suficientes para competir com quem está na frente" },
  { id: "respostas", q: "Você responde as avaliações, inclusive as ruins?", peso: 10, falta: "Respostas às avaliações (o Google e os clientes leem)" },
  { id: "horario", q: "O horário e o telefone no Google estão certos?", peso: 10, falta: "Horário e telefone corretos" },
  { id: "fotos", q: "Tem pelo menos 10 fotos reais da empresa no perfil?", peso: 10, falta: "Fotos reais da fachada, do espaço e do trabalho" },
  { id: "servicos", q: "Os seus serviços estão cadastrados no perfil, com descrição?", peso: 10, falta: "Serviços cadastrados com descrição" },
  { id: "posts", q: "Você publicou algo no perfil do Google no último mês?", peso: 10, falta: "Publicações recentes no perfil" },
] as const;

export type QuizAnswers = Partial<Record<(typeof QUIZ)[number]["id"], boolean>>;

/** Nota de 0 a 100 e o que falta, do mais caro para o mais barato. */
export function quizScore(a: QuizAnswers): { nota: number; respondidas: number; faltas: string[]; faixa: "critica" | "fraca" | "boa" } {
  let nota = 0, respondidas = 0;
  const faltas: { t: string; peso: number }[] = [];
  for (const item of QUIZ) {
    const v = a[item.id];
    if (v === undefined) continue;
    respondidas++;
    if (v) nota += item.peso; else faltas.push({ t: item.falta, peso: item.peso });
  }
  const faixa = nota < 50 ? "critica" : nota < 80 ? "fraca" : "boa";
  return { nota, respondidas, faltas: faltas.sort((x, y) => y.peso - x.peso).map((f) => f.t), faixa };
}

/** Semana de prospecção: minutos por empresa em cada tarefa, à mão e com o app (estimativas editáveis). */
export const WEEK_TASKS = [
  { t: "Achar a empresa no Maps e anotar os dados", mao: 6, app: 0.3 },
  { t: "Conferir site, Instagram e avaliações", mao: 4, app: 0 },
  { t: "Escrever uma mensagem que cite o problema dela", mao: 5, app: 0.5 },
  { t: "Lembrar e mandar o 2º e o 3º contato", mao: 3, app: 0.4 },
] as const;
export const PER_PROPOSAL = { mao: 150, app: 6 }; // site de prévia + proposta com o nome da empresa, em minutos

/** Horas por semana para abordar N empresas e mandar P propostas. */
export function weekHours(empresas: number, propostas: number): { mao: number; app: number; poupadas: number } {
  const n = clamp(empresas, 0, 2000), p = clamp(propostas, 0, 200);
  const sum = (k: "mao" | "app") => WEEK_TASKS.reduce((s, x) => s + x[k], 0) * n + PER_PROPOSAL[k] * p;
  const mao = Math.round(sum("mao") / 6) / 10, app = Math.round(sum("app") / 6) / 10;
  return { mao, app, poupadas: Math.round((mao - app) * 10) / 10 };
}

export const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

/** Texto curto e seguro vindo da URL (personaliza a página do dono: ?empresa=&nicho=&cidade=). */
export function cleanParam(v: unknown, max = 60): string {
  if (typeof v !== "string") return "";
  return v.replace(/[<>{}"\\]/g, "").replace(/\s+/g, " ").trim().slice(0, max);
}
