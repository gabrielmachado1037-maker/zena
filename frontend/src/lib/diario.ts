// Tipos compartilhados das abas do Diário de Bordo (GET /diario/:id).

export interface DesafioProgressoItem {
  id: string;
  progresso: number; // 0-100
  concluido: boolean;
  atualizadoEm: string;
  createdAt: string;
  desafio: {
    id: string;
    titulo: string;
    descricao: string | null;
    tipo: string;
    icone: string;
    pontosBonus: number;
    status: string;
    dataInicio: string | null;
    dataFim: string | null;
    duracaoDias: number;
    metaValor: number | null;
    metaUnidade: string | null;
  };
}

export interface MedicaoItem {
  id: string;
  data: string;
  peso: number;
  gordura: number | null;
  musculo: number | null;
  cintura: number | null;
  quadril: number | null;
  braco: number | null;
  coxa: number | null;
  observacoes: string | null;
}

export interface FotoEvolucaoItem {
  id: string;
  data: string;
  tipo: string;
  imagem: string;
}

export interface PontosLogItem {
  id: string;
  tipo: string;
  pontos: number;
  data: string;
  createdAt: string;
}

export interface StreakMarcoItem {
  id: string;
  marco: number;
  pontosBonus: number;
  concedidoEm: string;
}

export interface ConquistaItem {
  id: string;
  tipo: string;
  titulo: string;
  descricao: string | null;
  icone: string | null;
  pontosBonus: number;
  createdAt: string;
}

// Glass sem linhas brancas (mesmo estilo do Diário de Bordo).
export const GLASS = "bg-nx-surface/80 backdrop-blur-md border border-nx-primary-container/10 rounded-2xl";

const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
const MESES_ABR = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export function dataCurta(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${pad(d.getUTCDate())}/${MESES_ABR[d.getUTCMonth()]}`;
}

// Rótulo humano para o tipo de lançamento de pontos.
export function rotuloTipoPontos(tipo: string): string {
  const map: Record<string, string> = {
    checkin: "Check-ins",
    check_in: "Check-ins",
    registro: "Registros",
    desafio: "Desafios",
    desafio_concluido: "Desafios",
    streak: "Streak / Sequência",
    streak_marco: "Marcos de streak",
    bonus: "Bônus",
    liga: "Promoção de liga",
    conquista: "Conquistas",
  };
  return map[tipo] ?? tipo.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
