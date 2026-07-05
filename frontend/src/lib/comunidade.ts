// Fonte única de verdade da Comunidade no client. Tipos da API + helpers (tempo relativo,
// badge por tipo, cor da liga). Consumido igualmente por web e mobile — a UI só renderiza.

export interface FeedPost {
  id: string;
  tipo: string; // META_BATIDA | PESO_ALCANCADO | CONQUISTA | MURAL
  categoria: string;
  mensagem: string;
  fotoUrl: string | null;
  autorAvatarUrl: string | null;
  curtidas: number;
  autorNutri: boolean;
  criadoEm: string;
  paciente: { id: string; nome: string; pacienteUser: { fotoUrl: string | null } | null } | null;
  _count: { comentarios: number };
}

export interface FeedResp {
  posts: FeedPost[];
  total: number;
  page: number;
  pages: number;
}

export interface Engajador {
  pacienteId: string;
  nome: string;
  foto: string | null;
  curtidas: number;
  posts: number;
}

/** É um post publicado pela nutri no Mural (sem paciente-alvo). */
export function isMural(p: FeedPost): boolean {
  return p.tipo === "MURAL" || !p.paciente;
}

/** Nome + avatar do autor do card (paciente, ou a própria nutri no Mural). */
export function autorDoPost(p: FeedPost, nutriNome: string): { nome: string; foto: string | null } {
  if (isMural(p)) return { nome: nutriNome, foto: p.autorAvatarUrl };
  return { nome: p.paciente!.nome, foto: p.paciente!.pacienteUser?.fotoUrl ?? null };
}

const CORES_LIGA: Record<string, string> = {
  bronze: "#CD7F32", prata: "#9CA3AF", ouro: "#F59E0B",
  diamante: "#60A5FA", mestre: "#A855F7", lendário: "#F97316", lendario: "#F97316",
};

/** Se a mensagem cita uma liga, devolve a cor dela (para o badge de Evolução de Liga). */
export function corLigaDaMensagem(msg: string): string | null {
  const m = msg.toLowerCase();
  for (const [liga, cor] of Object.entries(CORES_LIGA)) if (m.includes(liga)) return cor;
  return null;
}

export interface BadgeInfo { label: string; cor: string }

/** Badge por tipo, com cor da liga quando aplicável (spec: "na cor da liga/tertiary"). */
export function badgeDoPost(p: FeedPost): BadgeInfo {
  if (isMural(p)) return { label: "Mural da Nutri", cor: "#d2bbff" };
  switch (p.tipo) {
    case "META_BATIDA": return { label: "Meta Cumprida", cor: "#4edea3" };
    case "PESO_ALCANCADO": return { label: "Marco Atingido", cor: "#ffb95f" };
    case "CONQUISTA":
    default: return { label: "Evolução de Liga", cor: corLigaDaMensagem(p.mensagem) ?? "#d2bbff" };
  }
}

/** Timestamp relativo em PT-BR: "Agora", "Há 2h", "Ontem", "Há 3d". */
export function tempoRelativo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "Agora";
  if (min < 60) return `Há ${min}min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `Há ${h}h`;
  const d = Math.floor(h / 24);
  if (d === 1) return "Ontem";
  if (d < 7) return `Há ${d}d`;
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

/** Filtro de busca client-side sobre mensagem + nome do paciente. */
export function filtrarBusca(posts: FeedPost[], termo: string): FeedPost[] {
  const q = termo.trim().toLowerCase();
  if (!q) return posts;
  return posts.filter((p) => p.mensagem.toLowerCase().includes(q) || (p.paciente?.nome.toLowerCase().includes(q) ?? false));
}
