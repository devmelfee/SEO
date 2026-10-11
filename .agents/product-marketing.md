# Product Marketing Context

**Document version:** v1
**Last updated:** 2026-10-11

> Rascunho montado a partir do código, da landing page (`/apresentacao`) e das decisões tomadas no projeto.
> Itens marcados **[a confirmar]** são suposições — ainda não há clientes pagantes, depoimentos nem métricas.
> Idioma de toda a comunicação: **português do Brasil**.

## Product Overview
**One-liner:** O sistema que acha empresas locais perdendo clientes no Google e leva você do primeiro WhatsApp ao contrato assinado.
**What it does:** Busca empresas no Google Maps por nicho e cidade e dá a cada uma uma nota de oportunidade (sem site, poucas avaliações, perfil incompleto). Escreve a abordagem de WhatsApp com o problema daquela empresa, agenda os lembretes, gera um site de prévia e uma proposta com o nome da empresa que o cliente aceita por um link. Depois do "sim", gera os textos do Perfil da Empresa no Google para a entrega.
**Product category:** Ferramenta de prospecção e venda de SEO local / Google Meu Negócio para consultores e agências. (Como o cliente procura: "como conseguir clientes para SEO local", "prospecção de clientes Google Meu Negócio", "ferramenta para agência de marketing local".)
**Product type:** SaaS web, feito primeiro para o celular. Hoje usado internamente pela agência (Melfee); em preparação para ser oferecido a outros consultores.
**Business model:** [a confirmar] Assinatura mensal com cota de buscas e gerações de IA incluída + pacotes extras. Custos variáveis medidos no próprio app: ≈ R$ 0,20 por busca de 20 empresas no Google; R$ 0,01 a R$ 1,20 por geração de IA, conforme o modelo.

## Target Audience
**Target companies:** Consultores autônomos e pequenas agências de marketing digital (1 a 10 pessoas) no Brasil que vendem ou querem vender SEO local, Google Meu Negócio, sites e gestão de avaliações para comércio e serviços de bairro.
**Decision-makers:** O dono da agência ou o próprio consultor (quem compra é quem usa). Em agências com equipe: o dono decide e controla os gastos; os vendedores e executores usam no dia a dia.
**Primary use case:** Encher a agenda de clientes de SEO local sem passar horas garimpando o Google Maps e escrevendo mensagem por mensagem.
**Jobs to be done:**
- "Me diga para quem vale a pena ligar hoje, na minha cidade."
- "Me dê um motivo concreto para o dono da empresa me responder."
- "Me ajude a fechar rápido e a entregar sem retrabalho."
**Use cases:**
- Consultor começando: escolhe um nicho e uma cidade e manda as primeiras 20 mensagens no mesmo dia.
- Agência com vendedor: o dono define limites de buscas; o vendedor trabalha a fila diária de Abordagem.
- Fechamento: manda a proposta com o site de prévia; o cliente aceita pelo link e a agência é avisada no WhatsApp.
- Entrega: gera descrição, serviços, perguntas e respostas, respostas a avaliações e calendário de posts do Perfil do Google.

## Personas
| Persona | Cares about | Challenge | Value we promise |
|---------|-------------|-----------|------------------|
| Prático (vendedor / consultor solo) | Saber quem chamar hoje e mandar rápido | Perde tempo achando leads e escrevendo mensagem | Fila do dia com a mensagem pronta; um toque abre o WhatsApp |
| Analista (dono / estrategista) | Onde vale prospectar e quanto custa | Não sabe qual cidade ou nicho rende mais; gasto invisível | "Onde prospectar" compara cidades; custo de cada busca e de cada texto |
| Executor (quem entrega) | Entregar bem e rápido depois do "sim" | Retrabalho e textos genéricos | 4 etapas no mesmo cliente; textos do Perfil do Google prontos para colar |
| Dono que paga | Retorno e controle | Equipe gastando sem limite | Limites por pessoa, painel de gastos, escolha do modelo de IA |

## Problems & Pain Points
**Core problem:** Achar empresas locais que precisam de SEO e convencê-las a responder dá muito trabalho manual — e mensagem genérica é ignorada.
**Why alternatives fall short:**
- Garimpar o Google Maps à mão leva horas e não diz quem tem mais problema.
- Listas compradas trazem contato errado, desatualizado ou proibido pela LGPD.
- Ferramentas de disparo em massa queimam o número do WhatsApp.
- CRMs genéricos não sabem nada de Google Meu Negócio, não fazem diagnóstico nem proposta.
- Montar proposta e site de exemplo para cada lead toma uma tarde inteira.
**What it costs them:** Horas por semana de prospecção sem resposta; propostas que esfriam; número bloqueado; clientes que poderiam fechar indo para o concorrente que chegou primeiro.
**Emotional tension:** Medo de parecer spam; vergonha de mandar mensagem e ser ignorado; ansiedade com o fim do mês sem clientes novos.

## Competitive Landscape
**Direct:** Extratores de leads do Google Maps e planilhas de leads — dão a lista, mas não dizem quem tem problema, não escrevem a abordagem nem fazem proposta.
**Secondary:** Disparadores de WhatsApp e CRMs genéricos (RD, Pipedrive, planilha) — organizam ou disparam, mas mensagem em massa bloqueia o número e não há diagnóstico de SEO local.
**Indirect:** Fazer tudo à mão (Google Maps + Canva + Word) ou contratar um SDR — funciona, mas é lento e caro. [a confirmar: nomes de concorrentes diretos citados por clientes]

## Differentiation
**Key differentiators:**
- Diagnóstico de cada empresa com dados reais do Google (nota de oportunidade) antes do primeiro contato.
- Mensagem de WhatsApp escrita com o problema daquela empresa, com lembretes do 2º e do 5º dia — envio um a um, de propósito.
- Site de prévia e proposta com o nome da empresa, em minutos; o cliente aceita por um link.
- Validação de contato: CNPJ na Receita, quadro de sócios para achar quem decide.
- Feito para o celular e para o Brasil (WhatsApp, CNPJ, LGPD, reais).
- Custos de IA e de Google visíveis, com limites por pessoa.
**How we do it differently:** Junta prospecção, abordagem, proposta e entrega num só fluxo, na ordem em que a venda acontece.
**Why that's better:** Menos tempo por lead, mais respostas (porque a mensagem cita um problema real) e fechamento mais rápido (proposta com site no mesmo dia).
**Why customers choose us:** [a confirmar após os primeiros clientes]

## Objections
| Objection | Response |
|-----------|----------|
| "Vai bloquear meu WhatsApp?" | Não dispara em massa: cada mensagem sai do seu WhatsApp com um clique seu, com intervalo entre envios. |
| "Preciso entender de SEO?" | Não. O sistema aponta o que falta em linguagem simples e gera os textos da entrega. |
| "Os contatos do Google são desatualizados." | Dá para validar: site no ar, CNPJ ativo na Receita, sócios que decidem; contato inválido sai da fila. |
| "Quanto vou gastar?" | O custo de cada busca e de cada texto aparece no painel; o dono define limites por pessoa. |
| "Já uso planilha/CRM." | A API e o CSV levam os leads para o seu CRM; o app faz o que o CRM não faz: diagnóstico, mensagem e proposta. |

**Anti-persona:** Quem quer disparar mensagens em massa; quem vende para grandes empresas (o foco é comércio de bairro); quem não tem disposição para conversar com o cliente pelo WhatsApp.

## Switching Dynamics
**Push:** Horas no Google Maps sem saber por onde começar; mensagens ignoradas; número bloqueado por disparo; propostas montadas à mão.
**Pull:** Ver na hora quem tem mais problema; mensagem pronta e específica; proposta com site de prévia em minutos.
**Habit:** Planilha, prospecção "no feeling", mensagens copiadas e coladas.
**Anxiety:** Custo mensal antes de fechar o primeiro cliente; medo de parecer robô; dúvida se o contato é real.

## Customer Language
**How they describe the problem:** [a confirmar com entrevistas — hipóteses abaixo]
- "Não sei por onde começar a prospectar."
- "Mando mensagem e ninguém responde."
- "Tenho medo de tomar bloqueio no WhatsApp."
**How they describe us:** [a confirmar]
**Words to use:** clientes, cidade, Google, WhatsApp, diagnóstico, proposta, fechar, nota de oportunidade, site de prévia, "um por vez".
**Words to avoid:** "revolucionário", "inteligência artificial de ponta", "disparo", "automação de mensagens", "leads frios", jargão de SEO (SERP, NAP, citações) sem explicação, inglês desnecessário.
**Glossary:**
| Term | Meaning |
|------|---------|
| Nota de oportunidade | 0–100: quanto o perfil da empresa no Google está fraco; quanto maior, mais fácil vender |
| Onde prospectar | Comparação de cidades pelo índice de oportunidade de um nicho |
| Abordagem | Fila diária de WhatsApp: 1º contato, lembrete do 2º dia, último lembrete |
| Site de prévia | Página de exemplo da empresa, para mostrar na abordagem e na proposta |
| Proposta | Página com o nome da empresa, problemas, comparação com concorrentes, preço e botão "Aceitar" |
| Decisor | Quem decide na empresa (do quadro de sócios ou da conversa) |

## Brand Voice
**Tone:** Direto, confiante e prático — de quem já vendeu SEO local, não de quem vende software.
**Style:** Frases curtas, verbos de ação, português simples, exemplos concretos (nicho + cidade). Sem promessas de resultado garantido.
**Personality:** Prático, honesto, brasileiro, ágil, sem enrolação.

## Proof Points
**Metrics:** [a confirmar] Nenhuma métrica de resultado ainda. Dados verificáveis do produto: custo ≈ R$ 0,20 por busca de 20 empresas; num teste real em Jundiaí, 438 de 684 empresas salvas não tinham site próprio (64%).
**Customers:** [a confirmar] Uso interno da agência Melfee.
**Testimonials:** [a confirmar — não inventar]
**Value themes:**
| Theme | Proof |
|-------|-------|
| Achar quem precisa | Nota de oportunidade com dados públicos do Google; 64% sem site próprio no teste de Jundiaí |
| Ser respondido | Mensagem cita o problema real da empresa e o concorrente que aparece na frente |
| Fechar rápido | Proposta com nome da empresa + site de prévia + botão "Aceitar" |
| Sem bloqueio | Envio um a um, com intervalo de 45–90 s |
| Gasto sob controle | Custo por busca e por texto no painel; limites por pessoa |

## Goals
**Business goal:** [a confirmar] Validar o produto com os primeiros consultores pagantes além da agência.
**Conversion action:** Falar no WhatsApp para conhecer / pedir acesso (botão "Quero conhecer" da landing).
**Current metrics:** [a confirmar] Ainda sem dados de conversão.

## Changelog
*Newest first. One line per revision: what changed and why.*
- v1 (2026-10-11) — Initial context, rascunhado a partir do código, da landing page e das decisões do projeto.
