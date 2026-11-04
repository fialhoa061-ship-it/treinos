---
name: Treinos
description: Painel de treino escuro para professor e aluno, com números grandes em azul elétrico sobre grafite.
colors:
  accent: "#2f6bff"
  accent-hi: "#4a80ff"
  accent-tx: "#79a3ff"
  accent-ink: "#ffffff"
  danger: "#ff6b7d"
  bg: "#111214"
  s1: "#1c1d21"
  s2: "#25262b"
  s3: "#313238"
  s4: "#3c3d44"
  fg: "#f5f6f8"
  fg2: "#a4a6b0"
  fg3: "#8e919c"
typography:
  numeral:
    fontFamily: "Manrope, Segoe UI, system-ui, sans-serif"
    fontSize: "2.5rem"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "-0.03em"
    fontFeature: "tnum"
  headline:
    fontFamily: "Manrope, Segoe UI, system-ui, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Manrope, Segoe UI, system-ui, sans-serif"
    fontSize: "1.15rem"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Manrope, Segoe UI, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.45
    fontFeature: "tnum"
  label:
    fontFamily: "Manrope, Segoe UI, system-ui, sans-serif"
    fontSize: "0.82rem"
    fontWeight: 600
    lineHeight: 1.3
rounded:
  sm: "12px"
  md: "18px"
  lg: "24px"
  xl: "30px"
  pill: "999px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "14px"
  lg: "16px"
  xl: "20px"
components:
  button:
    backgroundColor: "{colors.s3}"
    textColor: "{colors.fg}"
    rounded: "{rounded.pill}"
    padding: "0 20px"
    height: "48px"
  button-hover:
    backgroundColor: "{colors.s4}"
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-ink}"
    rounded: "{rounded.pill}"
    padding: "0 20px"
    height: "48px"
  button-primary-hover:
    backgroundColor: "{colors.accent-hi}"
  button-block:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-ink}"
    rounded: "{rounded.pill}"
    height: "58px"
    width: "100%"
  icon-button:
    backgroundColor: "{colors.s2}"
    textColor: "{colors.fg}"
    rounded: "{rounded.pill}"
    size: "46px"
  chip:
    backgroundColor: "{colors.s2}"
    textColor: "{colors.fg}"
    rounded: "{rounded.pill}"
    padding: "0 16px"
    height: "44px"
  chip-on:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-ink}"
  panel:
    backgroundColor: "{colors.s1}"
    rounded: "{rounded.xl}"
    padding: "20px"
  list-item:
    backgroundColor: "{colors.s2}"
    textColor: "{colors.fg}"
    rounded: "{rounded.lg}"
    padding: "12px 14px 12px 12px"
    height: "72px"
  input:
    backgroundColor: "{colors.s2}"
    textColor: "{colors.fg}"
    rounded: "{rounded.md}"
    padding: "14px 16px"
    height: "52px"
  tabbar:
    backgroundColor: "{colors.s1}"
    textColor: "{colors.fg3}"
    rounded: "28px"
    height: "72px"
---

# Design System: Treinos

## Overview

**Creative North Star: "O Painel de Instrumentos"**

O treino lido como um painel de instrumentos escuro: grafite em camadas tonais, um único azul elétrico e números grandes que se leem de relance entre uma série e outra. Cada tela se comporta como um app nativo de academia no celular: coluna única de 480px, alvos de toque de 46 a 58px, pills, cartões muito arredondados e uma barra de abas flutuante com um + azul central.

A densidade é baixa e o ritmo, previsível: cartões grafite sobre fundo quase preto, linhas internas um tom acima, controles mais um tom acima. A profundidade vem do tom, não da sombra. O azul é reservado a progresso, estado ativo e ação principal; tudo o mais é neutro.

O sistema recusa o "glass" decorativo e o painel administrativo de tabelas. A tela de login é a única tela com foto: imagem em tela cheia e uma folha de vidro fosco embaixo (estilos em app/login/login.css). Ali o vidro é justificado porque há uma foto atrás; botão principal branco com seta em círculo escuro.

**Key Characteristics:**
- Escuro, tonal, quatro degraus de superfície (s1 a s4) sobre o fundo.
- Um acento só: azul elétrico em preenchimento, azul claro em texto.
- Números tabulares grandes como protagonistas (séries, carga, timer, código).
- Formas cheias: pills 999px e cartões 24 a 30px.
- Ícones SVG próprios, traço único 1.75, cor herdada.

## Colors

Grafite neutro em degraus tonais com um único acento azul elétrico.

### Primary
- **Azul Elétrico** (accent): preenchimento de ação principal, pill ativa, barra de progresso, série marcada, número do treino, FAB da barra inferior, card de conclusão e tela de abertura.
- **Azul Elétrico Aceso** (accent-hi): hover de tudo que é preenchido com o acento; também o traço da linha no gráfico de carga.
- **Azul de Leitura** (accent-tx): o acento quando é texto ou ícone sobre grafite: números grandes, valores do trio, links, ícones ativos, anel de foco. Contraste legível onde o azul cheio não seria.
- **Tinta sobre Azul** (accent-ink): texto e ícone sobre preenchimento azul.

### Secondary
- **Coral de Alerta** (danger): somente ações destrutivas (excluir, arquivar), sobre fundo coral a 12% (hover 20%).

### Neutral
- **Grafite Profundo** (bg): fundo da página e "recorte" ao redor do FAB e do ponto de online.
- **Grafite 1** (s1): cartões (panel), barra de abas, timer flutuante.
- **Grafite 2** (s2): linhas de lista, campos, chips em repouso, botão soft, botão de ícone.
- **Grafite 3** (s3): botões padrão, avatares, controles dentro de linhas, hover de s2.
- **Grafite 4** (s4): hover de s3, borda do dia de hoje, borda tracejada de "adicionar".
- **Branco Gelo** (fg): texto principal.
- **Cinza Médio** (fg2): texto secundário, legendas, subtítulos.
- **Cinza Baixo** (fg3): placeholder, abas inativas, cabeçalhos de coluna, dias da semana.
- Divisórias internas: branco a 8% (`rgba(255,255,255,.08)`). Tintas do acento: 14% a 20% (`rgba(47,107,255,.14–.2)`) para avisos de subir carga, tags azuis e dias com treino.

### Named Rules
**The One Voice Rule.** Existe um acento só. Sucesso também é azul (`--ok` aponta para o azul de leitura); não há verde nem uma segunda cor de marca. Coral aparece apenas em ações destrutivas.

**The Fill vs. Read Rule.** Azul cheio (accent) é superfície; azul claro (accent-tx) é texto e ícone. Nunca texto em accent sobre grafite.

**The Contrast Lift Rule.** Com `prefers-contrast: more`, fg2, fg3 e s2 sobem de tom; novos tokens neutros devem entrar nesse bloco.

## Typography

**Display Font:** Manrope (via next/font, `--font-manrope`), com Segoe UI e system-ui
**Body Font:** Manrope, mesma pilha

**Character:** Uma família só, geométrica e firme; o peso faz a hierarquia (400 corpo, 600 rótulos e botões, 700 títulos, 800 numerais de controle). Algarismos tabulares em todo o app para que cargas, séries e o timer não "dancem".

### Hierarchy
- **Numeral** (700, 2.5rem, 1, -0.03em): o número grande do cartão (séries feitas), em azul de leitura, com unidade em `small` 1rem fg2. Variantes: timer 2rem/800, dígitos do código `clamp(1.6rem, 8vw, 2.2rem)`/800.
- **Headline** (700, 1.75rem, 1.15, -0.025em, `text-wrap: balance`): título da tela no topo. Card de conclusão 1.7rem.
- **Title** (700, 1.1 a 1.25rem, 1.25): cabeçalhos de cartão, de seção e de exercício.
- **Body** (400, 16px, 1.45): texto corrido; notas e descrições a 0.9rem em fg2, `max-width` 30 a 32ch em estados vazios e conclusão.
- **Label** (600, 0.82rem): rótulos de campo, metadados de linha (0.84rem), tags (0.82rem), abas (0.7rem).

### Named Rules
**The Tabular Rule.** `font-variant-numeric: tabular-nums` vale para todo o app; números que mudam nunca usam algarismos proporcionais.

**The Weight Ladder Rule.** Hierarquia por peso e tamanho dentro de Manrope; não introduza segunda família.

## Layout

Coluna única centrada, `max-width: 480px`, padding lateral 16px, topo `max(18px, safe-area)`, rodapé de 132px para liberar a barra de abas ou o timer. Pilha vertical com gap de 14px entre blocos; dentro de cartões, 12 a 16px; listas com 8px entre linhas. Grades internas em 2 e 3 colunas (`minmax(0,1fr)`, gap 10px) para campos; a grade de séries é 52px / 1.6fr / 1fr. Pills roláveis horizontalmente sangram até a borda da tela (margem -16px). Elementos fixos (barra de abas, timer) flutuam a 12px das bordas com `max-width: 456px` e respeitam a safe area inferior. O desktop mantém a mesma coluna; não há layout de largura total.

## Elevation & Depth

Plano e tonal: a profundidade é dada pelos degraus bg, s1, s2, s3, s4, e cada nível interno fica um tom acima do seu contêiner (dentro de uma linha s2, os campos passam a s3). Sombras existem apenas em elementos flutuantes fixos sobre o conteúdo.

### Shadow Vocabulary
- **Flutuante** (`box-shadow: 0 10px 30px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.05)`): barra de abas. O timer usa a versão mais funda (`0 14px 36px rgba(0,0,0,.55), inset 0 1px 0 rgba(255,255,255,.06)`).
- **Brilho do FAB** (`box-shadow: 0 10px 24px rgba(47,107,255,.35), 0 0 0 6px var(--bg)`): o + central, com anel do fundo que o "recorta" da barra.

### Named Rules
**The Flat-In-Flow Rule.** Nada que rola com a página tem sombra. Sombra é só para o que flutua fixo.

**The Step-Up Rule.** Hover sobe um degrau de superfície (s2 para s3, s3 para s4); não use brilho, borda ou sombra para hover.

## Shapes

Formas cheias e macias. Ações e seleções são pills (999px) ou círculos (avatares, botões de ícone, marcador de série, passos de carga). Contêineres seguem uma escala decrescente: cartão 30px, linha de lista e linha de exercício 24px, campos e mídia 18px, histórico 12px; o "+ adicionar" usa borda tracejada 1.5px em s4. Blocos numéricos são quadrados arredondados (52px, raio 16px; 46px, raio 14px na lista de exercícios); botões de ícone quadrados 34px, raio 10px. Bordas só existem como foco (1.5px accent), divisória (1px branco 8%) ou tracejado de adicionar.

## Components

### Buttons
Cheios, grandes, sem borda.
- **Shape:** pill (999px), altura 48px; `block` 58px em largura total; `sm` 40px.
- **Padrão:** s3 com texto fg, 600, 0.95rem; hover s4; ativo `scale(.97)`; desabilitado opacidade .5.
- **Primary:** azul elétrico com texto branco; hover azul aceso.
- **Soft:** s2, hover s3. **Danger:** coral 12% com texto coral.
- **Botão de ícone:** círculo 46px em s2 (ativo `scale(.93)`); variante quadrada 34px raio 10px em s3, usada como chevron que gira 90° ao abrir.
- **Movimento:** `cubic-bezier(.22,1,.36,1)` (--ease), .25s em transform, .2s em cor.

### Chips
- **Style:** pills 44px em s2, 600, preenchem a linha (`flex: 1 0 auto`) e rolam horizontalmente sem barra.
- **State:** ativa em azul elétrico com texto branco. **Tags** são pills de 28px em s3 (0.82rem), variante azul a 18% com texto azul de leitura.

### Cards / Containers
- **Corner Style:** 30px (panel); 24px para linhas internas.
- **Background:** s1 para cartões; s2 para linhas dentro deles.
- **Shadow Strategy:** nenhuma (ver Elevation & Depth).
- **Border:** nenhuma; divisórias internas 1px branco 8%.
- **Internal Padding:** 20px (14px na variante compacta).

### Inputs / Fields
- **Style:** s2, 52px de altura, raio 18px, padding 14px 16px, borda 1.5px transparente; rótulo acima em 0.82rem/600 fg2.
- **Focus:** borda 1.5px azul elétrico; hover sobe para s3. Select com chevron SVG próprio (traço 1.75).
- **Carga:** pill 52px com botões − e + circulares de 40px e valor central 1.2rem/700; borda azul em `:focus-within`.

### Navigation
- **Barra de abas:** cápsula flutuante s1, 72px, raio 28px, cinco colunas; abas 0.7rem/600 em fg3, ativa em fg com ícone azul de leitura.
- **FAB:** círculo azul 60px, elevado 14px acima da barra, ícone + 28px.
- **Topo:** botão de voltar circular, título headline e subtítulo fg2; avatar de iniciais 48px em s3 com ponto azul de online.

### Signature Components
- **Medidor:** numeral grande + barra de 12px (s3, preenchimento azul via `clip-path`, transição .6s).
- **Trio:** três valores em colunas com divisórias de 8%, rótulo 0.78rem fg2 e valor 700 em azul de leitura.
- **Marcador de série:** círculo 52px em s3 com o número; marcado vira azul com check e `scale(1.04)`.
- **Timer de descanso:** pill flutuante s1 fixa no rodapé, contagem 2rem/800 em azul de leitura.
- **Card de conclusão:** cartão inteiro em azul elétrico, selo circular com miolo bg, trio em branco e botão bg; entra com `pop` (.7s, scale .94).
- **Código de acesso:** seis células s2 (4:5, raio 16px), dígitos 800.
- **Gráfico de carga:** SVG com linha 3.5px azul aceso, área em degradê azul 32% a 0 e pontos com miolo s1 e anel azul de leitura.
- **Aviso (flash):** pill s2 com ponto azul e check, entra deslizando 8px.

## Do's and Don'ts

### Do:
- **Do** subir um degrau de superfície por nível de aninhamento e por hover (s1, s2, s3, s4).
- **Do** usar azul elétrico (accent) para preenchimentos e azul de leitura (accent-tx) para texto, ícones e foco.
- **Do** manter alvos de toque de 44px no mínimo (botões 48px, ação principal 58px, marcador de série 52px).
- **Do** desenhar novos ícones no set de `app/Icon.tsx`: 24×24, traço 1.75, pontas e junções arredondadas, `currentColor`.
- **Do** usar pills (999px) para ações e seleções e a escala 30/24/18/12px para contêineres.
- **Do** respeitar `prefers-reduced-motion` (sem animação nem transição) e `prefers-contrast: more`.

### Don't:
- **Don't** usar vidro, `backdrop-filter` ou degradês decorativos fora da tela de login (onde existem só por causa da foto de fundo).
- **Don't** introduzir uma segunda cor de acento, verde de sucesso ou o verde-limão da referência.
- **Don't** pôr sombra em cartões e linhas que rolam com a página.
- **Don't** montar telas como tabela administrativa; listas são linhas arredondadas com avatar ou número e chevron.
- **Don't** usar ícones de pacote, emoji ou glifos de texto no lugar dos ícones SVG próprios.
