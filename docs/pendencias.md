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

## Perfil do Google (automação das correções)
- [ ] **Pedir ao Google o acesso à API do Perfil da Empresa** ("Application for Basic API Access"). Sem a aprovação, a fila funciona só no modo assistido. Passo a passo em `docs/perfil-google.md`.
- [ ] **Criar a credencial OAuth** e cadastrar `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `GOOGLE_TOKEN_KEY` e `CRON_SECRET` na Vercel.
- [ ] **Incluir na proposta a autorização** para a agência editar o perfil e publicar em nome do cliente.
- [ ] **Fotos pela API** (hoje no modo assistido): precisa de envio de arquivo do cliente.
- [ ] **Domínio do site pela Vercel**: fora do escopo por decisão do dono. O site completo vem de outro app (opção "Link externo").

## Produto (do ROADMAP)
- [ ] **Pagamento por Pix** e checkout automático (ver `docs/ROADMAP.md`).
- [ ] **Depoimentos e casos reais** na landing, assim que existirem clientes com resultado. Nunca inventar.
