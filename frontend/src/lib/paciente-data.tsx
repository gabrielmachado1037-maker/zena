import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import {
  Utensils, Dumbbell, Droplets, Moon, ClipboardList, Trophy,
  Footprints, Medal, Camera, Crown, Award, type LucideIcon,
} from "lucide-react";
import apiPaciente from "./apiPaciente";
import { progressoLiga } from "./ligas";
import type { Mission, Challenge, Achievement, RankUser, Measure } from "./nexvel-data";

/* ─────────── shapes das respostas da API ─────────── */
interface ResumoResp {
  paciente: {
    nome: string; pontosTotal: number; ligaAtual: string; ligaNivel: string;
    streakAtual: number; streakMaximo: number; barraCongelada: boolean;
  };
  registroHoje: {
    pontosGanhos: number; alimentacaoOk: boolean; treinoOk: boolean; aguaOk: boolean; sonoOk: boolean; humor: string | null;
  } | null;
  feitoHoje: boolean;
  conquistas: { id: string; tipo: string; titulo: string; descricao: string | null; createdAt: string }[];
}
interface RankResp { pos: number; nome: string; fotoPerfilUrl: string | null; pontosTotal: number; ligaAtual: string; ligaNivel: string; isMe: boolean }
interface DesafioResp { id: string; titulo: string; descricao: string | null; tipo: string; duracaoDias: number; dataFim: string | null; progresso: number; concluido: boolean }
interface EvolucaoResp {
  fotos: { id: string; data: string; fotoUrl: string | null }[];
  medicoes: { data: string; peso: number; cintura?: number | null; quadril?: number | null; braco?: number | null; coxa?: number | null }[];
  humores: { data: string; humor: string | null }[];
}

export interface PacienteUser {
  name: string; firstName: string; avatar: string;
  league: string; points: number; nextLeague: string; pointsToNext: number;
  streak: number; todayPoints: number; todayGoal: number; leagueProgress: number;
}
interface WeightPoint { date: string; peso: number }
interface WeightHist { date: string; value: string; delta: string }
interface PhotoEntry { date: string; front: string; side: string }
interface MoodHist { date: string; emoji: string; label: string }

export interface PacienteData {
  loading: boolean;
  user: PacienteUser;
  missions: Mission[];
  challenges: Challenge[];
  achievements: Achievement[];
  currentLeagueIndex: number;
  ranking: RankUser[];
  friendsRanking: RankUser[];
  myPosition: number;
  stats: { label: string; value: number }[];
  measures: Measure[];
  weightData: WeightPoint[];
  weightHistory: WeightHist[];
  pesoAtual: string;
  pesoDelta: string;
  photoEntries: PhotoEntry[];
  moodHistory: MoodHist[];
  reload: () => Promise<void>;
}

/* ─────────── helpers ─────────── */
const LEAGUE_ORDER = ["Bronze", "Prata", "Ouro", "Diamante", "Mestre", "Lendário"];
const nf = (n: number) => n.toLocaleString("pt-BR");
const d2 = (iso: string) => { const d = new Date(iso); return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`; };
const d3 = (iso: string) => { const d = new Date(iso); return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`; };
const kg = (n: number) => `${n.toFixed(1).replace(".", ",")} kg`;
const cm = (n: number) => `${Math.round(n)} cm`;

function relDays(iso: string): string {
  const dias = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (dias <= 0) return "Hoje";
  if (dias === 1) return "Ontem";
  if (dias < 7) return `Há ${dias} dias`;
  const semanas = Math.floor(dias / 7);
  return semanas === 1 ? "Há 1 semana" : `Há ${semanas} semanas`;
}

const DESAFIO_STYLE: Record<string, { color: string; icon: LucideIcon }> = {
  hidratacao: { color: "var(--blue)", icon: Droplets },
  alimentacao: { color: "var(--gold)", icon: Utensils },
  treino: { color: "var(--primary)", icon: Dumbbell },
  sono: { color: "var(--green)", icon: Moon },
  custom: { color: "var(--primary)", icon: Trophy },
};
const CONQUISTA_ICON: Record<string, LucideIcon> = {
  sequencia_7: Footprints, sequencia_30: Footprints, subiu_liga: Medal,
  desafio_concluido: Trophy, checkpoint_foto: Camera, lendario: Crown,
};
const MOOD_MAP: Record<string, { emoji: string; label: string }> = {
  otimo: { emoji: "😄", label: "Ótimo" },
  bom: { emoji: "😊", label: "Bom" },
  neutro: { emoji: "😐", label: "Neutro" },
  dificil: { emoji: "😔", label: "Difícil" },
  pessimo: { emoji: "😡", label: "Ruim" },
};

/* ─────────── contexto ─────────── */
const Ctx = createContext<PacienteData | null>(null);
export const usePacienteData = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error("usePacienteData deve ser usado dentro de <PacienteDataProvider>");
  return v;
};

export function PacienteDataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<PacienteData | null>(null);

  const load = useCallback(async () => {
      const [resumoR, rankingR, desafiosR, evolucaoR] = await Promise.allSettled([
        apiPaciente.get<ResumoResp>("/registros/resumo"),
        apiPaciente.get<RankResp[]>("/registros/ranking"),
        apiPaciente.get<DesafioResp[]>("/registros/desafios"),
        apiPaciente.get<EvolucaoResp>("/registros/evolucao"),
      ]);

      const resumo = resumoR.status === "fulfilled" ? resumoR.value.data : null;
      const rankingRaw = rankingR.status === "fulfilled" ? rankingR.value.data : [];
      const desafiosRaw = desafiosR.status === "fulfilled" ? desafiosR.value.data : [];
      const evo = evolucaoR.status === "fulfilled" ? evolucaoR.value.data : { fotos: [], medicoes: [], humores: [] };

      const p = resumo?.paciente;
      const pontos = p?.pontosTotal ?? 0;
      const prog = progressoLiga(pontos);
      const rh = resumo?.registroHoje;

      const user: PacienteUser = {
        name: p?.nome ?? "—",
        firstName: (p?.nome ?? "—").split(" ")[0],
        avatar: "/placeholder.svg",
        league: p ? `${p.ligaAtual} ${p.ligaNivel}` : "—",
        points: pontos,
        nextLeague: prog.proxima ? `${prog.proxima.liga} ${prog.proxima.nivel}` : "Liga máxima",
        pointsToNext: prog.faltam,
        streak: p?.streakAtual ?? 0,
        todayPoints: rh?.pontosGanhos ?? 0,
        todayGoal: 10,
        leagueProgress: prog.pct,
      };

      const missions: Mission[] = [
        { id: "alimentacao", icon: Utensils, title: "Alimentação", subtitle: "Registre suas refeições", earned: rh?.alimentacaoOk ? 3 : 0, total: 3, done: !!rh?.alimentacaoOk },
        { id: "treino", icon: Dumbbell, title: "Treino", subtitle: "Registre seu treino", earned: rh?.treinoOk ? 2 : 0, total: 2, done: !!rh?.treinoOk },
        { id: "agua", icon: Droplets, title: "Água", subtitle: "Beba 2L de água", earned: rh?.aguaOk ? 2 : 0, total: 2, done: !!rh?.aguaOk },
        { id: "sono", icon: Moon, title: "Sono", subtitle: "Durma pelo menos 7h", earned: rh?.sonoOk ? 2 : 0, total: 2, done: !!rh?.sonoOk },
        { id: "registro", icon: ClipboardList, title: "Registro diário", subtitle: "Compartilhe seu dia", earned: resumo?.feitoHoje ? 1 : 0, total: 1, done: !!resumo?.feitoHoje },
      ];

      const challenges: Challenge[] = desafiosRaw.map((d) => {
        const st = DESAFIO_STYLE[d.tipo] ?? DESAFIO_STYLE.custom;
        let remaining = "Concluído";
        if (!d.concluido) {
          if (d.dataFim) {
            const dias = Math.max(0, Math.ceil((new Date(d.dataFim).getTime() - Date.now()) / 86_400_000));
            remaining = `Faltam ${dias} dias`;
          } else remaining = `${d.duracaoDias} dias`;
        }
        return {
          id: d.id, icon: st.icon, title: d.titulo, description: d.descricao ?? "",
          progress: Math.round(d.progresso), remaining, color: st.color,
          status: d.concluido ? "concluido" : "ativo",
        };
      });

      const achievements: Achievement[] = (resumo?.conquistas ?? []).map((c) => ({
        id: c.id, icon: CONQUISTA_ICON[c.tipo] ?? Award,
        title: c.titulo, description: c.descricao ?? "", date: relDays(c.createdAt),
      }));

      const ranking: RankUser[] = rankingRaw.map((r) => ({
        position: r.pos, name: r.nome, league: `${r.ligaAtual} ${r.ligaNivel}`,
        points: r.pontosTotal, avatar: r.fotoPerfilUrl || "/placeholder.svg", me: r.isMe,
      }));
      const myPosition = ranking.find((r) => r.me)?.position ?? 0;

      // medições → peso e medidas
      const med = evo.medicoes ?? [];
      const weightData: WeightPoint[] = med.map((m) => ({ date: d2(m.data), peso: m.peso }));
      const weightHistory: WeightHist[] = [...med].reverse().map((m, i, arr) => {
        const prev = arr[i + 1];
        const delta = prev ? m.peso - prev.peso : 0;
        return { date: d3(m.data), value: kg(m.peso), delta: `${delta > 0 ? "+" : ""}${delta.toFixed(1).replace(".", ",")} kg` };
      });
      const pesoAtual = med.length ? kg(med[med.length - 1].peso) : "—";
      const pesoDelta = med.length > 1
        ? `${(med[med.length - 1].peso - med[0].peso) > 0 ? "+" : ""}${(med[med.length - 1].peso - med[0].peso).toFixed(1).replace(".", ",")} kg desde início`
        : "—";

      const last = med[med.length - 1];
      const prevM = med[med.length - 2];
      const measures: Measure[] = [];
      const addMeasure = (label: string, v?: number | null, pv?: number | null) => {
        if (v == null) return;
        measures.push({ label, value: cm(v), delta: pv != null ? Math.round(v - pv) : 0 });
      };
      if (last) {
        addMeasure("Cintura", last.cintura, prevM?.cintura);
        addMeasure("Quadril", last.quadril, prevM?.quadril);
        addMeasure("Braço", last.braco, prevM?.braco);
        addMeasure("Coxa", last.coxa, prevM?.coxa);
      }

      const photoEntries: PhotoEntry[] = (evo.fotos ?? [])
        .filter((f) => f.fotoUrl)
        .reverse()
        .map((f) => ({ date: d3(f.data), front: f.fotoUrl as string, side: "/placeholder.svg" }));

      const moodHistory: MoodHist[] = (evo.humores ?? [])
        .filter((h) => h.humor)
        .slice(0, 6)
        .map((h) => {
          const m = MOOD_MAP[h.humor as string] ?? { emoji: "😐", label: h.humor as string };
          return { date: d3(h.data), emoji: m.emoji, label: m.label };
        });

      const stats = [
        { label: "Conquistas", value: achievements.length },
        { label: "Medidas", value: med.length },
        { label: "Desafios", value: challenges.length },
      ];

      const currentLeagueIndex = Math.max(0, LEAGUE_ORDER.indexOf(p?.ligaAtual ?? "Bronze"));

      setData({
        loading: false, user, missions, challenges, achievements, currentLeagueIndex,
        ranking, friendsRanking: ranking, myPosition, stats,
        measures, weightData, weightHistory, pesoAtual, pesoDelta, photoEntries, moodHistory,
        reload: load,
      });
  }, []);

  useEffect(() => { void load(); }, [load]);

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: "#0D0D1A" }}>
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-t-transparent"
          style={{ borderColor: "#7C3AED", borderTopColor: "transparent" }} />
      </div>
    );
  }

  return <Ctx.Provider value={data}>{children}</Ctx.Provider>;
}
