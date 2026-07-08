// Espelho da tabela de ligas do backend (config/ligas.ts) para progress bars e cores no client.
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
  return LIGAS[LIGAS.indexOf(atual) + 1] ?? null;
}

// Progresso 0-100 dentro da liga atual + pontos que faltam para a próxima
export function progressoLiga(pontos: number): { pct: number; faltam: number; proxima: LigaTier | null } {
  const atual = calcularLiga(pontos);
  if (atual.ate === null) return { pct: 100, faltam: 0, proxima: null };
  const range = atual.ate - atual.de;
  const pct = Math.min(100, Math.round(((pontos - atual.de) / range) * 100));
  return { pct, faltam: Math.max(0, atual.ate - pontos), proxima: proximaLiga(pontos) };
}

export const CORES_LIGA: Record<string, string> = {
  Bronze: "#CD7F32", Prata: "#9CA3AF", Ouro: "#F59E0B",
  Diamante: "#60A5FA", Mestre: "#A855F7", "Lendário": "#F97316",
};

export const ICONE_LIGA: Record<string, string> = {
  Bronze: "🥉", Prata: "🥈", Ouro: "🏅", Diamante: "💎", Mestre: "⚔️", "Lendário": "👑",
};

// ── Alimentação: espelho de config/ligas.ts do backend ─────────────────────
// Cada refeição vale 4/N; "adaptou" = 75% disso; comeu_mal/pulou = 0. Satura em 4 —
// ter mais refeições NÃO dá vantagem (igualdade nas ligas). Ex.: 5 refeições → 0,80/refeição.
export const XP_ALIMENTACAO_MAX = 4;
export const FATOR_REFEICAO: Record<string, number> = { seguiu: 1, adaptou: 0.75, comeu_mal: 0, pulou: 0 };

export interface RefeicaoPlano { key: string; label: string }
export const PLANO_REFEICOES_PADRAO: RefeicaoPlano[] = [
  { key: "cafe", label: "Café" },
  { key: "almoco", label: "Almoço" },
  { key: "lanche", label: "Lanche" },
  { key: "jantar", label: "Jantar" },
];

/** Resolve o plano de refeições (fallback = 4 padrão). */
export function resolverPlanoRefeicoes(plano: unknown): RefeicaoPlano[] {
  if (Array.isArray(plano)) {
    const limpo = plano
      .filter((r): r is RefeicaoPlano => !!r && typeof (r as any).key === "string" && typeof (r as any).label === "string")
      .slice(0, 6);
    if (limpo.length >= 3) return limpo;
  }
  return PLANO_REFEICOES_PADRAO;
}

/** Valor (XP) de uma refeição dado o nº de refeições do plano. */
export function valorRefeicaoXp(n: number): number {
  return n > 0 ? XP_ALIMENTACAO_MAX / n : 0;
}

/** XP de alimentação (0–4) a partir dos estados ordenados das N refeições. */
export function calcularXpAlimentacao(statuses: (string | null | undefined)[]): number {
  const n = statuses.length;
  if (n <= 0) return 0;
  const valor = XP_ALIMENTACAO_MAX / n;
  const total = statuses.reduce<number>((s, st) => s + valor * (FATOR_REFEICAO[st ?? ""] ?? 0), 0);
  return Math.min(Math.round(total * 100) / 100, XP_ALIMENTACAO_MAX);
}

// ── Sono: espelho de config/ligas.ts do backend ───────────────────────────
export const SONO_META_HORAS_PADRAO = 8;
/** XP de sono (0–2) por tolerância vs a meta: ±1h = 2 · até 2h = 1 · além = 0. */
export function calcularXpSonoMeta(horas: number | null | undefined, metaHoras: number): number {
  if (typeof horas !== "number" || !isFinite(horas) || horas <= 0) return 0;
  const diff = Math.abs(horas - metaHoras);
  if (diff <= 1) return 2;
  if (diff <= 2) return 1;
  return 0;
}

// Dias desde o último check-in
export function diasDesde(iso: string | null): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  const hoje = new Date();
  return Math.floor((hoje.setHours(0, 0, 0, 0) - d.setHours(0, 0, 0, 0)) / 86_400_000);
}
