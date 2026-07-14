// Mapa central de deep-links das notificações push.
// Fonte ÚNICA das rotas SPA de destino — espelhado em frontend/public/sw.js
// (resolveDeepLink). Ao adicionar/alterar um destino, atualizar os DOIS lados.
//
// O payload de push passa a carregar { destination, id? } além do url resolvido.
// O service worker roteia a partir de destination+id (preservando o ?n= de rastreio).

export type Destino =
  // paciente
  | "conversation_paciente"
  | "registro"
  | "challenge"
  | "report"
  | "ligas"
  | "ranking"
  | "dashboard_paciente"
  | "feed_paciente"
  | "evolucao_paciente"
  | "conta_paciente"
  // nutricionista
  | "conversation_nutri"
  | "patient"
  | "app_ranking"
  | "app_feed";

export function deepLink(destination: string, id?: string | null): string {
  switch (destination) {
    // ── paciente ──
    case "conversation_paciente": return "/paciente/mensagens";
    case "registro":              return id ? `/paciente/registro?foco=${id}` : "/paciente/registro";
    case "challenge":             return id ? `/paciente/desafios?d=${id}` : "/paciente/desafios";
    case "report":                return id ? `/paciente/relatorio/${id}` : "/paciente/evolucao";
    case "ligas":                 return "/paciente/ligas";
    case "ranking":               return "/paciente/ranking";
    case "dashboard_paciente":    return "/paciente/dashboard";
    case "feed_paciente":         return "/paciente/feed";
    case "evolucao_paciente":     return "/paciente/evolucao";
    case "conta_paciente":        return "/paciente/conta";
    // ── nutricionista ──
    case "conversation_nutri":    return id ? `/app/mensagens/${id}` : "/app/mensagens";
    case "patient":               return id ? `/app/pacientes/${id}` : "/app/pacientes";
    case "app_ranking":           return "/app/ranking";
    case "app_feed":              return "/app/feed";
    default:                      return "/app/dashboard";
  }
}
