// Tela "Registros Diários" (Nexvel) — tipos + acesso à API real (/api/registros-feed).
import api from "./api";

export type TipoRegistro = "excecao" | "treino" | "refeicao" | "furtada";
export type Liga = "bronze" | "silver" | "gold" | "diamond" | "master" | "legendary";

// Definição dos filtros do feed (cada um casa com um `tipo`).
export interface FiltroDef {
  id: string;
  tipo: TipoRegistro;
  icon: string;
  cor: string; // classe de cor do ícone
  label: string;
}

export const FILTROS: FiltroDef[] = [
  { id: "excecoes", tipo: "excecao", icon: "priority_high", cor: "text-nx-secondary", label: "Exceções / Ajustes" },
  { id: "furtadas", tipo: "furtada", icon: "no_meals", cor: "text-nx-error", label: "Baixa adesão" },
  { id: "treinos", tipo: "treino", icon: "fitness_center", cor: "text-nx-tertiary", label: "Check-ins completos" },
];

export interface Registro {
  id: string;
  pacienteId: string;
  paciente: string;
  liga: Liga; // moldura + badge
  ligaLabel: string; // "OURO" | "MESTRE" | …
  avatar: string | null;
  horario: string; // "14:20" (hoje) ou "dd/mm"
  tipoTexto: string;
  tipo: TipoRegistro; // define borda/chip/botões
  texto?: string | null; // descrição/motivo (opcional)
  imagem?: string | null; // foto do check-in (opcional)
  revisado: boolean;
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
