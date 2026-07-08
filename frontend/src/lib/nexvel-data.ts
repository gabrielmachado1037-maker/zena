import type { LucideIcon } from "lucide-react"
import {
  Utensils,
  Dumbbell,
  Droplets,
  Moon,
  ClipboardList,
  Footprints,
} from "lucide-react"

export const user = {
  name: "Lucas Almeida",
  firstName: "Lucas",
  avatar: "/avatars/lucas.png",
  league: "Ouro II",
  points: 1982,
  nextLeague: "Ouro I",
  pointsToNext: 218,
  streak: 17,
  todayPoints: 6,
  todayGoal: 10,
}

export type Mission = {
  id: string
  icon: LucideIcon
  title: string
  subtitle: string
  earned: number
  total: number
  done: boolean
}

export const missions: Mission[] = [
  {
    id: "alimentacao",
    icon: Utensils,
    title: "Alimentação",
    subtitle: "Registre suas refeições",
    earned: 3,
    total: 3,
    done: true,
  },
  {
    id: "treino",
    icon: Dumbbell,
    title: "Treino",
    subtitle: "Registre seu treino",
    earned: 2,
    total: 2,
    done: true,
  },
  {
    id: "agua",
    icon: Droplets,
    title: "Água",
    subtitle: "Beba 2L de água",
    earned: 1,
    total: 2,
    done: false,
  },
  {
    id: "sono",
    icon: Moon,
    title: "Sono",
    subtitle: "Durma pelo menos 7h",
    earned: 0,
    total: 2,
    done: false,
  },
  {
    id: "registro",
    icon: ClipboardList,
    title: "Registro diário",
    subtitle: "Compartilhe seu dia",
    earned: 0,
    total: 1,
    done: false,
  },
]

export type League = {
  name: string
  emoji: string
  range: string
  color: string
}

export const leagues: League[] = [
  { name: "Bronze", emoji: "🥉", range: "0–999", color: "#b45309" },
  { name: "Prata", emoji: "🥈", range: "1.000–1.749", color: "#94a3b8" },
  { name: "Ouro", emoji: "🏅", range: "1.750–2.499", color: "#f59e0b" },
  { name: "Diamante", emoji: "💎", range: "2.500–3.999", color: "#22d3ee" },
  { name: "Mestre", emoji: "⚔️", range: "4.000–5.999", color: "#a78bfa" },
  { name: "Lendário", emoji: "👑", range: "6.000+", color: "#f43f5e" },
]

export const currentLeagueIndex = 2

export type Achievement = {
  id: string
  icon: LucideIcon
  title: string
  description: string
  date: string
  tipo?: string
}

export const achievements: Achievement[] = [
  {
    id: "streak",
    icon: Footprints,
    title: "Sequência de 15 dias",
    description: "15 dias registrando sem falhar",
    date: "Há 2 dias",
  },
  {
    id: "hydration",
    icon: Droplets,
    title: "Hidratação em dia",
    description: "Meta de água por 7 dias",
    date: "Há 5 dias",
  },
  {
    id: "training",
    icon: Dumbbell,
    title: "Treino completo",
    description: "10 treinos registrados",
    date: "Há 1 semana",
  },
]

export const photoEntries = [
  {
    date: "23/05/2024",
    front: "/progress/front.png",
    side: "/progress/side.png",
  },
  {
    date: "16/05/2024",
    front: "/progress/front.png",
    side: "/progress/side.png",
  },
]

export type Measure = {
  label: string
  value: string
  delta: number
}

export const measures: Measure[] = [
  { label: "Peito", value: "102 cm", delta: -1 },
  { label: "Cintura", value: "78 cm", delta: -2 },
  { label: "Abdômen", value: "86 cm", delta: -1 },
  { label: "Quadril", value: "98 cm", delta: 0 },
  { label: "Braço D.", value: "34 cm", delta: 0 },
  { label: "Braço E.", value: "34 cm", delta: -1 },
  { label: "Coxa D.", value: "58 cm", delta: 0 },
  { label: "Coxa E.", value: "58 cm", delta: -1 },
]

export const weightData = [
  { date: "01/03", peso: 81.0 },
  { date: "15/03", peso: 80.4 },
  { date: "01/04", peso: 79.8 },
  { date: "15/04", peso: 79.5 },
  { date: "01/05", peso: 79.0 },
  { date: "15/05", peso: 78.7 },
  { date: "23/05", peso: 78.5 },
]

export const weightHistory = [
  { date: "23/05/2024", value: "78,5 kg", delta: "-0,2 kg" },
  { date: "15/05/2024", value: "78,7 kg", delta: "-0,3 kg" },
  { date: "01/05/2024", value: "79,0 kg", delta: "-0,5 kg" },
  { date: "15/04/2024", value: "79,5 kg", delta: "-0,3 kg" },
  { date: "01/04/2024", value: "79,8 kg", delta: "-0,6 kg" },
]

export const moods = [
  { emoji: "😡", label: "Muito mal" },
  { emoji: "😔", label: "Mal" },
  { emoji: "😐", label: "Neutro" },
  { emoji: "😊", label: "Muito bem" },
  { emoji: "😄", label: "Ótimo" },
]

export const moodHistory = [
  { date: "22/05/2024", emoji: "😄", label: "Ótimo" },
  { date: "21/05/2024", emoji: "😊", label: "Muito bem" },
  { date: "20/05/2024", emoji: "😐", label: "Neutro" },
  { date: "19/05/2024", emoji: "😊", label: "Muito bem" },
]

export type Challenge = {
  id: string
  icon: LucideIcon
  title: string
  description: string
  progress: number
  remaining: string
  color: string
  status: "ativo" | "concluido"
  xp?: number
  tipo?: string
  diasCumpridos?: number
  duracaoDias?: number
}

export const challenges: Challenge[] = [
  {
    id: "constancia",
    icon: Footprints,
    title: "Desafio 7 Dias de Constância",
    description: "Conclua todos os registros",
    progress: 68,
    remaining: "Faltam 2 dias",
    color: "var(--primary)",
    status: "ativo",
  },
  {
    id: "hidratacao",
    icon: Droplets,
    title: "Desafio Hidratação",
    description: "Beba 2L de água por dia",
    progress: 45,
    remaining: "Faltam 3 dias",
    color: "var(--blue)",
    status: "ativo",
  },
  {
    id: "sono",
    icon: Moon,
    title: "Desafio Sono",
    description: "Durma pelo menos 7h por dia",
    progress: 30,
    remaining: "Faltam 5 dias",
    color: "var(--green)",
    status: "ativo",
  },
  {
    id: "cardio",
    icon: Dumbbell,
    title: "Desafio Cardio 30",
    description: "30 min de cardio por dia",
    progress: 100,
    remaining: "Concluído",
    color: "var(--green)",
    status: "concluido",
  },
  {
    id: "acucar",
    icon: Utensils,
    title: "Desafio Zero Açúcar",
    description: "5 dias sem açúcar refinado",
    progress: 100,
    remaining: "Concluído",
    color: "var(--green)",
    status: "concluido",
  },
]

export type RankUser = {
  position: number
  name: string
  league: string
  points: number
  avatar: string
  me?: boolean
}

export const ranking: RankUser[] = [
  {
    position: 1,
    name: "Lucas Almeida",
    league: "Ouro II",
    points: 2850,
    avatar: "/avatars/lucas.png",
    me: true,
  },
  {
    position: 2,
    name: "Fernanda Costa",
    league: "Ouro I",
    points: 2650,
    avatar: "/avatars/fernanda.png",
  },
  {
    position: 3,
    name: "Rafael Lima",
    league: "Prata I",
    points: 2400,
    avatar: "/avatars/rafael.png",
  },
  {
    position: 4,
    name: "Juliana Martins",
    league: "Prata II",
    points: 2150,
    avatar: "/avatars/juliana.png",
  },
  {
    position: 5,
    name: "Carlos Eduardo",
    league: "Ouro II",
    points: 1980,
    avatar: "/avatars/carlos.png",
  },
]

export const friendsRanking: RankUser[] = [
  {
    position: 1,
    name: "Fernanda Costa",
    league: "Ouro I",
    points: 2650,
    avatar: "/avatars/fernanda.png",
  },
  {
    position: 2,
    name: "Lucas Almeida",
    league: "Ouro II",
    points: 1982,
    avatar: "/avatars/lucas.png",
    me: true,
  },
  {
    position: 3,
    name: "Carlos Eduardo",
    league: "Ouro II",
    points: 1980,
    avatar: "/avatars/carlos.png",
  },
  {
    position: 4,
    name: "Juliana Martins",
    league: "Prata II",
    points: 1740,
    avatar: "/avatars/juliana.png",
  },
]
