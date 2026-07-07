// Tabela de pontuação e ligas do Sistema de Ligas (Nexvel)
// Sistema contínuo/cumulativo — separado do Ciclo (ver config/pontuacao.ts)

export const PONTOS = {
  alimentacao: 4, // MÁX da alimentação (0–4, somada por refeição — ver XP_REFEICAO)
  treino: 2, // treino concluído
  agua: 2, // meta de água
  sono: 2, // dormiu bem
  registro_diario: 1, // fechou o dia
  bonus_tudo: 1, // bônus por completar os 4
};
// Máximo por dia: 4 (alimentação) + 2 + 2 + 2 (hábitos) + 1 (registro) + 1 (bônus) = 12 pts/dia

// Alimentação por refeição — 3 estados. Máx 4 XP (4 refeições × seguiu).
export const XP_REFEICAO: Record<string, number> = { seguiu: 1, adaptou: 0.5, pulou: 0 };
export const REFEICOES_KEYS = ["cafe", "almoco", "lanche", "jantar"] as const;
export const ALIMENTACAO_OK_MIN = 3; // XP p/ contar alimentação como "completa" (bônus + nutri)
export const AGUA_META_ML_PADRAO = 3000; // meta diária de água (ml)

/** Soma o XP de alimentação a partir do estado de cada refeição. */
export function calcularXpAlimentacao(
  status: Partial<Record<(typeof REFEICOES_KEYS)[number], string | null | undefined>>,
): number {
  return REFEICOES_KEYS.reduce((s, k) => s + (XP_REFEICAO[status[k] ?? ""] ?? 0), 0);
}

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
  treinoOk: boolean;
  aguaOk: boolean;
  sonoOk: boolean;
  incluirFechamento?: boolean;
}): { total: number; detalhes: Record<string, number> } {
  const detalhes: Record<string, number> = {};
  if (hoje.xpAlimentacao > 0) detalhes.alimentacao = hoje.xpAlimentacao;
  if (hoje.treinoOk) detalhes.treino = PONTOS.treino;
  if (hoje.aguaOk) detalhes.agua = PONTOS.agua;
  if (hoje.sonoOk) detalhes.sono = PONTOS.sono;
  if (hoje.incluirFechamento) {
    detalhes.registro_diario = PONTOS.registro_diario;
    const alimentacaoOk = hoje.xpAlimentacao >= ALIMENTACAO_OK_MIN;
    if (alimentacaoOk && hoje.treinoOk && hoje.aguaOk && hoje.sonoOk) {
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
