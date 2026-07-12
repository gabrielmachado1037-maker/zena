import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import {
  Utensils, Dumbbell, Droplets, Moon, ClipboardList, Trophy,
  Footprints, Medal, Camera, Crown, Award, type LucideIcon,
} from "lucide-react";
import apiPaciente from "./apiPaciente";
import { progressoLiga, calcularXpAlimentacao, resolverPlanoRefeicoes, calcularXpSonoMeta, SONO_META_HORAS_PADRAO, type RefeicaoPlano } from "./ligas";
import type { Mission, Challenge, Achievement, RankUser, Measure } from "./nexvel-data";

/* ─────────── shapes das respostas da API ─────────── */
interface ResumoResp {
  paciente: {
    nome: string; pontosTotal: number; ligaAtual: string; ligaNivel: string;
    streakAtual: number; streakMaximo: number; barraCongelada: boolean;
  };
  planoRefeicoes?: RefeicaoPlano[] | null;
  metas?: { aguaMl: number; sonoHoras: number; treinoDiaHoje: boolean } | null;
  registroHoje: {
    pontosGanhos: number; alimentacaoOk: boolean; treinoOk: boolean; aguaOk: boolean; sonoOk: boolean; humor: string | null;
    cafeStatus: string | null; almocoStatus: string | null; lancheStatus: string | null; jantarStatus: string | null;
    refeicoesStatus: Record<string, string | null> | null;
    refeicoesNotas: Record<string, { nota?: string; motivo?: string }> | null;
    aguaMl: number | null; aguaMetaMl: number | null; finalizado: boolean;
    treinoStatus: string | null; treinoMotivo: string | null; sonoFaixa: string | null; sonoHoras: number | null;
  } | null;
  feitoHoje: boolean;
  conquistas: { id: string; tipo: string; titulo: string; descricao: string | null; createdAt: string }[];
}
interface RankResp { pos: number; nome: string; fotoPerfilUrl: string | null; pontosTotal: number; ligaAtual: string; ligaNivel: string; isMe: boolean }
interface DesafioResp { id: string; titulo: string; descricao: string | null; tipo: string; duracaoDias: number; dataFim: string | null; progresso: number; diasCumpridos: number; adesaoMinima: number; concluido: boolean; encerrado?: boolean; pontosBonus?: number; manual?: boolean; streak?: number; hojeConcluido?: boolean; dias?: { dia: number; status: "done" | "today" | "pending" | "missed" }[] }
interface EvolucaoResp {
  fotos: { id: string; data: string; fotoUrl: string | null }[];
  medicoes: { data: string; peso: number; cintura?: number | null; quadril?: number | null; braco?: number | null; coxa?: number | null }[];
  humores: { data: string; humor: string | null }[];
}

export interface PacienteUser {
  name: string; firstName: string; avatar: string;
  league: string; points: number; nextLeague: string; pointsToNext: number;
  streak: number; streakBest: number; todayPoints: number; todayGoal: number; leagueProgress: number;
}
export interface MealState { status: string | null; nota?: string; motivo?: string }
export interface TodayState {
  finalizado: boolean;
  planoRefeicoes: RefeicaoPlano[];
  refeicoes: Record<string, MealState>;
  aguaMl: number;
  aguaMetaMl: number;
  treinoStatus: string | null;
  treinoMotivo: string | null;
  treinoDiaHoje: boolean;
  sonoFaixa: string | null;
  sonoHoras: number | null;
  sonoMetaHoras: number;
  humor: string | null;
  xpAlimentacao: number;
  xpTreino: number;
  xpSono: number;
}

export const XP_TREINO: Record<string, number> = { conforme: 3, parcial: 1, nao: 0 };
export const XP_SONO: Record<string, number> = { menos5: 0, "5a7": 1, "7a9": 2, mais9: 2 };
interface WeightPoint { date: string; peso: number }
interface WeightHist { date: string; value: string; delta: string }
interface PhotoEntry { date: string; front: string; side: string }
interface MoodHist { date: string; emoji: string; label: string }

export interface PacienteData {
  loading: boolean;
  user: PacienteUser;
  today: TodayState;
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
        streakBest: p?.streakMaximo ?? 0,
        todayPoints: rh?.pontosGanhos ?? 0,
        todayGoal: 12,
        leagueProgress: prog.pct,
      };

      // Estado do dia (hidrata a tela Registro a partir do servidor)
      const plano = resolverPlanoRefeicoes(resumo?.planoRefeicoes);
      const planoKeys = plano.map((r) => r.key);
      const notas = (rh?.refeicoesNotas ?? {}) as Record<string, { nota?: string; motivo?: string }>;
      // Fonte da verdade: refeicoesStatus; fallback p/ colunas legadas (registros antigos).
      const rawStatus = (rh?.refeicoesStatus ?? null) as Record<string, string | null> | null;
      const statusOf = (k: string): string | null =>
        rawStatus ? rawStatus[k] ?? null : rh ? ((rh as any)[`${k}Status`] as string | null) : null;
      const xpAlim = calcularXpAlimentacao(planoKeys.map(statusOf));
      const refeicoes = Object.fromEntries(
        planoKeys.map((k) => [k, { status: statusOf(k), nota: notas[k]?.nota, motivo: notas[k]?.motivo }]),
      ) as TodayState["refeicoes"];
      // Metas configuradas pela nutri (fallback = padrão do sistema).
      const metas = resumo?.metas ?? { aguaMl: 3000, sonoHoras: SONO_META_HORAS_PADRAO, treinoDiaHoje: true };
      const sonoHorasVal = rh?.sonoHoras ?? null;
      const xpSono = calcularXpSonoMeta(sonoHorasVal, metas.sonoHoras);
      // Dia de descanso (fora dos dias de treino da nutri): treino creditado automaticamente.
      const xpTreino = metas.treinoDiaHoje ? (XP_TREINO[rh?.treinoStatus ?? ""] ?? 0) : 3;
      const today: TodayState = {
        finalizado: !!resumo?.feitoHoje,
        planoRefeicoes: plano,
        refeicoes,
        aguaMl: rh?.aguaMl ?? 0,
        aguaMetaMl: metas.aguaMl,
        treinoStatus: rh?.treinoStatus ?? null,
        treinoMotivo: rh?.treinoMotivo ?? null,
        treinoDiaHoje: metas.treinoDiaHoje,
        sonoFaixa: rh?.sonoFaixa ?? null,
        sonoHoras: sonoHorasVal,
        sonoMetaHoras: metas.sonoHoras,
        humor: rh?.humor ?? null,
        xpAlimentacao: xpAlim,
        xpTreino,
        xpSono,
      };

      const metaLabelL = (metas.aguaMl / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 });
      const missions: Mission[] = [
        { id: "alimentacao", icon: Utensils, title: "Alimentação", subtitle: "Registre suas refeições", earned: xpAlim, total: 4, done: xpAlim >= 3 },
        { id: "treino", icon: Dumbbell, title: "Treino", subtitle: metas.treinoDiaHoje ? "Como foi seu treino?" : "Dia de descanso", earned: xpTreino, total: 3, done: xpTreino > 0 },
        { id: "agua", icon: Droplets, title: "Água", subtitle: `Beba ${metaLabelL}L de água`, earned: rh?.aguaOk ? 2 : 0, total: 2, done: !!rh?.aguaOk },
        { id: "sono", icon: Moon, title: "Sono", subtitle: `Meta: ${metas.sonoHoras}h de sono`, earned: xpSono, total: 2, done: xpSono > 0 },
        { id: "registro", icon: ClipboardList, title: "Registro diário", subtitle: "Compartilhe seu dia", earned: resumo?.feitoHoje ? 1 : 0, total: 1, done: !!resumo?.feitoHoje },
      ];

      const challenges: Challenge[] = desafiosRaw
        // Esconde desafios encerrados sem vitória (não entram em "Concluídos").
        .filter((d) => !(d.encerrado && !d.concluido))
        .map((d) => {
          const st = DESAFIO_STYLE[d.tipo] ?? DESAFIO_STYLE.custom;
          const min = d.adesaoMinima ?? d.duracaoDias;
          const bateuMeta = d.diasCumpridos >= min;
          let remaining: string;
          if (d.concluido || bateuMeta) remaining = "Meta concluída";
          else {
            const faltam = Math.max(0, min - d.diasCumpridos);
            remaining = `Faltam ${faltam} dia${faltam > 1 ? "s" : ""}`;
          }
          return {
            id: d.id, icon: st.icon, title: d.titulo, description: d.descricao ?? "",
            progress: d.duracaoDias ? Math.round((d.diasCumpridos / d.duracaoDias) * 100) : Math.round(d.progresso),
            remaining, color: st.color,
            status: d.concluido ? "concluido" : "ativo",
            xp: d.pontosBonus, tipo: d.tipo,
            diasCumpridos: d.diasCumpridos, duracaoDias: d.duracaoDias,
            adesaoMinima: min, streak: d.streak ?? 0, manual: d.manual ?? false,
            hojeConcluido: d.hojeConcluido ?? false, dias: d.dias ?? [],
          };
        });

      const achievements: Achievement[] = (resumo?.conquistas ?? []).map((c) => ({
        id: c.id, icon: CONQUISTA_ICON[c.tipo] ?? Award, tipo: c.tipo,
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
        loading: false, user, today, missions, challenges, achievements, currentLeagueIndex,
        ranking, friendsRanking: ranking, myPosition, stats,
        measures, weightData, weightHistory, pesoAtual, pesoDelta, photoEntries, moodHistory,
        reload: load,
      });
  }, []);

  useEffect(() => { void load(); }, [load]);

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: "#09090B" }}>
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-t-transparent"
          style={{ borderColor: "#7CFF5B", borderTopColor: "transparent" }} />
      </div>
    );
  }

  return <Ctx.Provider value={data}>{children}</Ctx.Provider>;
}
