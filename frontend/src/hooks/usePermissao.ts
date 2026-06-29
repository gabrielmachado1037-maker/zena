import { useAuth } from "../contexts/AuthContext";

const MODULOS_POR_PLANO: Record<string, string[]> = {
  hub: ["feed", "ranking", "gamificacao", "notificacoes"],
  ecossistema: [
    "feed", "ranking", "gamificacao", "notificacoes",
    "prontuario", "financeiro", "agenda", "plano_alimentar",
  ],
};

export function usePermissao() {
  const { nutricionista } = useAuth();

  const status = nutricionista?.subscriptionStatus ?? "trial";
  const planoSlug = nutricionista?.planoSlug ?? null;
  const modulosAtivos = nutricionista?.modulosAtivos ?? [];
  const emTrial = status === "trial";

  const temAcesso = (modulo: string): boolean => {
    if (emTrial) return true;
    if (status !== "ativo") return false;
    // Assinante legado sem planoSlug → acesso total
    if (!planoSlug) return true;
    // Verificar via modulosAtivos (vem do servidor) ou derivar do plano
    if (modulosAtivos.length > 0) return modulosAtivos.includes(modulo);
    return (MODULOS_POR_PLANO[planoSlug] ?? []).includes(modulo);
  };

  return { temAcesso, planoSlug, emTrial, subscriptionStatus: status };
}
