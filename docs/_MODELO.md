# _MODELO · Padrão de Documentação do Nexvel

> Todo documento em `/docs` deve seguir este formato. O objetivo é consistência:
> qualquer pessoa (ou IA) lê um doc e sabe exatamente onde cada informação fica.

## Regra de ouro

**Não inventar.** A documentação descreve o que **existe no código real** do Nexvel.
Enquanto um módulo não foi verificado no código, suas seções ficam como `_A preencher._`.
Cada seção é preenchida **quando o módulo correspondente for desenvolvido/analisado**.

## Cabeçalho obrigatório

Todo arquivo começa com um H1 e um bloco de metadados:

```md
# NN · Nome do Módulo

> **Status:** 🟥 Estrutura · 🟨 Parcial · 🟩 Completo
> **Módulo:** `nome-do-arquivo`
> **Atualizado em:** AAAA-MM-DD
> **Docs relacionados:** [links]
```

**Legenda de status:** 🟥 só estrutura · 🟨 preenchido em parte · 🟩 documentado e conferido no código.

## Seções padrão

Use estas seções **quando fizerem sentido** para o módulo (marque `N/A` quando não se aplicar).
Mantenha a mesma numeração e ordem em todos os docs de módulo:

| # | Seção | O que documentar |
|---|-------|------------------|
| 1 | **Objetivo** | Para que serve o módulo, em 1–3 frases. |
| 2 | **Visão Geral** | Como o módulo funciona por alto; conceitos-chave. |
| 3 | **Fluxo** | Passo a passo do usuário/sistema (do início ao fim). |
| 4 | **Regras de Negócio** | Regras concretas, valores, condições, cálculos. |
| 5 | **Interface** | Telas/componentes envolvidos (com caminho do arquivo). |
| 6 | **Experiência do Usuário** | Micro-interações, feedback, estados, tom. |
| 7 | **Integrações** | Backend, endpoints, DB, serviços externos. |
| 8 | **Casos Especiais** | Bordas, exceções, estados vazios, erros. |
| 9 | **Observações Técnicas** | Decisões, restrições, dívidas técnicas, gotchas. |
| 10 | **Melhorias Futuras** | Ideias/pendências (sem compromisso de data). |

> Docs meta (14-roadmap, 99-principios) podem usar seções próprias, mantendo o mesmo cabeçalho.

## Convenções de escrita

- **Idioma:** português (pt-BR).
- **Referenciar código real:** sempre citar o caminho do arquivo (ex.: `backend/src/config/ligas.ts`) e, quando útil, a função/rota.
- **Fatos, não suposições:** se algo não foi confirmado no código, escrever `⚠️ a confirmar`.
- **Conciso:** títulos e listas > parágrafos longos.
- **Uma fonte de verdade:** regra que vale para vários módulos mora em `13-regras-de-negocio.md`; os outros docs referenciam, não duplicam.
