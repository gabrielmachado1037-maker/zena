---
name: Nexvel
description: Sistema de aderência e retenção por gamificação — grafite profundo, verde de evolução.
colors:
  evo: "#7CFF5B"
  evo-2: "#70F570"
  on-evo: "#08130A"
  success: "#53F27C"
  water: "#49A8FF"
  streak: "#FF8A1F"
  gold: "#F8C84B"
  warn: "#FFD34D"
  sleep: "#8B7DFF"
  danger: "#FF5D5D"
  brand: "#7C3AED"
  bg: "#09090B"
  surface: "#111318"
  elevated: "#171A22"
  container: "#1C212B"
  container-low: "#14171E"
  container-high: "#232A35"
  on-surface: "#F8FAFC"
  on-surface-variant: "#9CA3AF"
  outline: "#6B7280"
  border: "#2A2F38"
  league-bronze: "#C77B3C"
  league-silver: "#C2C9D2"
  league-gold: "#F8C84B"
  league-diamond: "#8FE3FF"
  league-master: "#A855F7"
  league-legendary: "#F8C84B"
typography:
  display:
    fontFamily: "Inter, sans-serif"
    fontSize: "48px"
    fontWeight: 800
    lineHeight: "56px"
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Inter, sans-serif"
    fontSize: "32px"
    fontWeight: 700
    lineHeight: "40px"
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Inter, sans-serif"
    fontSize: "24px"
    fontWeight: 600
    lineHeight: "32px"
    letterSpacing: "normal"
  body:
    fontFamily: "Inter, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: "24px"
    letterSpacing: "normal"
  label:
    fontFamily: "Inter, sans-serif"
    fontSize: "12px"
    fontWeight: 600
    lineHeight: "16px"
    letterSpacing: "0.05em"
rounded:
  sm: "10px"
  md: "14px"
  lg: "20px"
  xl: "28px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
components:
  button-primary:
    backgroundColor: "{colors.evo}"
    textColor: "{colors.on-evo}"
    rounded: "{rounded.md}"
    padding: "0 20px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.evo-2}"
  button-surface:
    backgroundColor: "{colors.container-high}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.md}"
    padding: "0 20px"
    height: "44px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.on-surface-variant}"
    rounded: "{rounded.md}"
    padding: "0 20px"
    height: "44px"
  chip:
    backgroundColor: "{colors.container-high}"
    textColor: "{colors.on-surface-variant}"
    rounded: "{rounded.full}"
    padding: "4px 10px"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.lg}"
    padding: "20px"
  input:
    backgroundColor: "{colors.container}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.sm}"
    padding: "10px 12px"
---

# Design System: Nexvel

## 1. Overview

**Creative North Star: "A Sala de Treino no Escuro"**

O Nexvel é uma sala de treino às escuras: o ambiente é grafite profundo e silencioso (#09090B), e a única fonte de energia é o **verde de evolução** (#7CFF5B) — ele acende onde há progresso, e só ali. Nada compete com esse foco. A interface é premium por subtração: muito espaço negativo, poucos componentes grandes, tipografia neutra e afiada, e brilhos de luz reservados para o momento em que o paciente avança. A sensação é a de um Whoop/Strava vestido de Linear: motivador, mas contido; direto, nunca burocrático.

O sistema serve ao produto, não o contrário. Cada tela responde a uma pergunta e leva a uma ação — o número é herói, o gráfico é raro, e o texto é curto. A gamificação (ligas, XP, sequências, conquistas) aparece como recompensa elegante, com brasões metálicos e celebrações discretas, jamais como mascote infantil ou confete gratuito.

Este sistema **rejeita** explicitamente o que o produto não é: painel administrativo frio de CRM/ERP, chat estilo WhatsApp, telas afogadas em gráficos, formulários longos, e a estética roxa-neon-glassmorphism com a qual o app nasceu (legado em migração — proibida em telas novas).

**Key Characteristics:**
- Fundo grafite quase-preto; superfícies em camadas tonais frias, sem linhas brancas.
- Verde de evolução como único acento dominante; roxo rebaixado a marca.
- Uma cor, uma função — cor é sempre reforçada por ícone/texto (WCAG AA).
- Componentes grandes, botões confortáveis, muito respiro; poucos cards.
- Luz (glow) só como resposta a estado/progresso, nunca decorativa.

## 2. Colors

Uma paleta de grafite frio drenada de roxo, com um verde vibrante de evolução e um vocabulário funcional estrito onde cada matiz carrega um único significado.

### Primary
- **Verde de Evolução** (#7CFF5B): a cor principal do app — progresso, CTA dominante, barras de XP, celebração. É o "acender a luz". `evo-2` (#70F570) é o hover; `on-evo` (#08130A) é o texto escuro sobre verde; `success` (#53F27C) fecha o gradiente das barras.

### Secondary
- **Marca / Roxo** (#7C3AED): reservado à identidade institucional — logo, Liga Mestre, materiais de marca. Nunca é ação nem progresso. Legado (`nx-primary` lilás) só existe em telas ainda não migradas.

### Tertiary
Funcionais — "uma cor, uma função". Nunca decorativos.
- **Água** (#49A8FF): hidratação / recuperação.
- **Sono** (#8B7DFF): sono / descanso — o 4º hábito, indigo suave.
- **Sequência** (#FF8A1F): streaks / dias seguidos.
- **Conquista** (#F8C84B): ligas de ouro, badges, celebração de marco.
- **Atenção** (#FFD34D): avisos brandos.
- **Risco** (#FF5D5D): abandono, erro, zona de queda.

### Neutral
- **Grafite Base** (#09090B): fundo de toda a aplicação (body).
- **Superfície** (#111318) / **Elevado** (#171A22): painéis e cartões.
- **Container** (#1C212B) / **Container Baixo** (#14171E) / **Container Alto** (#232A35): trilhos, chips, tiles, campos.
- **Tinta Principal** (#F8FAFC) / **Tinta Secundária** (#9CA3AF): texto primário e de apoio.
- **Contorno** (#6B7280): apenas ícones, divisores e contornos sutis — **nunca como cor de texto** (só 3.84:1 sobre surface, reprova AA); **Borda** (#2A2F38): divisórias e contornos sutis.

### Ligas
Assinatura de cor por liga: Bronze (#C77B3C), Prata (#C2C9D2), Ouro (#F8C84B), Diamante (#8FE3FF), Mestre (#A855F7), Lendário (#F8C84B).

### Named Rules
**A Regra "Uma Cor, Uma Função".** Cada matiz funcional tem um único significado em todo o app: verde=progresso, azul=água, laranja=sequência, ouro=conquista, vermelho=risco, roxo=marca. Nunca use um funcional por estética. Cor jamais é o único portador de significado — sempre acompanhe de ícone ou texto.

**A Regra "O Verde é Raro".** O verde de evolução aparece em ≤ um foco por tela (o CTA/progresso dominante). Sua raridade é o que faz a luz significar algo. Encher a tela de verde apaga o sinal.

**A Regra "Sem Linhas Brancas".** Bordas e divisórias são grafite (#2A2F38) ou transparências baixas — nunca branco puro. Superfícies se separam por tom, não por contorno luminoso.

**A Regra "Contraste é Lei" (WCAG AA).** Todo texto de apoio usa **Tinta Secundária** (#9CA3AF, ≥5.7:1 em qualquer superfície), incluindo placeholders — **nunca** o **Contorno** (#6B7280), que como texto reprova AA (3.84:1 sobre surface, e 2.99:1 sobre container-alto) e existe só para ícones e bordas. Corpo/label exigem ≥4.5:1, texto grande (≥18px) ≥3:1; quando a razão estiver perto do limite, meça em vez de estimar. Cinza-claro "por elegância" é o motivo nº1 de UI ilegível.

## 3. Typography

**Display / Body / Label Font:** Inter (fallback: sans-serif) — família única, pesos 300–800.

**Character:** Uma humanista-neutra afiada, que carrega do número-herói de 48px ao micro-label de 10px sem trocar de voz. Densa e legível, à altura de ferramentas como Linear e Stripe. Sem pareamento de display/serifa — o produto não precisa disso.

### Hierarchy
- **Display** (800, 48px, lh 56px, ls −0.02em): o número-herói dos KPIs e overlays de conquista. `tabular-nums` sempre.
- **Headline** (700, 32px, lh 40px, ls −0.01em): título de tela ("Insights", "Comunicação").
- **Title** (600, 24px, lh 32px): título de painel/seção, nome do paciente no hero.
- **Body** (400, 16px, lh 24px; `body-sm` 14px peso 300 para apoio): texto de interface e conteúdo. Prosa longa em 65–75ch.
- **Label** (600, 12px, ls 0.05em, frequentemente UPPERCASE; `label-sm` 10px/700): eyebrows de seção, chips, rótulos de tile.

### Named Rules
**A Regra "Número é Herói".** Métricas usam a escala Display com `tabular-nums` e recebem o tom funcional da leitura (verde bom, laranja atenção, vermelho risco). A unidade fica menor e neutra ao lado. O número domina; o rótulo sussurra acima.

**A Regra "Escala Fixa".** Tamanhos são fixos (px/rem), nunca fluidos com `clamp()` — o nutri usa desktop e o paciente usa mobile em DPI constante; um h1 que encolhe numa sidebar piora, não melhora.

## 4. Elevation

O sistema é **plano por padrão com luz sob demanda**. Superfícies descansam sem sombra, separadas por camadas tonais (bg → surface → container-high). A profundidade real é reservada para dois papéis: a sombra ambiente discreta dos cartões e o **brilho verde** que responde a progresso/celebração. Nada de sombras pesadas "2014-app"; se parecer um cartão flutuando num drop-shadow escuro, está errado.

### Shadow Vocabulary
- **Cartão** (`box-shadow: 0 1px 2px rgba(0,0,0,.4), 0 8px 24px rgba(0,0,0,.25)`): elevação ambiente sutil de painéis (`shadow-nx-card`).
- **Brilho de Evolução** (`box-shadow: 0 0 24px rgba(124,255,91,.22)`): halo verde de CTAs primários e cartões em foco (`shadow-nx-evo`).
- **Brilho Forte** (`box-shadow: 0 0 40px rgba(124,255,91,.40)`): pico de celebração — hover do primário, missão concluída, level-up (`shadow-nx-evo-strong`).

### Named Rules
**A Regra "Luz é Recompensa".** O glow verde nunca é decoração. Ele aparece quando algo avança: o CTA que dá o próximo passo, a barra que completa, a conquista que desbloqueia. Fora disso, a superfície fica plana e escura.

## 5. Components

### Buttons
- **Shape:** cantos generosos, 14px (`rounded-nx-md`); alturas sm 36 / md 44 / lg 56px.
- **Primary ("evo"):** verde sólido (#7CFF5B) com texto escuro (#08130A), peso 600, halo verde. Hover → #70F570 + brilho forte; active → `scale(.98)`. É o CTA dominante — um por foco.
- **Surface:** container alto (#232A35) + borda grafite; ação secundária.
- **Ghost:** sem preenchimento, texto secundário → tinta no hover; ação terciária.
- **Danger:** vermelho translúcido (fundo #FF5D5D a 15%, texto/borda vermelhos) — destrutivo/risco, tom contido.
- **Brand:** roxo sólido, raro (institucional / Liga Mestre).
- **Focus:** anel `ring-2` verde a 60% com offset no fundo — visível em todas as variantes.

### Chips
- **Style:** pílula (`rounded-full`) com fundo tingido a ~12%, texto e borda no tom (a 25%). O tom carrega o significado funcional (verde/água/streak/ouro/risco/atenção/neutro/marca).
- **State:** filtro selecionado = preenchido no tom; não-selecionado = container alto com texto secundário.

### Cards / Containers
- **Corner Style:** 20px (`rounded-nx-lg`).
- **Background:** Superfície (#111318); trilhos internos em Container Baixo (#14171E).
- **Shadow Strategy:** plano por padrão; `shadow-nx-card` ambiente; `glow` verde só em foco/celebração (ver Elevation).
- **Border:** grafite sutil (#2A2F38); accent opcional no tom funcional a 30%.
- **Internal Padding:** 20px (`p-5`). **Nunca aninhe cartões.**

### Inputs / Fields
- **Style:** fundo Container (#1C212B), borda grafite, 10px (`rounded-nx-sm`); em campos dark nativos (date/time) use `color-scheme: dark`.
- **Focus:** borda muda para verde a ~50% (`focus:border-nx-evo/50`); sem glow pesado.
- **Placeholder:** Tinta Secundária (#9CA3AF) — legível (AA); nunca o Contorno #6B7280, que some no fundo e reprova AA.

### Navigation
- **Sidebar (nutri):** superfície escura, itens em tinta secundária; item ativo = pílula verde com ícone escuro + leve brilho. Ícones lucide, 18–20px.
- **Bottom-nav (paciente):** barra translúcida `rgba(9,9,11,.92)` + blur + borda grafite; aba ativa = pílula verde #7CFF5B com ícone #08130A; inativos #6B7280.

### Barra de Progresso / XP (assinatura)
Trilho fino (h-2) em Container Baixo; preenchimento em gradiente verde `#53F27C → #7CFF5B` com halo. `celebrate` dispara um brilho varrendo (sheen) ao concluir. Tons alternativos água/streak/ouro seguem a função. Sempre com `role="progressbar"` e `aria-valuenow`.

### Brasão de Liga (assinatura)
`LeagueCrest` — brasão SVG paramétrico por liga com metal, iluminação e ornamentos cumulativos (gema → louros → cintilância → coroa → aura) conforme o tier sobe. É o objeto de desejo do sistema: quanto mais alta a liga, mais grandioso. Elegante, nunca infantil.

## 6. Do's and Don'ts

### Do:
- **Do** usar o verde de evolução (#7CFF5B) como o único acento dominante — um foco por tela.
- **Do** dar ao número a escala Display com `tabular-nums` e o tom da leitura (verde/laranja/vermelho).
- **Do** manter superfícies planas e escuras; reservar o glow verde para progresso e celebração.
- **Do** acompanhar toda cor de estado com ícone ou texto (risco, progresso, conquista) — WCAG AA + daltonismo.
- **Do** respeitar `prefers-reduced-motion`: toda animação (pop, rise, pulse, sheen) tem alternativa em crossfade/instantâneo.
- **Do** usar Inter em pesos; muito respiro; componentes grandes e botões confortáveis.

### Don't:
- **Don't** transformar a tela em CRM/ERP: tabelas frias, densas, com status de cobrança. O foco é clínico/gamificação.
- **Don't** desenhar Mensagens como chat estilo WhatsApp — comunicação é orientada a intenção e ação.
- **Don't** encher a tela de gráficos; poucos números escolhidos batem um dashboard de charts.
- **Don't** criar formulários longos — registrar precisa parecer evoluir, não preencher.
- **Don't** usar glassmorphism decorativo (blur/glass como padrão) nem `background-clip:text` com gradiente — legado roxo/neon do app original, proibido em telas novas.
- **Don't** usar `border-left`/`border-right` colorido > 1px como faixa lateral de destaque; use borda completa, fundo tingido ou ícone.
- **Don't** pintar bordas de branco puro (quebra a Regra "Sem Linhas Brancas") nem espalhar verde por toda a tela (mata o sinal).
- **Don't** usar o Contorno (#6B7280 / `text-nx-outline`) como cor de texto ou placeholder — reprova WCAG AA (3.84:1); texto de apoio é Tinta Secundária (#9CA3AF). #6B7280 só em ícone/borda.
- **Don't** cair em gamificação infantil: mascotes gigantes, cores berrantes, confete sem propósito.
