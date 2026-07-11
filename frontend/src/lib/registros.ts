// Tela "Registros Diários" (Nexvel) — tipos + acesso à API real (/api/registros-feed).
import { AlertTriangle, UtensilsCrossed, Dumbbell, type LucideIcon } from "lucide-react";
import api from "./api";

export type TipoRegistro = "excecao" | "treino" | "refeicao" | "furtada";
export type Liga = "bronze" | "silver" | "gold" | "diamond" | "master" | "legendary";

// Definição dos filtros do feed (cada um casa com um `tipo`).
export interface FiltroDef {
  id: string;
  tipo: TipoRegistro;
  icon: LucideIcon;
  cor: string; // classe de cor do ícone
  label: string;
}

export const FILTROS: FiltroDef[] = [
  { id: "excecoes", tipo: "excecao", icon: AlertTriangle, cor: "text-nx-streak", label: "Exceções / Ajustes" },
  { id: "furtadas", tipo: "furtada", icon: UtensilsCrossed, cor: "text-nx-danger", label: "Baixa adesão" },
  { id: "treinos", tipo: "treino", icon: Dumbbell, cor: "text-nx-evo", label: "Check-ins completos" },
];

export type StatusGeral = "excelente" | "atencao" | "critico";

export interface Registro {
  id: string;
  pacienteId: string;
  paciente: string;
  liga: Liga; // moldura + badge
  ligaLabel: string; // "OURO" | "MESTRE" | …
  ligaNome: string | null; // "Ouro" (emblema + cor)
  ligaNivel: string | null; // "I" | "II" | "III"
  xp: number;
  streak: number;
  avatar: string | null;
  horario: string; // "14:20" (hoje) ou "dd/mm"
  hoje: boolean;
  ontem: boolean;
  dataIso: string;
  // Resumo do registro (dados já existentes, apenas expostos)
  status: StatusGeral;
  habitosOk: number;
  habitosTotal: number;
  alimentacaoPct: number | null;
  aguaMl: number | null;
  aguaMetaMl: number | null;
  sonoHoras: number | null;
  sonoFaixa: string | null;
  treino: "feito" | "nao" | null;
  humor: string | null;
  tipoTexto: string;
  tipo: TipoRegistro; // define borda/chip/botões
  texto?: string | null; // descrição/motivo (opcional)
  imagem?: string | null; // foto do check-in (opcional)
  revisado: boolean;
}

// Paciente ativo sem nenhum check-in no período (filtro "Sem registro").
export interface SemRegistro {
  pacienteId: string;
  paciente: string;
  avatar: string | null;
  liga: Liga;
  ligaLabel: string;
  ligaNome: string | null;
  ligaNivel: string | null;
  xp: number;
  streak: number;
  dias: number | null; // dias desde o último check-in (null = nunca)
}

export interface AlertaRadar {
  id: string;
  pacienteId: string;
  nome: string;
  motivo: string;
  cor: "error" | "secondary";
  glow: boolean; // active-glow (pulso)
}

export interface FeedData {
  registros: Registro[];
  resumo: { registros: number; alertas: number };
  radar: AlertaRadar[];
  comunidade: { pct: number; deltaSemana: number };
  semRegistro: SemRegistro[];
}

/* ── API ── */

export async function getRegistrosFeed(dias = 7): Promise<FeedData> {
  const { data } = await api.get<FeedData>(`/registros-feed?dias=${dias}`);
  return data;
}

export async function validarRegistro(id: string): Promise<void> {
  await api.post(`/registros-feed/${id}/validar`);
}

export async function enviarNudge(pacienteId: string): Promise<void> {
  await api.post(`/registros-feed/paciente/${pacienteId}/nudge`);
}
