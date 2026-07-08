# 01 · Gamificação

> **Status:** 🟨 Parcial
> **Módulo:** `01-gamificacao`
> **Atualizado em:** 2026-07-07
> **Docs relacionados:** [02 · Alimentação](./02-alimentacao.md) · [13 · Regras de Negócio](./13-regras-de-negocio.md)

<!--
  PADRÃO: seguir docs/_MODELO.md.
  Regra de ouro: NÃO inventar. Preencher só ao desenvolver o módulo e
  descrever apenas o que existe no código real do Nexvel.
  Seção que não se aplicar → marcar "N/A".
-->

## 1. Objetivo
_A preencher._

## 2. Visão Geral
_A preencher._

## 3. Fluxo
_A preencher._

## 4. Regras de Negócio

**XP diário — teto fixo de 12 XP/dia** (`backend/src/config/ligas.ts` → `PONTOS` + `calcularPontosRegistro`):

| Categoria | XP máx | Como pontua |
|---|---|---|
| 🍽️ Alimentação | 4 | dividido por N refeições (ver [02](./02-alimentacao.md)); satura em 4 |
| 🏋️ Treino | 3 | `conforme` 3 / `parcial` 1 / `nao` 0 |
| 💧 Hidratação | 2 | meta de água batida |
| 😴 Sono | 2 | faixa 7–9h/>9h = 2 · 5–7h = 1 · <5h = 0 |
| 📝 Registro | 1 | creditado ao **fechar o dia** |

- Teto **independe** do nº de tarefas do plano → todos os pacientes competem em igualdade nas ligas.
- XP só é creditado na liga ao **fechar o dia** (`finalizado = true`); antes disso o autosave não pontua.
- _(Não há bônus por completar tudo — removido para manter o teto em 12.)_
- Ligas, sequência e progressão contínua: `LIGAS` / `calcularLiga` em `ligas.ts`. _(demais detalhes a preencher.)_

_Restante do módulo (ligas, streak, inatividade): a preencher._

## 5. Interface
_A preencher._

## 6. Experiência do Usuário
_A preencher._

## 7. Integrações
_A preencher._

## 8. Casos Especiais
_A preencher._

## 9. Observações Técnicas
_A preencher._

## 10. Melhorias Futuras
_A preencher._
