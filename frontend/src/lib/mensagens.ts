// Tela de Mensagens (Nexvel) — tipos + acesso à API real (/api/mensagens/*).
import api from "./api";

export type Autor = "paciente" | "nutri";
export type Canal = "app" | "whatsapp";

export interface Conversa {
  id: string; // pacienteId
  nome: string;
  avatarUrl: string | null;
  canal: Canal;
  previa: string;
  ultimaAtividade: string | null; // ISO
  naoLidoCount: number;
  online: boolean;
  objetivo: string;
  ligaAtual: string;
  streak: string;
  ultimaConsulta: string | null; // ISO
}

export interface Mensagem {
  id: string;
  autor: Autor;
  texto: string;
  hora: string; // "10:30"
  avatarUrl: string | null;
  anexoUrl?: string | null; // imagem anexada (URL do Supabase ou data URI otimista)
  nome?: string; // primeiro nome do paciente (rótulo acima do balão)
}

// Contexto do paciente para o cabeçalho do chat (liga/score/sequência/último check-in).
export interface PacienteContexto {
  id: string;
  nome: string;
  avatarUrl: string | null;
  objetivo: string;
  ligaAtual: string;
  streak: number;
  ultimoCheckin: string | null; // ISO
  online: boolean;
  score: number; // 0–100 (adesão de check-ins nos últimos 30 dias)
}

export interface Thread {
  mensagens: Mensagem[];
  nutriAvatarUrl: string | null;
  pacienteAvatarUrl: string | null;
  paciente: PacienteContexto | null;
  hasMore: boolean;
  nextCursor: string | null;
}

interface ThreadResp {
  pacienteAvatarUrl: string | null;
  nutriAvatarUrl: string | null;
  paciente?: PacienteContexto | null;
  mensagens: { id: string; autor: Autor; conteudo: string; anexoUrl?: string | null; criadoEm: string }[];
  hasMore?: boolean;
  nextCursor?: string | null;
}

// Respostas rápidas (client-side) — botão "Rápidas".
export const RESPOSTAS_RAPIDAS = [
  "Parabéns pela consistência! Continue assim. 💪",
  "Lembre-se de manter a hidratação em dia hoje.",
  "Ótimo progresso! Vamos ajustar o plano na próxima consulta.",
  "Como você está se sentindo com o novo cardápio?",
  "Não esqueça de registrar suas refeições no app.",
];

/* ── API ── */

export async function getConversas(): Promise<Conversa[]> {
  const { data } = await api.get<Conversa[]>("/mensagens/conversas");
  return data;
}

function mapMensagens(
  msgs: ThreadResp["mensagens"],
  nutriAvatarUrl: string | null,
  pacienteAvatarUrl: string | null,
  primeiroNome: string,
): Mensagem[] {
  return msgs.map((m) => ({
    id: m.id,
    autor: m.autor,
    texto: m.conteudo,
    hora: formatHora(m.criadoEm),
    avatarUrl: m.autor === "nutri" ? nutriAvatarUrl : pacienteAvatarUrl,
    anexoUrl: m.anexoUrl ?? null,
    nome: m.autor === "paciente" ? primeiroNome : undefined,
  }));
}

// 1ª página da thread (mensagens mais recentes) + contexto do paciente.
export async function getThreadById(pacienteId: string, pacienteNome: string): Promise<Thread> {
  const { data } = await api.get<ThreadResp>(`/mensagens/thread/${pacienteId}`);
  const primeiroNome = pacienteNome.split(" ")[0];
  return {
    nutriAvatarUrl: data.nutriAvatarUrl,
    pacienteAvatarUrl: data.pacienteAvatarUrl,
    paciente: data.paciente ?? null,
    mensagens: mapMensagens(data.mensagens, data.nutriAvatarUrl, data.pacienteAvatarUrl, primeiroNome),
    hasMore: !!data.hasMore,
    nextCursor: data.nextCursor ?? null,
  };
}

// Página anterior (scroll pra cima): mensagens mais antigas que o cursor.
export async function getMensagensAnteriores(
  pacienteId: string,
  before: string,
  ctx: { nutriAvatarUrl: string | null; pacienteAvatarUrl: string | null; primeiroNome: string },
): Promise<{ mensagens: Mensagem[]; hasMore: boolean; nextCursor: string | null }> {
  const { data } = await api.get<ThreadResp>(`/mensagens/thread/${pacienteId}`, { params: { before } });
  return {
    mensagens: mapMensagens(data.mensagens, ctx.nutriAvatarUrl, ctx.pacienteAvatarUrl, ctx.primeiroNome),
    hasMore: !!data.hasMore,
    nextCursor: data.nextCursor ?? null,
  };
}

export async function enviarMensagem(
  conversaId: string,
  conteudo: string,
  anexoBase64?: string,
): Promise<{ id: string; criadoEm: string; anexoUrl: string | null }> {
  const { data } = await api.post<{ id: string; conteudo: string; anexoUrl: string | null; criadoEm: string }>(
    `/mensagens/thread/${conversaId}`,
    { conteudo, anexoBase64 },
  );
  return { id: data.id, criadoEm: data.criadoEm, anexoUrl: data.anexoUrl ?? null };
}

export async function marcarLida(conversaId: string): Promise<void> {
  await api.patch(`/mensagens/thread/${conversaId}/lida`);
}

/* ── Formatação ── */

const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export function formatHora(iso: string | Date): string {
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Rótulo da lista: hora se hoje, "Ontem", senão dd/mm.
export function formatHoraLista(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const hoje = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dData = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDias = Math.round((hoje.getTime() - dData.getTime()) / 86_400_000);
  if (diffDias <= 0) return formatHora(d);
  if (diffDias === 1) return "Ontem";
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
}

export function formatData(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${pad(d.getDate())}/${MESES[d.getMonth()]}/${d.getFullYear()}`;
}
