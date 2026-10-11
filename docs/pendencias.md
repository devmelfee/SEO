# Pendências

Itens opcionais que ficaram de fora das últimas entregas, para executar depois. Ao concluir um item, marque `[x]` e anote o commit.

## Decisões do dono (bloqueiam publicação)
- [ ] **Aprovar os preços** de `docs/oferta-e-preco.md` e publicá-los: trocar `PRICING_PUBLISHED` para `true` em `app/apresentacao/page.tsx`.
- [ ] **Decidir a oferta de fundador** (Agência por R$ 297 para os 20 primeiros). É compromisso comercial. Se entrar, precisa de um contador real de vagas.
- [ ] **Revisar os itens [a confirmar]** em `.agents/product-marketing.md` (personas, preços praticados, objeções reais).

## Configuração
- [ ] **ANTHROPIC_API_KEY na Vercel.** Sem ela, o botão "Gerar com IA" do site de prévia e os textos de IA não funcionam.
- [ ] **Atualizar o endereço do repositório remoto.** O GitHub avisou que ele mudou para `https://github.com/devmelfee/SEO.git`:
      `git remote set-url origin https://github.com/devmelfee/SEO.git`

## Design (impeccable)
- [ ] **Modo de visualização no navegador** (`/impeccable live`): permite escolher alternativas de um elemento lado a lado. Precisa do app rodando com Supabase (variáveis de ambiente locais).
- [ ] **Arquivo `.impeccable/design.json`** (complemento do `DESIGN.md` para o painel do modo live). Gerar junto com o item acima.
- [ ] **Como começar páginas novas** (por imagem ou direto no código). Só se houver gerador de imagens disponível. Hoje é direto no código.

- [ ] **Fonte do app.** O detector do impeccable aponta Inter como fonte batida. Ela também não é carregada: no celular, cai na fonte do sistema. É opcional escolher uma fonte própria e carregá-la (por exemplo via `next/font`). Mudar a fonte muda o `DESIGN.md`.
- [x] **Botão de tema claro/escuro**, feito junto com o `DESIGN.md` (`components/ThemeToggle.tsx`).

## Produto (do ROADMAP)
- [ ] **Pagamento por Pix** e checkout automático (ver `docs/ROADMAP.md`).
- [ ] **Depoimentos e casos reais** na landing, assim que existirem clientes com resultado. Nunca inventar.
