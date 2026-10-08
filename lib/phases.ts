// Dados das fases e funções puras (sem React, sem rede) — testadas em lib/phases.test.ts.

export type FormData = {
  clientName?: string;
  clientUrl?: string;
  /** Celular/WhatsApp do cliente — botões de envio abrem direto nele. */
  phone?: string;
  vertical?: string;
  city?: string;
  pricing?: string;
  goal?: string;
  /** Vindo de Configurações → Comercial (não é por cliente). */
  monthlyPrice?: string;
  trialPrice?: string;
  /** Dados reais dos concorrentes (Google Places ou colados à mão). */
  realData?: string;
};

export type Step = {
  id: keyof FormData;
  type: "text" | "url" | "vertical" | "select" | "tel";
  label: string;
  placeholder?: string;
  options?: string[];
  required?: boolean;
};

export type Part = {
  label: string;
  system: string;
  prompt: string;
  /** Bloqueia a geração enquanto não houver {realData} — evita a IA inventar concorrentes. */
  needsRealData?: boolean;
  maxTokens?: number;
  /** Subtítulo do bloco na etapa de Entrega. */
  group?: string;
};

export type Phase = {
  id: number;
  title: string;
  emoji: string;
  subtitle: string;
  color: string;
  steps?: Step[];
  parts?: Part[];
  tips?: string[];
  /** Mostra o painel de concorrentes reais (Google Maps) nesta etapa. */
  showRealData?: boolean;
};

export const CURRENCIES: Record<string, string> = { BRL: "R$", USD: "$", EUR: "€", GBP: "£" };

export const PRICING_OPTIONS = [
  "R$ 500/mês (entrada)",
  "R$ 1.000/mês (intermediário)",
  "R$ 1.500/mês (premium)",
];

export const VERTICALS = [
  "Pet shops", "Dentistas", "Clínicas de estética", "Salões de beleza", "Barbearias", "Oficinas mecânicas",
  "Encanadores", "Eletricistas", "Advogados", "Contadores", "Academias", "Restaurantes", "Lojas de roupa",
  "Lojas de roupa infantil", "Imobiliárias", "Chaveiros", "Empresas de limpeza", "Controle de pragas", "Vidraçarias",
];

/** Campos da Fase 1 sem os quais nenhum prompt deve ir para a IA. */
export const REQUIRED_FIELDS: (keyof FormData)[] = ["clientName", "vertical", "city"];

export function missingFields(d: FormData): (keyof FormData)[] {
  return REQUIRED_FIELDS.filter((k) => !d[k]?.trim());
}

/** Preenche os marcadores do prompt. Sempre substitui todos os marcadores conhecidos. */
export function fill(t: string, d: FormData): string {
  return t
    .replace(/\{vertical\}/g, d.vertical?.trim() || "[VERTICAL]")
    .replace(/\{city\}/g, d.city?.trim() || "[CIDADE]")
    .replace(/\{url\}/g, d.clientUrl?.trim() ? `Site do cliente: ${d.clientUrl.trim()}` : "")
    .replace(/\{clientName\}/g, d.clientName?.trim() || "o cliente")
    .replace(/\{realData\}/g, d.realData?.trim() || "[SEM DADOS REAIS]")
    .replace(/\{investimento\}/g, investment(d));
}

/** Texto de investimento para a proposta, a partir de Configurações → Comercial. */
export function investment(d: FormData): string {
  const m = d.monthlyPrice?.trim(), t = d.trialPrice?.trim();
  if (!m && !t) return "teste de 30 dias + mensalidade (use [VALOR] onde faltar preço)";
  return `teste de 30 dias por ${t || "[VALOR]"} + mensalidade de ${m || "[VALOR]"}`;
}

/** Motivo para bloquear a geração, ou null se pode gerar. */
export function blockReason(part: Part, d: FormData): string | null {
  const missing = missingFields(d);
  if (missing.length) {
    const names: Record<string, string> = { clientName: "nome do cliente", vertical: "nicho", city: "cidade" };
    return `Preencha na etapa 1 (Cliente): ${missing.map((m) => names[m] ?? m).join(", ")}.`;
  }
  if (part.needsRealData && !d.realData?.trim()) {
    return "Este prompt precisa de dados reais dos concorrentes. Busque no Google ou cole os dados na caixa acima.";
  }
  return null;
}

/** Nome de arquivo seguro, preservando letras acentuadas como letras simples ("São Paulo" → "sao-paulo"). */
export function slugify(s: string): string {
  return (
    s
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "arquivo"
  );
}

export function isValidUrl(v: string): boolean {
  try {
    const u = new URL(v);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

const REAL_DATA_RULE =
  "Use SOMENTE os dados reais fornecidos abaixo. Se faltar uma informação, escreva \"não informado\" — nunca invente números, nomes ou avaliações.";

export const PHASES: Phase[] = [
  {
    id: 1, title: "Cliente", emoji: "🏢", subtitle: "Quem é, como falar com ele e quem aparece na frente no Google", color: "#0F766E",
    showRealData: true,
    steps: [
      { id: "clientName", type: "text", label: "Nome da empresa", placeholder: "Ex: Pet Feliz", required: true },
      { id: "phone", type: "tel", label: "WhatsApp do cliente (celular com DDD)", placeholder: "(11) 98888-7777" },
      { id: "vertical", type: "vertical", label: "Nicho", options: VERTICALS, required: true },
      { id: "city", type: "text", label: "Cidade", placeholder: "Ex: Jundiaí", required: true },
      { id: "clientUrl", type: "url", label: "Site ou perfil no Google (opcional)", placeholder: "https://…" },
    ],
  },
  {
    id: 2, title: "Diagnóstico", emoji: "🔍", subtitle: "O que está tirando clientes da empresa — é o que vende", color: "#0F766E",
    showRealData: true,
    parts: [
      {
      label: "Auditoria de categorias e atributos",
      needsRealData: true,
      system: "Você é especialista em SEO local e Google Business Profile. Responda em português, de forma estruturada com tabelas e listas.",
      prompt: `Faça uma auditoria de SEO local para {clientName} — um(a) {vertical} em {city}.\n{url}\n\n${REAL_DATA_RULE}\n\nDADOS REAIS DOS CONCORRENTES (Google Maps, busca "{vertical} em {city}"):\n{realData}\n\nPara cada concorrente, liste:\n- Categoria principal e categorias secundárias\n- Atributos visíveis\n- Número de avaliações e nota\n\nDepois crie uma tabela comparativa e destaque:\n1. Categorias/atributos que {clientName} provavelmente NÃO tem mas deveria\n2. Estimativa de impacto no ranking para cada ajuste\n3. Prioridade de implementação (Alta/Média/Baixa)`,
    },
      { label: "Análise competitiva de avaliações",
        needsRealData: true,
        system: "Você é especialista em reputação digital e SEO local. Seja analítico e direto.",
        prompt: `Analise o cenário de avaliações para {clientName} ({vertical} em {city}).\n{url}\n\n${REAL_DATA_RULE}\n\nDADOS REAIS DOS CONCORRENTES:\n{realData}\n\nPara cada concorrente:\n- Total de avaliações e nota média\n- Pontos fortes e reclamações recorrentes (se houver texto de avaliações nos dados)\n\nConclua: quantas avaliações/mês {clientName} precisa para alcançar o líder e em quanto tempo, deixando claro quais números são estimativas suas.` },
    ],
    tips: ["⚡ Mande o resumo do diagnóstico antes da proposta: gera conversa", "🎯 Categorias e avaliações são o que mais pesa no Google Maps", "📊 Mostre o concorrente pelo nome — o dono conhece"],
  },
  {
    id: 3, title: "Proposta", emoji: "💼", subtitle: "Site de prévia + proposta com o nome da empresa, enviada pelo WhatsApp", color: "#0F766E",
    parts: [],
    tips: ["🌐 Proposta com site de prévia fecha muito mais", "⏱ Mande no mesmo dia da conversa — o interesse esfria rápido", "✅ O cliente aceita pelo link; você é avisado no WhatsApp"],
  },
  {
    id: 4, title: "Entrega", emoji: "🚀", subtitle: "Depois do sim: o trabalho no Perfil do Google, pronto para colar", color: "#0F766E",
    parts: [
      { label: "Descrição GBP (3 versões)", group: "Textos do perfil",
        system: "Você é copywriter especializado em SEO local para Google Business Profile. Escreva em português brasileiro, tom profissional.",
        prompt: `Escreva 3 versões de descrição GBP para {clientName} — {vertical} em {city}.\n{url}\n\nVersão 1 — Focada em palavras-chave (rankeamento)\nVersão 2 — Focada em conversão (cliques e ligações)\nVersão 3 — Equilibrada\n\nCada versão: máximo 750 caracteres. Inclua serviços principais, área de atuação em {city} e diferenciais de {clientName}. Mostre contagem de caracteres ao final de cada versão.` },
      { label: "Seção de Serviços (8 serviços)", group: "Textos do perfil",
        system: "Você é especialista em SEO local. Escreva em português brasileiro.",
        prompt: `Liste os 8 serviços mais buscados para {clientName} ({vertical} em {city}).\n{url}\n\nPara cada serviço, escreva descrição de 2-3 frases com palavras-chave locais naturais e bairros/regiões de {city}.\nFormato: Nome do serviço → Descrição` },
      { label: "10 Perguntas & Respostas para GBP", group: "Textos do perfil",
        system: "Você é especialista em SEO local e conteúdo para Google Business Profile.",
        prompt: `Crie 10 perguntas frequentes de clientes para {clientName} ({vertical} em {city}) com respostas otimizadas para busca.\n{url}\n\nCada resposta: 2-3 frases, palavras-chave locais naturais, mencione {city}, tom humano (não robótico).` },
      { label: "12 Templates de resposta a avaliações", group: "Avaliações",
        system: "Você é especialista em gestão de reputação. Escreva em português brasileiro, tom genuíno.",
        prompt: `Crie templates de resposta a avaliações para {clientName} ({vertical} em {city}):\n- 3 variações para ⭐⭐⭐⭐⭐\n- 3 variações para ⭐⭐⭐⭐\n- 3 variações para ⭐⭐⭐\n- 3 variações para ⭐⭐ ou ⭐\n\nCada resposta: 3-5 frases, palavras-chave do serviço + {city}, mencione {clientName} quando natural, tom genuíno nunca corporativo.` },
      { label: "Calendário de posts (8 semanas)", group: "Posts e fotos", maxTokens: 8000,
        system: "Você é estrategista de conteúdo para Google Business Profile.",
        prompt: `Crie calendário de posts GBP para {clientName} ({vertical} em {city}) — 8 semanas, 2-3 posts/semana.\n{url}\n\nMix obrigatório: promoções sazonais, antes/depois, conteúdo de bairros de {city}, destaques de avaliações, equipe.\n\nPara cada post: Semana | Dia | Tema | Texto completo (150-300 palavras) | Palavra-chave principal` },
      { label: "Plano de fotos (8 semanas)", group: "Posts e fotos",
        system: "Você é especialista em marketing visual para empresas locais.",
        prompt: `Plano de upload de fotos para {clientName} ({vertical} em {city}) — 8 semanas:\n- Quantas fotos por semana\n- Tipo (antes/depois, equipe, veículos/equipamentos, obra/serviço concluído)\n- Bairros ou pontos de referência de {city} para aparecer\n- Legenda sugerida com palavras-chave naturais\n\nNada de fotos genéricas de banco de imagens.` },
      { label: "30 diretórios + checklist NAP", group: "Presença fora do Google",
        system: "Você é especialista em SEO local e citações (citations).",
        prompt: `Liste os 30 principais diretórios onde {clientName} ({vertical} em {city}) deve ter cadastro.\n{url}\n\nPara cada diretório:\n- Nome e URL\n- Prioridade (Alta/Média/Baixa)\n- Campos obrigatórios\n\nDepois crie checklist de auditoria NAP para garantir que Nome, Endereço e Telefone sejam EXATAMENTE iguais em todos os diretórios.` },
      { label: "Schema LocalBusiness (JSON-LD)", group: "Presença fora do Google",
        system: "Você é desenvolvedor especializado em Schema.org e SEO técnico.",
        prompt: `Gere código Schema.org LocalBusiness em JSON-LD para {clientName} ({vertical} em {city}).\n{url}\n\nInclua:\n- @type correto para {vertical}\n- name ({clientName}), address, telephone, url (use placeholders claros como "PREENCHER_TELEFONE" quando não souber)\n- openingHoursSpecification (horário comercial padrão)\n- serviceArea para {city} e região\n- hasOfferCatalog com 5 serviços principais\n- geo com coordenadas aproximadas do centro de {city}\n\nNão inclua aggregateRating (avaliações inventadas violam as diretrizes do Google). Código completo pronto para o <head> do site.` },
    ],
    tips: ["📝 Serviços + Descrição + Perguntas são os campos que você controla", "📈 10 avaliações/mês com resposta = 120 conteúdos/ano", "♻️ Revisão mensal de dados e posts justifica o contrato recorrente"],
  },
];

/** Fases que mostram o painel de dados reais dos concorrentes. */
export const phaseNeedsRealData = (p: Phase) => !!p.showRealData || !!p.parts?.some((x) => x.needsRealData);
