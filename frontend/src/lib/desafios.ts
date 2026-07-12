// Fonte única de verdade do Centro de Desafios no client.
// Tipos da API + derivação de KPIs + banco de templates. UI (web/mobile) só renderiza.

export type Aba = "em_curso" | "encerrado";

export interface DesafioCard {
  id: string;
  titulo: string;
  descricao: string | null;
  categoria: string;
  icone: string;
  status: string;
  metaValor: number | null;
  metaUnidade: string | null;
  dataInicio: string | null;
  dataFim: string | null;
  pontosBonus: number;
  diasRestantes: number | null;
  participantes: number;
  taxaConclusao: number | null; // null = sem participantes (Sem dados)
  adesaoMedia: number | null;
}

export interface ParticipanteRow {
  pacienteId: string;
  nome: string;
  foto: string | null;
  progresso: number;
  concluido: boolean;
  atualizadoEm: string;
}

export interface DesafioDetalhe extends DesafioCard {
  lista: ParticipanteRow[];
}

export interface ResumoResp {
  kpis: { participantes: number; taxaConclusao: number | null; adesaoMedia: number | null };
  baixaAdesao: { id: string; titulo: string; adesaoMedia: number | null; participantes: number }[];
}

export interface KpiView {
  key: string;
  label: string;
  value: string | null; // null => "Sem dados"
  hint?: string;
  tone: "primary" | "tertiary" | "secondary" | "neutral";
}

/** KPIs do topo — derivados de DesafioParticipante (via /resumo). Mesma lógica web+mobile. */
export function derivarKpisDesafios(r: ResumoResp | null): KpiView[] {
  const k = r?.kpis;
  return [
    { key: "part", label: "Participantes", value: k ? String(k.participantes) : null, hint: "em desafios ativos", tone: "primary" },
    { key: "concl", label: "Taxa de Conclusão", value: k && k.taxaConclusao != null ? `${k.taxaConclusao}%` : null, tone: "tertiary" },
    { key: "adesao", label: "Adesão Média", value: k && k.adesaoMedia != null ? `${k.adesaoMedia}%` : null, hint: "progresso médio", tone: "secondary" },
  ];
}

/** Metadados de categoria (rótulo + cor do token). */
export const CATEGORIAS: Record<string, { label: string; cor: string }> = {
  hidratacao: { label: "Hidratação", cor: "#49A8FF" },
  alimentacao: { label: "Alimentação", cor: "#7CFF5B" },
  treino: { label: "Treino", cor: "#FF8A1F" },
  sono: { label: "Sono", cor: "#8B7DFF" },
  suplementacao: { label: "Suplementação", cor: "#2DD4BF" },
  custom: { label: "Personalizado", cor: "#F8C84B" },
};

export function catMeta(categoria: string) {
  return CATEGORIAS[categoria] ?? CATEGORIAS.custom;
}

export function metaLabel(valor: number | null, unidade: string | null): string | null {
  if (valor == null && !unidade) return null;
  if (valor != null && unidade) return `${valor} ${unidade}`;
  return unidade ?? String(valor);
}

/** Banco de templates prontos (badge "IA INSIGHT"). "Ativar Agora" cria um Desafio real. */
export interface TemplateDesafio {
  id: string;
  titulo: string;
  descricao: string;
  categoria: string;
  icone: string;
  duracaoDias: number;
  metaValor: number | null;
  metaUnidade: string | null;
  pontosBonus: number;
  insight: string;
}

export const TEMPLATES_IA: TemplateDesafio[] = [
  {
    id: "sem-refrigerante-7",
    titulo: "Semana sem refrigerante",
    descricao: "Evite consumir refrigerante durante os próximos 7 dias.",
    categoria: "alimentacao", icone: "🚫", duracaoDias: 7,
    metaValor: null, metaUnidade: null, pontosBonus: 5,
    insight: "Corte simples de açúcar líquido — alta adesão e resultado rápido.",
  },
  {
    id: "sem-acucar-7",
    titulo: "Semana sem açúcar adicionado",
    descricao: "Evite doces, sobremesas e açúcar adicionado durante os próximos 7 dias.",
    categoria: "alimentacao", icone: "🍫", duracaoDias: 7,
    metaValor: null, metaUnidade: null, pontosBonus: 5,
    insight: "Reduz picos de glicose e ajuda no controle do apetite.",
  },
  {
    id: "suplementacao-14",
    titulo: "Suplementação sem falhas",
    descricao: "Tome sua suplementação todos os dias conforme orientação durante os próximos 14 dias.",
    categoria: "suplementacao", icone: "💊", duracaoDias: 14,
    metaValor: null, metaUnidade: null, pontosBonus: 10,
    insight: "Cria constância no protocolo — ideal para quem esquece as doses.",
  },
  {
    id: "cardio-diario-7",
    titulo: "Cardio diário",
    descricao: "Realize pelo menos um cardio por dia durante os próximos 7 dias.",
    categoria: "treino", icone: "🏃", duracaoDias: 7,
    metaValor: null, metaUnidade: null, pontosBonus: 5,
    insight: "Movimento diário — destrava o sedentarismo e gera hábito.",
  },
];

export const TONE_TEXT: Record<KpiView["tone"], string> = {
  primary: "text-nx-evo",
  tertiary: "text-nx-gold",
  secondary: "text-nx-streak",
  neutral: "text-nx-on-surface",
};
