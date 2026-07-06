export type Screen =
  | "home"
  | "registro"
  | "desafios"
  | "ranking"
  | "perfil"
  | "progresso"
  | "evolucao"
  | "configuracoes"
  | "consultas"

export type Tab = "home" | "registro" | "desafios" | "ranking" | "perfil"

export type NavigateFn = (screen: Screen) => void
