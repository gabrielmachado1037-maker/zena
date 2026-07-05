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

// Dias desde o último check-in
export function diasDesde(iso: string | null): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  const hoje = new Date();
  return Math.floor((hoje.setHours(0, 0, 0, 0) - d.setHours(0, 0, 0, 0)) / 86_400_000);
}
