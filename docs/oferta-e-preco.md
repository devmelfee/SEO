# Oferta e preço

Duas ofertas convivem no projeto:

- **A.** O que vendemos aos consultores e agências: o **app**.
- **B.** O que o consultor vende para a empresa local, usando o app: o **serviço de SEO local**.

A segunda precisa ser forte para a primeira valer a pena. Se o consultor fecha clientes, o app se paga.

Base: `.agents/product-marketing.md` (contexto) e as skills `pricing` e `offers`. Tudo aqui é **aposta para aprender**. Ajuste com os primeiros 10 clientes, não antes.

---

## A. O app (para consultores e agências)

### Conta que sustenta o preço
- Um cliente de SEO local paga de R$ 500 a R$ 1.500 por mês, conforme Configurações › Comercial e a média do mercado. **Um único cliente fechado paga o app.**
- Custo real por uso, medido no painel de Gastos:
  - ≈ R$ 0,20 por busca de 20 empresas;
  - R$ 0,01 a R$ 1,20 por texto ou site de IA.
  - Um consultor ativo gasta de R$ 30 a R$ 60 por mês.
- Faixa da skill `pricing`: ferramenta de PME, perto de "US$ 100 por mês". **Nada de preço de R$ 29.** Atrai quem nunca vai vender e é difícil subir depois.

### Métrica de valor
**Buscas por mês** (1 busca = até 20 empresas analisadas), porque é o que escala com o valor: mais empresas analisadas, mais abordagens, mais clientes. Gerações de IA entram como cota generosa, não como cobrança principal.

### Planos (proposta v1)
| | **Solo** | **Agência** ⭐ | **Rede** |
|---|---|---|---|
| Para quem | Consultor sozinho | Agência com vendedor e executor | Várias equipes/cidades |
| Preço | **R$ 197/mês** | **R$ 397/mês** | **R$ 897/mês** |
| Pessoas | 1 | até 5 | até 15 |
| Buscas/mês | 100 (2.000 empresas) | 300 (6.000 empresas) | 1.000 (20.000 empresas) |
| IA | Rápido e Equilibrado | + Premium para sites | + Premium |
| Propostas, sites de prévia, abordagem | ilimitados | ilimitados | ilimitados |
| Limites por pessoa, painel de gastos | — | ✓ | ✓ |
| API e CSV para o CRM | — | ✓ | ✓ |
| Margem estimada | ~80% | ~80% | ~75% |

- **Buscas extras:** pacote de 100 por R$ 49.
- **Anual:** 2 meses grátis (≈17%).

### A oferta em volta do preço
| Componente | Proposta |
|---|---|
| **Nome** | "Agenda Cheia de SEO Local" (o plano é a ferramenta; a oferta é o resultado) |
| **Núcleo** | O app completo: buscar, abordar, propor, entregar |
| **Bônus** | 1) Sessão de 30 min montando a 1ª busca e as 20 primeiras mensagens juntos. 2) Modelos de mensagem e de proposta por nicho (pet shop, dentista, salão, oficina…). 3) Planilha de precificação do serviço para o cliente final. |
| **Garantia** | **"Primeira proposta em 7 dias ou devolvemos."** Se em 7 dias, usando o app, você não tiver mandado ao menos uma proposta, devolvemos o 1º mês. É uma garantia sobre algo que depende do uso, então é honesta e barata. |
| **Escassez real** | **Preço de fundador** para os **20 primeiros** clientes: o plano Agência por R$ 297/mês enquanto a assinatura estiver ativa. Quando acabar, acabou (contador real, nunca falso). |
| **Pagamento** | Mensal via Pix ou cartão. No começo, venda assistida pelo WhatsApp; o checkout automático fica para depois (ver `docs/ROADMAP.md`). |

### Proibido
Desconto para "conquistar" cliente, cronômetro falso, "vagas limitadas" sem limite, promessa de faturamento ("ganhe R$ 10 mil por mês").

### Como validar
1. Ofereça os planos para os 10 primeiros contatos e anote quem acha caro, quem acha barato e em qual plano cada um entra.
2. Se ninguém reclamar do preço em 10 conversas, suba o Solo para R$ 247.
3. Se o Solo concentrar mais de 70% das vendas, a diferença para o Agência está pequena: tire os limites por pessoa do Solo.

---

## B. O serviço que o consultor vende (padrão da proposta no app)

Antes, a proposta saía como "teste de 30 dias + mensalidade". Agora sai como uma **oferta completa**, já aplicada no app (etapa 3, Proposta):

| Componente | Padrão no app (editável) |
|---|---|
| **Nome** | "Plano Destaque no Google" |
| **Núcleo** | Perfil do Google completo, site com WhatsApp, 2–3 posts por semana, gestão de avaliações, relatório mensal |
| **Bônus visível** | O site de prévia **já feito**: o dono vê o site dele antes de pagar |
| **Garantia** | "Em 30 dias seu perfil estará completo, com o site no ar e as publicações começadas. Se não estiver, você não paga o teste." Garantia sobre a **entrega**, nunca sobre posição no Google, que ninguém controla. |
| **Urgência real** | Validade da proposta (7 dias por padrão). Os preços podem mudar e a análise dos concorrentes envelhece. |
| **Preço** | Teste de 30 dias + mensalidade sem fidelidade (de Configurações › Comercial) |
