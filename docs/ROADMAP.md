# Próximas rodadas

Fila combinada para executar depois, na ordem. Cada item diz o objetivo, o que muda na tela, o que muda no banco e como saber que ficou pronto.

---

## 1. Pix na aceitação da proposta ⭐ (próximo)

**Objetivo:** transformar o "sim" em dinheiro na hora. Quem clica em **Aceitar proposta** já vê como pagar o teste de 30 dias.

**Na tela**
- ⚙️ Configurações → Comercial ganha: **chave Pix** (CPF/CNPJ, e-mail, celular ou aleatória), **nome do recebedor** (até 25 caracteres) e **cidade** (até 15 caracteres), que são exigidos pelo padrão do Pix.
- Na página pública da proposta (`/p/...`), depois do aceite:
  - QR Code Pix com o valor do teste.
  - Botão **"Copiar código Pix"** (copia e cola).
  - Texto "Depois de pagar, envie o comprovante no WhatsApp", com o link.
- Na etapa **3. Proposta** da Execução: status **Aceita → aguardando pagamento**, e o botão **"Marcar como pago"** (manual).

**Como fazer**
- Gerar o "Pix copia e cola" (BR Code / EMV) no servidor, com o campo do valor, o identificador da transação (`txid` = id da proposta) e o CRC16. É um texto estático: não depende de banco nem de API paga.
- O QR Code vira uma imagem (SVG gerado no servidor), já que a página pública não roda JavaScript.
- Converter o preço do texto ("R$ 497") em valor numérico; se não der, o Pix sai **sem valor** e o cliente digita.

**Banco:** `agency_settings.pix_key`, `pix_name`, `pix_city`; `proposals.paid_at`.

**Pronto quando:** o código gerado é aceito pelo app do banco (teste com R$ 0,01) e o QR abre com o valor certo. Testes de unidade cobrem o CRC e campos com acento ou espaço.

**Depois, opcional:** confirmação automática do pagamento via Mercado Pago ou Asaas (webhook), em vez do "Marcar como pago" manual.

---

## 2. Lembrete de proposta parada

**Objetivo:** nenhuma proposta morre esquecida.

- Proposta **enviada há 2 dias sem aceite** entra na fila de **📲 Abordagem**, na etapa "Proposta sem resposta", com uma mensagem pronta: "Conseguiu ver a proposta? Ficou alguma dúvida?".
- Mostra quantas vezes a proposta foi aberta: se abriu 3 vezes e não aceitou, há interesse, e a mensagem pergunta sobre preço.
- Um segundo lembrete no dia 5; depois disso, a proposta é marcada como "esfriou".

**Banco:** `proposals.followup_step`, `proposals.next_followup_at` (mesma regra de `lib/outreach.ts`).

---

## 3. Painel de vendas

**Objetivo:** ver o funil do mês num lugar só.

- Botão **💰 Vendas** no topo (só administrador), com contagem e valor de cada etapa: leads abordados → responderam → propostas enviadas → abertas → aceitas → pagas.
- **Valor mensal fechado (MRR)** e o valor dos testes recebidos.
- Taxa de conversão de cada etapa, por consultor.
- Custo do período (painel de Gastos) **x** receita: quanto custou, em Google e IA, cada cliente fechado.

---

## 4. Contrato simples

**Objetivo:** formalizar sem advogado em cada venda.

- Gerado a partir da proposta aceita, com o **nome da empresa**, o **CNPJ ou CPF** e o endereço (o cliente preenche na própria página da proposta), os serviços, os valores, o prazo do teste, a mensalidade, a forma de cancelar e o foro.
- Link público `/c/...` para leitura, com o botão **"Li e concordo"**, que registra data, hora e IP. O cliente salva em PDF pelo navegador.
- O modelo do texto fica editável em ⚙️ Configurações.

**Banco:** tabela `contracts` (proposal_id, data, accepted_at, accepted_ip).

---

## 5. Relatório mensal para o cliente

**Objetivo:** justificar a mensalidade todo mês e reduzir cancelamento.

- Link público `/r/...` por cliente, atualizado todo mês, mostrando o **antes e depois**: avaliações, nota, fotos, posição na busca "nicho em cidade" (consulta ao Google Places, que conta no limite do mês) e o que foi feito (posts, respostas a avaliações).
- Botão **📲 Enviar relatório no WhatsApp** na etapa 4 (Entrega).
- A foto inicial da empresa fica guardada quando a proposta é aceita, para servir de comparação.

**Banco:** tabela `client_snapshots` (client_id, taken_at, reviews, rating, rank, photos).

---

### Já entregue
- Radar com nota de oportunidade, "Onde prospectar" e projetos.
- Abordagem pelo WhatsApp com etapas, datas e envio em sequência com intervalo.
- Controle de gastos e limites por usuário, com pedido de mais buscas pelo WhatsApp.
- Escolha do modelo de IA (Rápido, Equilibrado, Premium) com o comparativo de custos.
- Execução em 4 etapas, com proposta pública e aceite.
