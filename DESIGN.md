---
name: SEO Local (marca da agência)
description: Ferramenta de campo para achar, abordar e fechar clientes de SEO local pelo WhatsApp.
colors:
  field-teal: "#0F766E"
  field-teal-deep: "#115E59"
  teal-wash: "#F0FDFA"
  teal-mist: "#CCFBF1"
  ink: "#0F172A"
  slate-body: "#334155"
  slate-muted: "#64748B"
  slate-faint: "#94A3B8"
  paper: "#F6F7F9"
  panel: "#FFFFFF"
  panel-soft: "#F1F5F9"
  well: "#EEF2F6"
  line: "#E2E8F0"
  line-strong: "#CBD5E1"
  link-blue: "#1D4ED8"
  ok-green: "#047857"
  warn-amber: "#B45309"
  alert-red: "#B91C1C"
typography:
  page-title:
    fontFamily: "Inter, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "20px"
    fontWeight: 700
    lineHeight: 1.3
  card-title:
    fontFamily: "Inter, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "15px"
    fontWeight: 700
  body:
    fontFamily: "Inter, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Inter, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "13px"
    fontWeight: 600
  input:
    fontFamily: "Inter, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "16px"
    fontWeight: 400
rounded:
  control: "8px"
  segment: "10px"
  card: "12px"
  modal: "16px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.field-teal}"
    textColor: "{colors.panel}"
    rounded: "{rounded.control}"
    padding: "9px 14px"
    height: "38px"
  button-primary-hover:
    backgroundColor: "{colors.field-teal-deep}"
  button-secondary:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.slate-body}"
    rounded: "{rounded.control}"
    padding: "9px 14px"
    height: "38px"
  input-text:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "11px 13px"
  card:
    backgroundColor: "{colors.panel}"
    rounded: "{rounded.card}"
  nav-item-active:
    backgroundColor: "{colors.teal-wash}"
    textColor: "{colors.field-teal}"
    rounded: "{rounded.control}"
---

# Design System: SEO Local

Este arquivo descreve o visual do **app** (as telas de quem usa). Duas superfícies têm mundo próprio e estão no fim: a landing `/apresentacao` e o **site de prévia** gerado para a empresa cliente.

## Overview

**Creative North Star: "A prancheta de campo"**

O app é a prancheta de quem vende SEO local na rua, entre uma visita e outra, no celular e com uma mão. Ele precisa ser lido no sol, mostrar uma ação por vez e não parecer software corporativo nem site gerado por IA.

A hierarquia vem do texto e do espaço, não de enfeite. A tela é clara e quase neutra (papel cinza-claro, cartões brancos, texto em ardósia). A cor de destaque, um verde-azulado sóbrio, aparece só onde existe uma ação ou um estado ativo.

A densidade é média: cada perfil (quem vende, quem analisa, quem entrega) entra direto no que precisa fazer. Números e tabelas aparecem só onde decidem algo.

**Key Characteristics:**
- Claro, plano e legível no sol. Sombra só em modal e no item selecionado.
- Uma cor de ação (verde-azulado `#0F766E`). Verde, âmbar e vermelho só para estado.
- Mobile first: barra inferior com 4 destinos no celular e topo com abas no computador.
- Componentes firmes e discretos: cantos de 8 a 12 px, bordas de 1 px.
- Tema claro por padrão e escuro por escolha de quem usa (ver Colors).

## Colors

A paleta é neutra e fria, com um único acento quente de ação. Ela parece papel e tinta, não tela de painel.

### Primary
- **Verde de campo** (#0F766E): botão principal, item ativo da navegação, foco (contorno de 2 px), números de etapa. É a cor de "faça isto agora".
- **Verde de campo fundo** (#115E59): hover do botão principal.
- **Lavado verde** (#F0FDFA) e **Névoa verde** (#CCFBF1): fundo do item ativo, linha selecionada de tabela, ícone de confirmação.

### Neutral
- **Tinta** (#0F172A): títulos e texto principal.
- **Ardósia** (#334155): corpo de texto e rótulos.
- **Ardósia apagada** (#64748B): legendas, abas inativas, texto de apoio.
- **Ardósia leve** (#94A3B8): placeholder e notas de rodapé (nunca texto que precisa ser lido).
- **Papel** (#F6F7F9): fundo da página.
- **Painel** (#FFFFFF), **Painel suave** (#F1F5F9), **Poço** (#EEF2F6): cartões, blocos internos e o trilho dos controles segmentados.
- **Linha** (#E2E8F0) e **Linha forte** (#CBD5E1): bordas de cartão e de campo.

### Estado (não é acento)
- **Verde ok** (#047857): confirmado, aceito, no ar.
- **Âmbar aviso** (#B45309): precisa de atenção, sem WhatsApp, não verificável.
- **Vermelho alerta** (#B91C1C): inválido, fechado, erro.
- **Azul de link** (#1D4ED8): só links de texto.

### Tema escuro (escolha de quem usa)
O tema escuro troca os mesmos papéis, sem mudar a estrutura. O fundo é **Noite de campo** (#0B1215), os painéis são #111A1F e #16222A e as linhas são #243238. O texto vai em #E6EDF0, #C2CDD3 e #8FA0A8. O acento clareia para #2DD4BF, com texto escuro (#042F2E) sobre ele. Os estados viram verde #34D399, âmbar #FBBF24, vermelho #F87171 e link #93C5FD. Também há laranja #FB923C e rosa #F472B6, que no claro são #C2410C e #BE185D (nota alta e status "respondeu"). O botão de sol/lua fica no topo, ao lado de Ajustes (`components/ThemeToggle.tsx`). A escolha fica salva no navegador, e sem escolha segue o tema do sistema. Todas as cores vivem como variáveis em `app/globals.css` (`:root` e `[data-theme="dark"]`), e os componentes usam `C.*` de `components/styles.ts`. **Nunca escreva hex direto num componente**: crie ou use um token.

### Named Rules
**A Regra da Cor de Ação.** O verde-azulado marca só ação ou estado ativo, nunca decoração. Se um elemento é verde-azulado, tocar nele faz algo ou ele mostra onde você está.

**A Regra do Estado com Palavra.** Verde, âmbar e vermelho sempre vêm acompanhados de texto ("contato confirmado", "sem WhatsApp"). A cor nunca carrega o significado sozinha.

## Typography

**Fonte:** Inter (com system-ui, -apple-system e Segoe UI de reserva) em todo o app.

**Character:** uma família só, trabalhada por peso e tamanho. Neutra e legível, sem personalidade de marca, porque a marca é a da agência que usa o app.

### Hierarchy
- **Título de página** (700, 20 px; 18 px no celular): um por tela.
- **Título de cartão** (700, 15 px): nome da seção dentro de um cartão.
- **Corpo** (400, 13,5 a 14 px, altura 1,5): listas, detalhes e mensagens.
- **Rótulo** (600, 13 px): rótulos de campo, abas e botões.
- **Campo** (16 px no celular): impede o zoom automático do iPhone.
- **Legenda** (400, 12,5 px, ardósia apagada): ajuda abaixo de campos.

### Named Rules
**A Regra do Peso, Não do Tamanho.** A hierarquia dentro de um cartão se resolve com peso (600/700) e cor (tinta contra ardósia), não com tamanhos novos. Tamanho novo só se a tela ganhar um nível novo.

## Layout

- **Contêiner:** largura máxima de 1120 px (1000 px em tela de coluna única), com 16 px de margem lateral (12 px no celular).
- **Computador:** topo fixo com marca, abas e ações. Nas etapas de execução há uma barra lateral de 200 px.
- **Celular (até 820 px):** as abas do topo somem e entra a **barra inferior** de 4 destinos (alvos de 52 px), que respeita a área segura do iPhone. A barra lateral vira uma grade de 4 etapas no topo, e os botões de ação de um lead ocupam metade da largura cada.
- **Ritmo:** espaços de 4, 8, 12, 16 e 24 px. Gap de cartão 10 a 16 px.
- **Uma ação por tela:** cada tela tem um botão principal visível sem rolar.

## Elevation & Depth

O app é plano. A profundidade vem de camadas de tom (papel, painel, poço) e de bordas de 1 px. Sombra aparece em dois casos:
- **Segmento selecionado** (`box-shadow: 0 1px 2px #0F172A1A`): a aba ativa do controle segmentado.
- **Modal** (`box-shadow: 0 20px 50px #0F172A33`): sobre o véu `#0F172A80`.

**A Regra do Plano por Padrão.** Cartões não têm sombra. Se algo precisa se destacar, use borda verde-azulada ou fundo lavado, não sombra.

## Shapes

Os cantos são levemente arredondados e a escala é fixa: 8 px para controles (botão, campo, aba), 10 px para o trilho segmentado, 12 px para cartões e 16 px para modal. No celular, o modal ocupa a tela inteira sem cantos. Selo da marca: quadrado de 30 px com 8 px de canto. As bordas são sempre de 1 px, e uma borda mais grossa (2 px) indica destaque.

## Components

### Buttons
- **Shape:** cantos de 8 px, altura mínima de 38 px (44 px ou mais nas ações principais do celular).
- **Primary:** fundo verde de campo e texto branco, 600, 13 a 14,5 px, padding 9×14 px.
- **Hover / Focus:** o fundo escurece para #115E59. O foco é um contorno verde-azulado de 2 px com 2 px de folga, sempre visível com o teclado.
- **Secundário:** fundo branco, texto ardósia e borda de 1 px #E2E8F0.
- **Fantasma:** fundo transparente com texto apagado, para "Remover" e "Cancelar".
- **Desabilitado:** opacidade 0,55 e cursor de bloqueado.

### Chips
- Filtro horizontal com rolagem, sem barra visível. O selecionado usa fundo lavado e texto verde-azulado. Buscas favoritas aparecem como chips.

### Cards / Containers
- **Corner Style:** 12 px.
- **Background:** painel branco sobre o papel.
- **Shadow Strategy:** nenhuma (ver Elevation).
- **Border:** 1 px #E2E8F0.
- **Internal Padding:** 14 a 18 px. Um bloco interno usa painel suave.

### Inputs / Fields
- **Style:** fundo branco, borda 1 px #CBD5E1, cantos de 8 px, padding 11×13 px, texto de 16 px.
- **Focus:** contorno verde-azulado de 2 px.
- **Placeholder:** #94A3B8. O rótulo fica sempre acima, nunca só o placeholder.

### Navigation
- **Topo (computador):** abas de texto 600/14 px, ardósia apagada. A aba ativa tem fundo lavado e texto verde-azulado.
- **Barra inferior (celular):** 4 destinos (Buscar, Abordagem, Clientes, Mais), com ícone e rótulo de 11 px. O ativo tem fundo lavado e texto verde-azulado.
- **Controle segmentado:** trilho cinza (#EEF2F6) com a aba ativa branca e sombra leve. Serve para trocar visões dentro da mesma tela.

### Linha de lead (signature)
É a lista de empresas com a **nota de oportunidade** (0 a 100) à esquerda e o nome com o motivo principal no centro. As ações (WhatsApp, Validar contato, Proposta) aparecem ao abrir a linha. O selo de contato ("contato confirmado", "sem WhatsApp") usa a cor de estado com palavra.

## Do's and Don'ts

### Do:
- **Do** usar o verde-azulado (#0F766E) só em ação e estado ativo.
- **Do** manter um botão principal por tela, visível sem rolar no celular.
- **Do** usar ícones em SVG desenhados e rótulos de texto ao lado.
- **Do** escrever o estado em palavras junto da cor.
- **Do** testar cada tela em 390 px de largura e no tema escuro.

### Don't:
- **Don't** criar visual de site feito por IA: gradiente em texto ou fundo de seção, emoji como ícone, cartões iguais em grade como estrutura da página, frases genéricas.
- **Don't** fazer painel corporativo pesado: tabelas densas como tela principal, menu lateral longo, muitos números na mesma tela.
- **Don't** pôr sombra em cartão nem borda colorida grossa na lateral.
- **Don't** usar ardósia leve (#94A3B8) em texto que precisa ser lido.
- **Don't** pôr título pequeno acima do título (eyebrow).

## Superfícies com mundo próprio

### Landings (`/apresentacao`, `/apresentacao/semana`, `/apresentacao/mapa`, `/aparecer-no-google`)
O mesmo verde-azulado e as mesmas regras do app, com escala de página de venda. O CSS fica em `components/landing/lp.css`, com tokens próprios no `.lp` e tema sempre claro.
- **Letras:** títulos em **Bricolage Grotesque**, com corte de largura 95 e espaçamento de −0,02em, como letreiro de comércio de bairro. Texto em **Onest**. As duas fontes são servidas pelo app via `next/font`. Títulos de 34 a 62 px.
- **Mapa:** é o elemento que aparece em todas as páginas. É um SVG com quadras, avenidas e rio em tons de verde-cinza (#E9EFEE, #DCE5E3, #A7D8D2). Os pinos têm a cor da nota: laranja (#C2410C) para alta, âmbar para média e ardósia para baixa. As empresas são fictícias e isso é sempre dito na página.
- **Contas:** os números grandes ficam em tinta (#0F172A) para o consultor e em marrom (#7C2D12) para a perda do dono. Toda suposição pode ser editada na tela e vem marcada como estimativa.
- **Busca simulada:** imita de propósito a tela de resultados do Google (Arial, azul de link do Google). É a única exceção de fonte e cor, para o dono reconhecer a busca dele.
- **Provas:** prints reais do app com dados de exemplo (`public/apresentacao/*.webp`), em moldura de celular. Resultados de exemplo levam o selo "Exemplo ilustrativo". Depoimentos só entram quando forem reais.

### Site de prévia (para a empresa cliente)
Tem outro mundo, porque representa a empresa e não o app:
- fundo creme (#faf7f2) e branco;
- títulos em serifa (Georgia);
- uma cor de destaque escolhida por nicho;
- barra fixa Ligar/WhatsApp no celular.

O modelo está em `lib/site.ts` (`buildSiteHtml`). Os sites gerados com IA seguem o mesmo pedido de estilo (`buildSitePrompt`).
