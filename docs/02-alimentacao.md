# 02 · Alimentação

> **Status:** 🟨 Parcial
> **Módulo:** `02-alimentacao`
> **Atualizado em:** 2026-07-07
> **Docs relacionados:** [01 · Gamificação](./01-gamificacao.md) · [13 · Regras de Negócio](./13-regras-de-negocio.md)

<!--
  PADRÃO: seguir docs/_MODELO.md.
  Regra de ouro: NÃO inventar. Descreve apenas o que existe no código real.
-->

## 1. Objetivo
Medir a **aderência** do paciente ao plano alimentar do dia via registro por refeição, convertendo-a em XP para a gamificação — sem que o número de refeições dê vantagem.

## 2. Visão Geral
O plano de missões de cada paciente tem de **3 a 6 refeições**, configuradas pela nutri. A alimentação vale no máximo **4 XP por dia**, dividido igualmente entre as refeições (`4 ÷ N`). Cada refeição é registrada em 4 estados. A alimentação **satura em 4** — mais refeições não geram mais XP (igualdade nas ligas).

## 3. Fluxo
1. Nutri define o nº de refeições no painel **Plano de missões** (`frontend/src/pages/DiarioBordo.tsx`) → `PUT /pacientes/:id/plano-missoes`.
2. Paciente abre "Missões de hoje" (`registro-screen.tsx`) e toca cada refeição.
3. Bottom sheet (`MealSheet.tsx`) coleta o estado (e nota/motivo opcional).
4. Autosave (`PUT /registros/dia`) grava `refeicoesStatus`; ao **fechar o dia** (`POST /registros/dia/fechar`) o XP é creditado na liga.

## 4. Regras de Negócio
Fonte da regra: `backend/src/config/ligas.ts` (espelhada em `frontend/src/lib/ligas.ts`).

- **Valor da refeição** = `4 ÷ N` (N = nº de refeições do plano). Ex.: 3→1,33 · 4→1,00 · 5→0,80 · 6→0,67.
- **Estados** (`XP_REFEICAO`, fator do valor da refeição):
  - 🟢 `seguiu` — 100% do valor.
  - 🟡 `adaptou` — 75% do valor (ex.: 0,80 → 0,60).
  - 🟠 `comeu_mal` — 0 XP (registro distinto p/ análise).
  - 🔴 `pulou` — 0 XP.
- **Teto:** alimentação satura em **4 XP** (`calcularXpAlimentacao`), independente de N.
- Presets de plano por quantidade: `PLANOS_REFEICOES` (3/4/5/6). Padrão (sem config) = 4 refeições (café/almoço/lanche/jantar).

## 5. Interface
- Paciente: `frontend/src/components/paciente/screens/registro-screen.tsx` (card Alimentação + chips) e `frontend/src/components/ui-nx/MealSheet.tsx` (4 estados, selo de XP dinâmico via prop `valorRefeicao`).
- Nutri: painel **Plano de missões · Refeições** em `frontend/src/pages/DiarioBordo.tsx` (botões 3/4/5/6).

## 6. Experiência do Usuário
- `adaptou` e `comeu_mal` abrem campo de texto **opcional** ("O que você mudou/comeu?").
- `pulou` mostra motivos rápidos (`MOTIVOS_PULO`).
- Toast por refeição mostra o XP real (4÷N); tom neutro (sem punição) em `comeu_mal`/`pulou`.

## 7. Integrações
- Banco: `Paciente.planoRefeicoes` (Json `[{key,label}]`, null = 4 padrão) e `Registro.refeicoesStatus` (Json `{key:status}`, fonte da verdade). Colunas legadas `cafeStatus…jantarStatus` seguem espelhadas p/ as 4 keys canônicas (retrocompat das agregações da nutri). Migração `20260707140000_add_plano_refeicoes_status`.
- Endpoints: `PUT /registros/dia`, `POST /registros/dia/fechar`, `GET /registros/resumo` (retorna `planoRefeicoes`), `PUT /pacientes/:id/plano-missoes`.

## 8. Casos Especiais
- Registros antigos (sem `refeicoesStatus`): leitura cai nas colunas legadas (`statusMapDoRegistro`).
- Refeições fora do plano padrão (`lanche_manha`, `ceia`) existem só em `refeicoesStatus` (sem coluna legada).
- Dia já fechado (`finalizado`): refeições ficam travadas (não re-pontua).

## 9. Observações Técnicas
- XP centralizado: `calcularXpAlimentacao` (back) / `lib/ligas.ts` (front). Arredondamento a 2 casas.
- `ALIMENTACAO_OK_MIN = 3` (0–4) define alimentação "completa" p/ flags da nutri/streak — independe de N.

## 10. Melhorias Futuras
_A preencher._
