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
    id: "hidratacao-7",
    titulo: "Hidratação em 7 dias",
    descricao: "Beber a meta diária de água por 7 dias seguidos.",
    categoria: "hidratacao", icone: "💧", duracaoDias: 7,
    metaValor: 2, metaUnidade: "L/dia", pontosBonus: 50,
    insight: "Ótimo para reativar pacientes com baixa adesão — meta simples e de rápido resultado.",
  },
  {
    id: "treino-21",
    titulo: "Constância no treino",
    descricao: "3 treinos por semana durante 21 dias para criar hábito.",
    categoria: "treino", icone: "🏋️", duracaoDias: 21,
    metaValor: 3, metaUnidade: "treinos/sem", pontosBonus: 120,
    insight: "21 dias é o horizonte clássico de formação de hábito — bom para engajar a liga Prata/Ouro.",
  },
  {
    id: "sono-14",
    titulo: "Sono reparador",
    descricao: "Registrar 8h de sono por 14 dias.",
    categoria: "sono", icone: "😴", duracaoDias: 14,
    metaValor: 8, metaUnidade: "h/noite", pontosBonus: 80,
    insight: "Sono impacta diretamente adesão e humor — desafio de baixo esforço e alta retenção.",
  },
  {
    id: "prato-10",
    titulo: "Prato colorido",
    descricao: "Registrar refeições com vegetais por 10 dias.",
    categoria: "alimentacao", icone: "🥗", duracaoDias: 10,
    metaValor: null, metaUnidade: "registro diário", pontosBonus: 70,
    insight: "Aumenta registros no diário — ideal para pacientes que pararam de reportar refeições.",
  },
];

export const TONE_TEXT: Record<KpiView["tone"], string> = {
  primary: "text-nx-evo",
  tertiary: "text-nx-gold",
  secondary: "text-nx-streak",
  neutral: "text-nx-on-surface",
};
