import { useNavigate } from "react-router-dom"
import type { Screen } from "./types"

const ROUTES: Record<Screen, string> = {
  home: "/paciente/dashboard",
  registro: "/paciente/registro",
  desafios: "/paciente/desafios",
  ranking: "/paciente/ranking",
  perfil: "/paciente/conta",
  progresso: "/paciente/progresso",
  evolucao: "/paciente/evolucao",
}

/** onNavigate compatível com as telas v0, mapeando Screen → rota do react-router. */
export function useScreenNav() {
  const navigate = useNavigate()
  return (screen: Screen) => navigate(ROUTES[screen])
}
