// Tabela de pontuação e ligas do Sistema de Ligas (Nexvel)
// Sistema contínuo/cumulativo — separado do Ciclo (ver config/pontuacao.ts)

export const PONTOS = {
  alimentacao: 4, // MÁX da alimentação (0–4, dividido pelas N refeições — ver calcularXpAlimentacao)
  treino: 3, // MÁX do treino (0/1/3 — ver XP_TREINO)
  agua: 2, // meta de água
  sono: 2, // MÁX do sono (0/1/2 por faixa de horas — ver XP_SONO)
  registro_diario: 1, // fechou o dia
};
// Teto fixo por dia: 4 (alim.) + 3 (treino) + 2 (água) + 2 (sono) + 1 (registro) = 12 XP/dia.
// Independe do nº de refeições do plano — é isso que garante igualdade nas ligas.

// Alimentação por refeição — 4 estados, usados como FATOR do valor da refeição (4 ÷ N):
// seguiu = 100% · adaptou = 75% · comeu_mal/pulou = 0. "comeu_mal" e "pulou" valem 0 mas são
// registros DISTINTOS (análise de padrões). Ex.: 5 refeições → seguiu 0,80 / adaptou 0,60.
export const XP_REFEICAO: Record<string, number> = { seguiu: 1, adaptou: 0.75, comeu_mal: 0, pulou: 0 };
export const REFEICOES_KEYS = ["cafe", "almoco", "lanche", "jantar"] as const;
export const ALIMENTACAO_OK_MIN = 3; // XP (0–4) p/ contar alimentação como "completa" (nutri/streak)
export const AGUA_META_ML_PADRAO = 3000; // meta diária de água (ml)

// ── Plano de missões: refeições configuráveis pela nutri (3–6) ──────────────
export interface RefeicaoPlano { key: string; label: string }
export const MIN_REFEICOES = 3;
export const MAX_REFEICOES = 6;

// Plano padrão (4 refeições) — mantém keys/labels atuais intactos (retrocompat total).
export const PLANO_REFEICOES_PADRAO: RefeicaoPlano[] = [
  { key: "cafe", label: "Café" },
  { key: "almoco", label: "Almoço" },
  { key: "lanche", label: "Lanche" },
  { key: "jantar", label: "Jantar" },
];

// Presets por quantidade. Keys estáveis (base das colunas legadas + refeicoesStatus).
export const PLANOS_REFEICOES: Record<number, RefeicaoPlano[]> = {
  3: [
    { key: "cafe", label: "Café da manhã" },
    { key: "almoco", label: "Almoço" },
    { key: "jantar", label: "Jantar" },
  ],
  4: PLANO_REFEICOES_PADRAO,
  5: [
    { key: "cafe", label: "Café da manhã" },
    { key: "lanche_manha", label: "Lanche da manhã" },
    { key: "almoco", label: "Almoço" },
    { key: "lanche", label: "Lanche da tarde" },
    { key: "jantar", label: "Jantar" },
  ],
  6: [
    { key: "cafe", label: "Café da manhã" },
    { key: "lanche_manha", label: "Lanche da manhã" },
    { key: "almoco", label: "Almoço" },
    { key: "lanche", label: "Lanche da tarde" },
    { key: "jantar", label: "Jantar" },
    { key: "ceia", label: "Ceia" },
  ],
};

/** Resolve o plano de refeições de um paciente. Fallback = 4 refeições padrão. */
export function resolverPlanoRefeicoes(planoRefeicoes: unknown): RefeicaoPlano[] {
  if (Array.isArray(planoRefeicoes)) {
    const limpo = planoRefeicoes
      .filter((r): r is RefeicaoPlano => !!r && typeof r === "object" && typeof (r as any).key === "string" && typeof (r as any).label === "string")
      .slice(0, MAX_REFEICOES);
    if (limpo.length >= MIN_REFEICOES) return limpo;
  }
  return PLANO_REFEICOES_PADRAO;
}

// ── Metas configuráveis pela nutri (água/sono/treino) ──────────────────────
export const SONO_META_HORAS_PADRAO = 8; // meta de sono quando a nutri não definiu

/** Meta de água em ml (nutri). Fallback = 3000. */
export function resolverAguaMetaMl(v: unknown): number {
  return typeof v === "number" && v > 0 ? Math.round(v) : AGUA_META_ML_PADRAO;
}

/** Meta de sono em horas (nutri). Fallback = 8. */
export function resolverSonoMetaHoras(v: unknown): number {
  return typeof v === "number" && v > 0 ? v : SONO_META_HORAS_PADRAO;
}

/**
 * XP de sono (0–2) por tolerância vs a meta da nutri:
 * dentro de ±1h da meta = 2 · até 2h de diferença = 1 · além = 0.
 */
export function calcularXpSonoMeta(horas: number | null | undefined, metaHoras: number): number {
  if (typeof horas !== "number" || !isFinite(horas) || horas <= 0) return 0;
  const diff = Math.abs(horas - metaHoras);
  if (diff <= 1) return 2;
  if (diff <= 2) return 1;
  return 0;
}

/** Hoje é dia de treino? `dias` = 0..6 (0=domingo). Vazio/null = todo dia é dia de treino. */
export function ehDiaDeTreino(dias: number[] | null | undefined, weekday: number): boolean {
  if (!Array.isArray(dias) || dias.length === 0) return true;
  return dias.includes(weekday);
}

// Treino — 3 estados: conforme (3) / parcial (1) / não consegui (0).
export const XP_TREINO: Record<string, number> = { conforme: 3, parcial: 1, nao: 0 };
// Sono — por faixa de horas: <5h (0) / 5–6h59 (1) / 7–9h (2) / >9h (2).
export const XP_SONO: Record<string, number> = { menos5: 0, "5a7": 1, "7a9": 2, mais9: 2 };

/**
 * Precisão canônica do XP: 2 casas. É o teto real do sistema — a menor fração
 * possível é uma refeição (4÷6 ≈ 0,67) e `calcularXpAlimentacao` já arredonda aí.
 * Aplicar em TODA escrita de XP impede que somas sucessivas de frações binárias
 * derivem (um paciente com 31 XP acabava gravado como 30.999999999999996).
 */
export const arredondarXp = (n: number): number => Math.round(n * 100) / 100;

/**
 * XP de alimentação (0–4) a partir do estado das N refeições do plano.
 * Cada refeição vale `4 / N`; "adaptou" recebe 75% desse valor. Satura em 4 —
 * então ter mais refeições NÃO dá vantagem (igualdade nas ligas).
 * Aceita a lista ordenada de estados das refeições do plano.
 */
export function calcularXpAlimentacao(statuses: Array<string | null | undefined>): number {
  const n = statuses.length;
  if (n <= 0) return 0;
  const valorRefeicao = PONTOS.alimentacao / n; // 4 ÷ N
  const total = statuses.reduce<number>((s, st) => s + valorRefeicao * (XP_REFEICAO[st ?? ""] ?? 0), 0);
  return Math.min(Math.round(total * 100) / 100, PONTOS.alimentacao);
}

export const calcularXpTreino = (status: string | null | undefined): number => XP_TREINO[status ?? ""] ?? 0;
export const calcularXpSono = (faixa: string | null | undefined): number => XP_SONO[faixa ?? ""] ?? 0;

export interface LigaTier {
  liga: string;
  nivel: "III" | "II" | "I";
  de: number;
  ate: number | null;
  cor: string;
  icone: string;
}

export const LIGAS: LigaTier[] = [
  { liga: "Bronze", nivel: "III", de: 0, ate: 80, cor: "#C77B3C", icone: "🥉" },
  { liga: "Bronze", nivel: "II", de: 80, ate: 180, cor: "#C77B3C", icone: "🥉" },
  { liga: "Bronze", nivel: "I", de: 180, ate: 300, cor: "#C77B3C", icone: "🥉" },
  { liga: "Prata", nivel: "III", de: 300, ate: 450, cor: "#C2C9D2", icone: "🥈" },
  { liga: "Prata", nivel: "II", de: 450, ate: 650, cor: "#C2C9D2", icone: "🥈" },
  { liga: "Prata", nivel: "I", de: 650, ate: 900, cor: "#C2C9D2", icone: "🥈" },
  { liga: "Ouro", nivel: "III", de: 900, ate: 1250, cor: "#F8C84B", icone: "🏅" },
  { liga: "Ouro", nivel: "II", de: 1250, ate: 1650, cor: "#F8C84B", icone: "🏅" },
  { liga: "Ouro", nivel: "I", de: 1650, ate: 2100, cor: "#F8C84B", icone: "🏅" },
  { liga: "Diamante", nivel: "III", de: 2100, ate: 2650, cor: "#54B3F0", icone: "💎" },
  { liga: "Diamante", nivel: "II", de: 2650, ate: 3300, cor: "#54B3F0", icone: "💎" },
  { liga: "Diamante", nivel: "I", de: 3300, ate: 4100, cor: "#54B3F0", icone: "💎" },
  { liga: "Mestre", nivel: "III", de: 4100, ate: 5000, cor: "#F0483E", icone: "⚔️" },
  { liga: "Mestre", nivel: "II", de: 5000, ate: 6200, cor: "#F0483E", icone: "⚔️" },
  { liga: "Mestre", nivel: "I", de: 6200, ate: 7500, cor: "#F0483E", icone: "⚔️" },
  { liga: "Lendário", nivel: "III", de: 7500, ate: 9000, cor: "#A855F7", icone: "👑" },
  { liga: "Lendário", nivel: "II", de: 9000, ate: 11000, cor: "#A855F7", icone: "👑" },
  { liga: "Lendário", nivel: "I", de: 11000, ate: null, cor: "#A855F7", icone: "👑" },
];

export function calcularLiga(pontos: number): LigaTier {
  return LIGAS.find((l) => pontos >= l.de && (l.ate === null || pontos < l.ate)) ?? LIGAS[0];
}

export function proximaLiga(pontos: number): LigaTier | null {
  const atual = calcularLiga(pontos);
  const idx = LIGAS.indexOf(atual);
  return LIGAS[idx + 1] ?? null;
}

/**
 * Pontos de um dia. `xpAlimentacao` (0–4) já vem calculado das refeições.
 * `incluirFechamento` (registro_diario) só entra ao FECHAR o dia — durante o autosave
 * o registro reflete só o XP dos hábitos, sem creditar liga. Teto fixo de 12 XP/dia.
 */
export function calcularPontosRegistro(hoje: {
  xpAlimentacao: number;
  xpTreino: number;
  aguaOk: boolean;
  xpSono: number;
  incluirFechamento?: boolean;
}): { total: number; detalhes: Record<string, number> } {
  const detalhes: Record<string, number> = {};
  if (hoje.xpAlimentacao > 0) detalhes.alimentacao = hoje.xpAlimentacao;
  if (hoje.xpTreino > 0) detalhes.treino = hoje.xpTreino;
  if (hoje.aguaOk) detalhes.agua = PONTOS.agua;
  if (hoje.xpSono > 0) detalhes.sono = hoje.xpSono;
  if (hoje.incluirFechamento) {
    detalhes.registro_diario = PONTOS.registro_diario;
  }
  // Somar frações binárias deriva (1,33 × 3 = 3.9899999999999998). Arredondar aqui
  // e no total acumulado mantém o XP gravado com a precisão que ele realmente tem.
  const total = arredondarXp(Object.values(detalhes).reduce((a, b) => a + b, 0));
  return { total, detalhes };
}

// Sistema de inatividade (processado diariamente às 00:01 BRT)
// dia 1 sem registro: aviso, sem punição
// dia 2 sem registro: perde a sequência (streakAtual = 0), sem perda de pontos
// dias 3-7 sem registro: barra congelada (não sobe de liga mesmo ganhando pontos depois)
// após 7 dias: perde 5 pontos/dia, até o máximo de -50 pontos no total
export const PENALIDADE_INATIVIDADE_POR_DIA = 5;
export const PENALIDADE_INATIVIDADE_MAXIMA = 50;
export const DIAS_ATE_CONGELAR = 3;
export const DIAS_ATE_PENALIZAR = 7;
