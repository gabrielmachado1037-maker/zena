// Tabela de pontuação e ligas do Sistema de Ligas (Nexvel)
// Sistema contínuo/cumulativo — separado do Ciclo (ver config/pontuacao.ts)

export const PONTOS = {
  alimentacao: 4, // MÁX da alimentação (0–4, somada por refeição — ver XP_REFEICAO)
  treino: 3, // MÁX do treino (0/1/3 — ver XP_TREINO)
  agua: 2, // meta de água
  sono: 2, // MÁX do sono (0/1/2 por faixa de horas — ver XP_SONO)
  registro_diario: 1, // fechou o dia
  bonus_tudo: 1, // bônus por completar os 4
};
// Máximo por dia: 4 (alim.) + 3 (treino) + 2 (água) + 2 (sono) + 1 (registro) + 1 (bônus) = 13 pts/dia

// Alimentação por refeição — 4 estados. Máx 4 XP (4 refeições × seguiu).
// "comeu_mal" e "pulou" valem 0, mas são registros DISTINTOS (análise de padrões).
export const XP_REFEICAO: Record<string, number> = { seguiu: 1, adaptou: 0.75, comeu_mal: 0, pulou: 0 };
export const REFEICOES_KEYS = ["cafe", "almoco", "lanche", "jantar"] as const;
export const ALIMENTACAO_OK_MIN = 3; // XP p/ contar alimentação como "completa" (bônus + nutri)
export const AGUA_META_ML_PADRAO = 3000; // meta diária de água (ml)

// Treino — 3 estados: conforme (3) / parcial (1) / não consegui (0).
export const XP_TREINO: Record<string, number> = { conforme: 3, parcial: 1, nao: 0 };
// Sono — por faixa de horas: <5h (0) / 5–6h59 (1) / 7–9h (2) / >9h (2).
export const XP_SONO: Record<string, number> = { menos5: 0, "5a7": 1, "7a9": 2, mais9: 2 };

/** Soma o XP de alimentação a partir do estado de cada refeição. */
export function calcularXpAlimentacao(
  status: Partial<Record<(typeof REFEICOES_KEYS)[number], string | null | undefined>>,
): number {
  return REFEICOES_KEYS.reduce((s, k) => s + (XP_REFEICAO[status[k] ?? ""] ?? 0), 0);
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
  { liga: "Bronze", nivel: "III", de: 0, ate: 80, cor: "#CD7F32", icone: "🥉" },
  { liga: "Bronze", nivel: "II", de: 80, ate: 180, cor: "#CD7F32", icone: "🥉" },
  { liga: "Bronze", nivel: "I", de: 180, ate: 300, cor: "#CD7F32", icone: "🥉" },
  { liga: "Prata", nivel: "III", de: 300, ate: 450, cor: "#9CA3AF", icone: "🥈" },
  { liga: "Prata", nivel: "II", de: 450, ate: 650, cor: "#9CA3AF", icone: "🥈" },
  { liga: "Prata", nivel: "I", de: 650, ate: 900, cor: "#9CA3AF", icone: "🥈" },
  { liga: "Ouro", nivel: "III", de: 900, ate: 1250, cor: "#F59E0B", icone: "🏅" },
  { liga: "Ouro", nivel: "II", de: 1250, ate: 1650, cor: "#F59E0B", icone: "🏅" },
  { liga: "Ouro", nivel: "I", de: 1650, ate: 2100, cor: "#F59E0B", icone: "🏅" },
  { liga: "Diamante", nivel: "III", de: 2100, ate: 2650, cor: "#60A5FA", icone: "💎" },
  { liga: "Diamante", nivel: "II", de: 2650, ate: 3300, cor: "#60A5FA", icone: "💎" },
  { liga: "Diamante", nivel: "I", de: 3300, ate: 4100, cor: "#60A5FA", icone: "💎" },
  { liga: "Mestre", nivel: "III", de: 4100, ate: 5000, cor: "#A855F7", icone: "⚔️" },
  { liga: "Mestre", nivel: "II", de: 5000, ate: 6200, cor: "#A855F7", icone: "⚔️" },
  { liga: "Mestre", nivel: "I", de: 6200, ate: 7500, cor: "#A855F7", icone: "⚔️" },
  { liga: "Lendário", nivel: "III", de: 7500, ate: 9000, cor: "#F97316", icone: "👑" },
  { liga: "Lendário", nivel: "II", de: 9000, ate: 11000, cor: "#F97316", icone: "👑" },
  { liga: "Lendário", nivel: "I", de: 11000, ate: null, cor: "#F97316", icone: "👑" },
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
 * Pontos de um dia. `xpAlimentacao` (0–4) já vem somado das refeições.
 * `incluirFechamento` (registro_diario + bônus por completar tudo) só entra ao FECHAR
 * o dia — durante o autosave o registro reflete só o XP dos hábitos, sem creditar liga.
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
    const alimentacaoOk = hoje.xpAlimentacao >= ALIMENTACAO_OK_MIN;
    // Bônus por completar os 4 hábitos (cada um no seu estado "feito")
    if (alimentacaoOk && hoje.xpTreino > 0 && hoje.aguaOk && hoje.xpSono > 0) {
      detalhes.bonus_tudo = PONTOS.bonus_tudo;
    }
  }
  const total = Object.values(detalhes).reduce((a, b) => a + b, 0);
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
