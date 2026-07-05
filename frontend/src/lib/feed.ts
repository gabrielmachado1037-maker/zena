// Tipos e utilitários compartilhados do Feed.
// (A página Feed.tsx foi esvaziada; estes exports vivem aqui para as telas que ainda os usam.)

export interface FeedPost {
  id: string;
  categoria: string;
  mensagem?: string | null;
  fotoUrl?: string | null;
  privacidade: string;
  autorNutri: boolean;
  autorAvatarUrl?: string | null;
  curtidas: number;
  criadoEm: string;
  paciente: {
    id: string;
    nome: string;
    pacienteUser?: { fotoUrl?: string | null } | null;
  };
  _count?: { comentarios: number };
}

/** Formata uma data ISO como tempo relativo em pt-BR (ex.: "há 2h"). */
export function tempoRelativo(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return "agora";
  if (diff < 3600) return `há ${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `há ${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `há ${Math.floor(diff / 86400)}d`;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}
