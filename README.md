# SEO Local Agency

App da agência para executar SEO local de ponta a ponta: configuração do cliente → auditoria com dados reais
do Google Maps → textos do perfil → avaliações → calendário de conteúdo → citações/schema → prospecção → relatório.

**Stack:** Next.js 14 (App Router) · Supabase (Postgres) · Claude (Anthropic) · Google Places API (New) · Vercel.

## Colocar no ar (uma vez)

1. **Banco:** no Supabase (projeto `bebjswervqdokkhpggro`) → SQL Editor → cole `supabase/setup.sql` → Run.
   O script é idempotente: pode rodar de novo sem quebrar nada.
2. **Credenciais:** na Vercel → projeto → Settings → Environment Variables, cadastre as variáveis de
   [`.env.example`](.env.example). As obrigatórias são `APP_PASSWORD`, `SESSION_SECRET`, `ANTHROPIC_API_KEY`,
   `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`. `GOOGLE_PLACES_API_KEY` liga a busca automática de concorrentes.
3. **Redeploy** (Deployments → ⋯ → Redeploy). Variáveis novas só valem depois disso.

No app, ⚙️ → **Conexões** mostra o que está ligado (sem nunca exibir as chaves).

## Rodar no computador

```bash
npm install
cp .env.example .env.local   # preencha
npm run dev                  # http://localhost:3000
npm test                     # testes das funções puras
npm run build                # o mesmo build da Vercel
```

## Segurança

- Todas as chaves ficam **só no servidor** (variáveis da Vercel). O navegador nunca vê nenhuma.
- O app inteiro exige a senha da equipe (`APP_PASSWORD`). Sem ela configurada, as rotas de API ficam bloqueadas.
- As tabelas têm RLS ligada e sem políticas: só o servidor (service_role) lê e grava.

## Estrutura

| Caminho | O quê |
|---|---|
| `lib/phases.ts` | Fases, prompts e regras (funções puras, com testes) |
| `components/` | Interface (SeoApp, PromptCard, modais) |
| `app/api/` | Rotas do servidor: `generate` (IA), `clients`, `settings`, `places`, `login`, `status` |
| `supabase/setup.sql` | Schema completo do banco |
| `middleware.ts` | Login da equipe |
