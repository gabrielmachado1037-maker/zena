import type { Prisma } from "@prisma/client";
import prisma from "./prisma";

// Paginação por cursor das threads de MensagemChat. Sem isto o backend carregava
// TODAS as mensagens de uma conversa (cresce sem limite) — aqui buscamos só uma
// página das mais recentes e voltamos por cursor para as anteriores.
export const MSGS_POR_PAGINA = 30;
export const MSGS_MAX = 50;

export function parseMsgPaginacao(query: Record<string, unknown>): { limit: number; before: string | null } {
  const raw = parseInt(String(query["limit"] ?? MSGS_POR_PAGINA), 10);
  const limit = Math.min(MSGS_MAX, Math.max(1, Number.isFinite(raw) ? raw : MSGS_POR_PAGINA));
  const before = typeof query["before"] === "string" && query["before"] ? (query["before"] as string) : null;
  return { limit, before };
}

// Busca a página das `limit` mensagens mais recentes (ou as anteriores a `before`),
// devolvidas em ordem ASC (cronológica) prontas para render. Cursor por `id` (estável,
// à prova de colisão de timestamp). `nextCursor` = id da mais antiga da página (só se hasMore).
export async function buscarPaginaMensagens(
  where: Prisma.MensagemChatWhereInput,
  limit: number,
  before: string | null,
): Promise<{
  pagina: Array<{ id: string; autor: string; conteudo: string; anexoUrl: string | null; criadoEm: Date }>;
  hasMore: boolean;
  nextCursor: string | null;
}> {
  const rows = await prisma.mensagemChat.findMany({
    where,
    orderBy: [{ criadoEm: "desc" }, { id: "desc" }],
    take: limit + 1,
    ...(before ? { cursor: { id: before }, skip: 1 } : {}),
    select: { id: true, autor: true, conteudo: true, anexoUrl: true, criadoEm: true },
  });
  const hasMore = rows.length > limit;
  const pagina = (hasMore ? rows.slice(0, limit) : rows).reverse(); // desc → asc
  const nextCursor = hasMore && pagina.length ? pagina[0]!.id : null;
  return { pagina, hasMore, nextCursor };
}
