# Perfil do Google: aplicar as sugestões sem copiar e colar

A etapa **Entrega** tem a fila **Perfil do Google**: cada sugestão da IA vira uma ação (descrição, serviços, site, posts agendados, respostas a avaliações, perguntas). Cada ação pode ser aplicada de dois jeitos:

- **Pela API**: um clique em "Aplicar no Google" muda o perfil. Exige a conexão abaixo.
- **Modo assistido**: "Copiar e abrir no Google" copia o texto e abre o painel do Google; depois você marca a ação como feita. Funciona sem configurar nada.

Toda ação aplicada guarda **quem aplicou, quando e o valor anterior**, para desfazer à mão se precisar. Os posts saem nas datas agendadas (segundas e quintas, 10h) pelo agendador diário.

## O que a API faz e o que não faz

| Ação | Pela API | Observação |
|---|---|---|
| Descrição | Sim | Até 750 caracteres |
| Serviços | Sim | Acrescenta aos que o dono já tinha; não apaga nenhum |
| Site no perfil | Sim | Só o site de outro app (link externo). A prévia `/s/…` não vai para o perfil |
| Posts | Sim | Com botão "Saiba mais" para o site, quando houver link externo |
| Responder avaliações | Sim | A IA escreve rascunhos; nada é publicado sem o clique em Aplicar |
| Perguntas e respostas | **Não** | O Google desligou essa API em 3/11/2025: só modo assistido |
| Nome, categoria, endereço | **Não, de propósito** | Mudança assim pode pedir nova verificação ou suspender o perfil |

## O que pedir ao cliente

1. **Adicionar a conta Google da agência como Gerente** do perfil (não como proprietário). No Google: *Perfil da Empresa › Menu › Acesso à empresa › Adicionar › e-mail da agência › Gerente*. Ele pode remover quando quiser.
2. **Autorização por escrito** para editar o perfil e publicar em nome dele (pode ir na proposta).
3. **Material**: logo, fotos reais, lista de serviços, horário certo.

## Configuração (uma vez, pelo administrador)

1. **Projeto no Google Cloud** (pode ser o mesmo da chave do Places).
2. **Pedir acesso à API do Perfil da Empresa.** No formulário de contato da API do Business Profile, escolha *"Application for Basic API Access"*, informe o número do projeto e use um e-mail que seja dono ou gerente de um perfil completo (com site). Enquanto não for aprovado, a cota fica em **0** e o app mostra o erro com essa explicação. A aprovação pode levar de dias a semanas.
3. **Ativar as APIs** depois de aprovado: *My Business Account Management*, *My Business Business Information*, *Google My Business API* (v4, posts e avaliações) e *Business Profile Performance*.
4. **Tela de consentimento OAuth** (tipo Externo) com o escopo `https://www.googleapis.com/auth/business.manage`. Enquanto o app não for verificado pelo Google, adicione a conta da agência como usuário de teste.
5. **Credencial OAuth** do tipo *Aplicativo da Web*, com o URI de redirecionamento `https://SEU-DOMINIO/api/google/callback`.
6. **Variáveis na Vercel** (veja `.env.example`): `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `GOOGLE_TOKEN_KEY` (texto longo e aleatório; não troque depois de conectar) e `CRON_SECRET`. Faça o redeploy.
7. **No app:** *Clientes › Entrega › Perfil do Google › Conectar conta Google* (só administrador). Depois, em cada cliente, *Escolher perfil*.

## Segurança

- O token do Google fica **cifrado** no banco (AES-256-GCM) e nunca volta para o navegador.
- Só o administrador conecta ou desconecta a conta.
- O agendador (`/api/cron/gbp`) só roda com o `CRON_SECRET`.

## Relatório do mês

O botão *Gerar relatório* soma os últimos 30 dias (visualizações, ligações, rotas, cliques no site, conversas) contra os 30 anteriores. Ele lista também o que foi aplicado no perfil no período e monta a mensagem para mandar ao cliente pelo WhatsApp. O Google publica as métricas com alguns dias de atraso, então a janela termina 3 dias antes de hoje.
