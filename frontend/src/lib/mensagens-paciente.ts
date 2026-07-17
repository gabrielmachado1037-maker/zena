// Mensagens do paciente com a nutri — tipos + acesso à API real
// (/api/paciente-app/mensagens). Mesma conversa (MensagemChat) da tela da nutri,
// aqui pela ótica do paciente: "paciente" = eu, "nutri" = a profissional.
import apiPaciente from "./apiPaciente";

export type Autor = "paciente" | "nutri";

export interface MensagemNutri {
  id: string;
  autor: Autor;
  texto: string;
  hora: string; // "10:30"
  anexoUrl?: string | null;
  criadoEm: string; // ISO — usado pra agrupar por dia
}

export interface ThreadNutri {
  nutriNome: string;
  nutriAvatarUrl: string | null;
  mensagens: MensagemNutri[];
  hasMore: boolean;
  nextCursor: string | null;
}

interface ThreadResp {
  nutriNome: string;
  nutriAvatarUrl: string | null;
  mensagens: { id: string; autor: Autor; conteudo: string; anexoUrl?: string | null; criadoEm: string }[];
  hasMore?: boolean;
  nextCursor?: string | null;
}

export function formatHora(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

/** Rótulo de dia pra separadores da timeline (Hoje / Ontem / data). */
export function rotuloDia(iso: string): string {
  const d = new Date(iso);
  const hoje = new Date();
  const ontem = new Date();
  ontem.setDate(hoje.getDate() - 1);
  const mesmoDia = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  if (mesmoDia(d, hoje)) return "Hoje";
  if (mesmoDia(d, ontem)) return "Ontem";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long" });
}

/* ── API ── */

function mapMensagens(msgs: ThreadResp["mensagens"]): MensagemNutri[] {
  return msgs.map((m) => ({
    id: m.id,
    autor: m.autor,
    texto: m.conteudo,
    hora: formatHora(m.criadoEm),
    anexoUrl: m.anexoUrl ?? null,
    criadoEm: m.criadoEm,
  }));
}

// 1ª página da conversa (mensagens mais recentes) + dados da nutri.
export async function getMensagensNutri(): Promise<ThreadNutri> {
  const { data } = await apiPaciente.get<ThreadResp>("/paciente-app/mensagens");
  return {
    nutriNome: data.nutriNome,
    nutriAvatarUrl: data.nutriAvatarUrl,
    mensagens: mapMensagens(data.mensagens),
    hasMore: !!data.hasMore,
    nextCursor: data.nextCursor ?? null,
  };
}

// Página anterior (scroll pra cima): mensagens mais antigas que o cursor.
export async function getMensagensNutriAnteriores(
  before: string,
): Promise<{ mensagens: MensagemNutri[]; hasMore: boolean; nextCursor: string | null }> {
  const { data } = await apiPaciente.get<ThreadResp>("/paciente-app/mensagens", { params: { before } });
  return {
    mensagens: mapMensagens(data.mensagens),
    hasMore: !!data.hasMore,
    nextCursor: data.nextCursor ?? null,
  };
}

export async function enviarMensagemNutri(conteudo: string): Promise<MensagemNutri> {
  const { data } = await apiPaciente.post<{
    id: string; autor: Autor; conteudo: string; anexoUrl?: string | null; criadoEm: string;
  }>("/paciente-app/mensagens", { conteudo });
  return {
    id: data.id,
    autor: data.autor,
    texto: data.conteudo,
    hora: formatHora(data.criadoEm),
    anexoUrl: data.anexoUrl ?? null,
    criadoEm: data.criadoEm,
  };
}
