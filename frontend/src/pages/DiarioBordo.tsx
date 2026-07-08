import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ChevronLeft, ChevronRight, Filter,
  Utensils, Droplet, Dumbbell, Moon, CheckCircle2, XCircle, Sparkles,
  Lightbulb, AlertTriangle, BadgeCheck, Flame, Send, SlidersHorizontal,
  TrendingDown, TrendingUp, Target, ShieldAlert, ShieldCheck,
  CalendarClock, CalendarDays, Sparkle, FileBarChart2, type LucideIcon,
} from "lucide-react";
import api from "../lib/api";
import Avatar from "../components/Avatar";
import { progressoLiga, diasDesde, resolverPlanoRefeicoes, PLANO_REFEICOES_PADRAO, type RefeicaoPlano } from "../lib/ligas";
import { gerarInsights, type Insight, type InsightTone } from "../lib/insights";
import { LeagueCrest, LeagueBadge, ProgressBarNx } from "../components/ui-nx";
import DesafiosTab from "../components/diario/DesafiosTab";
import LigaPontosTab from "../components/diario/LigaPontosTab";
import EvolucaoTab from "../components/diario/EvolucaoTab";
import MensagensTab from "../components/diario/MensagensTab";
import type {
  DesafioProgressoItem, MedicaoItem, FotoEvolucaoItem, PontosLogItem, StreakMarcoItem, ConquistaItem,
} from "../lib/diario";

/* ───────── shapes reais (GET /diario/:id) ───────── */
interface Registro {
  id: string; data: string;
  alimentacaoOk: boolean; treinoOk: boolean; aguaOk: boolean; sonoOk: boolean;
  cafeOk: boolean | null; almocoOk: boolean | null; lancheOk: boolean | null; jantarOk: boolean | null;
  tipoRegistro: string; descricao: string | null; humor: string | null;
  pontosGanhos: number; pediuAjuste: boolean; motivoAjuste: string | null;
}
interface DiarioData {
  paciente: {
    id: string; nome: string; objetivo: string; fotoPerfilUrl: string | null;
    pesoMeta: number | null;
    pontosTotal: number; ligaAtual: string; ligaNivel: string;
    streakAtual: number; streakMaximo: number; ultimoCheckin: string | null;
    planoRefeicoes?: RefeicaoPlano[] | null;
    aguaMetaMl?: number | null; sonoMetaHoras?: number | null; treinoDias?: number[] | null;
  };
  registros: Registro[];
  desafios: DesafioProgressoItem[];
  conquistas: ConquistaItem[];
  medicoes: MedicaoItem[];
  fotosEvolucao: FotoEvolucaoItem[];
  pontosLog: PontosLogItem[];
  streakMarcos: StreakMarcoItem[];
}
interface RankingItem { pacienteId: string; posicaoRanking: number }

const TABS = ["Linha do tempo", "Evolução", "Liga & Pontos", "Desafios", "Mensagens"] as const;
const HUMOR: Record<string, string> = { otimo: "😄", bom: "🙂", neutro: "😐", dificil: "😔", pessimo: "😢" };
const DIAS = ["SEG", "TER", "QUA", "QUI", "SEX", "SÁB", "DOM"];
const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

const HABITOS = [
  { key: "alimentacaoOk", label: "Alimentação", icon: Utensils, color: "#7CFF5B" },
  { key: "treinoOk", label: "Treino", icon: Dumbbell, color: "#FF8A1F" },
  { key: "aguaOk", label: "Água", icon: Droplet, color: "#49A8FF" },
  { key: "sonoOk", label: "Sono", icon: Moon, color: "#8B7DFF" },
] as const;

const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const keyOf = (iso: string) => iso.slice(0, 10);

const CARD = "rounded-nx-lg border border-nx-border bg-nx-surface";

const INSIGHT_TONE: Record<InsightTone, string> = {
  risco: "text-nx-danger",
  atencao: "text-nx-streak",
  positivo: "text-nx-evo",
  neutro: "text-nx-outline",
};
const INSIGHT_ICON: Record<Insight["id"], LucideIcon> = {
  checkin: CalendarClock, sequencia: Flame, refeicao: Utensils,
  dia_semana: CalendarDays, tendencia: TrendingUp, forte: Sparkle,
};

// Refeições exibidas no detalhe do dia (nutri)
const REFEICOES = [
  { key: "cafeOk", label: "Café", icon: Utensils },
  { key: "almocoOk", label: "Almoço", icon: Utensils },
  { key: "lancheOk", label: "Lanche", icon: Utensils },
  { key: "jantarOk", label: "Jantar", icon: Utensils },
] as const;

export default function DiarioBordo() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState<DiarioData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rankPos, setRankPos] = useState<number | null>(null);
  const [tab, setTab] = useState<(typeof TABS)[number]>("Linha do tempo");
  const [mesRef, setMesRef] = useState(() => new Date());
  const [selKey, setSelKey] = useState<string | null>(null);
  const [incentivo, setIncentivo] = useState<"idle" | "enviando" | "ok">("idle");
  const [plano, setPlano] = useState<RefeicaoPlano[]>(PLANO_REFEICOES_PADRAO);
  const [aguaMeta, setAguaMeta] = useState(3000);
  const [sonoMeta, setSonoMeta] = useState(8);
  const [treinoDias, setTreinoDias] = useState<number[]>([]);
  const [savingCfg, setSavingCfg] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true); setError(null);
    api.get<DiarioData>(`/diario/${id}`)
      .then((r) => {
        setData(r.data);
        setPlano(resolverPlanoRefeicoes(r.data.paciente?.planoRefeicoes));
        setAguaMeta(r.data.paciente?.aguaMetaMl ?? 3000);
        setSonoMeta(r.data.paciente?.sonoMetaHoras ?? 8);
        setTreinoDias(r.data.paciente?.treinoDias ?? []);
        const regs = r.data.registros ?? [];
        if (regs.length) {
          const recente = regs.reduce((a, b) => (a.data > b.data ? a : b));
          setMesRef(new Date(recente.data));
          setSelKey(keyOf(recente.data));
        }
      })
      .catch((e) => setError(e?.response?.data?.error ?? "Não foi possível carregar o perfil"))
      .finally(() => setLoading(false));
    api.get<{ ranking: RankingItem[] }>(`/ranking?periodo=semanal`)
      .then((r) => setRankPos(r.data.ranking.find((x) => x.pacienteId === id)?.posicaoRanking ?? null))
      .catch(() => setRankPos(null));
  }, [id]);

  const registrosPorDia = useMemo(() => {
    const mm = new Map<string, Registro>();
    (data?.registros ?? []).forEach((r) => mm.set(keyOf(r.data), r));
    return mm;
  }, [data]);

  // Aderência real por hábito (últimos 30 registros) → alimenta Snapshot + Atenção
  const adesao = useMemo(() => {
    const regs = [...(data?.registros ?? [])].sort((a, b) => (a.data < b.data ? 1 : -1)).slice(0, 30);
    if (!regs.length) return null;
    const linhas = HABITOS.map((h) => ({
      ...h, pct: Math.round((regs.filter((r) => r[h.key]).length / regs.length) * 100),
    }));
    const overall = Math.round(linhas.reduce((s, l) => s + l.pct, 0) / linhas.length);
    return {
      linhas, overall, total: regs.length,
      pior: linhas.reduce((a, b) => (a.pct <= b.pct ? a : b)),
      melhor: linhas.reduce((a, b) => (a.pct >= b.pct ? a : b)),
    };
  }, [data]);

  const humorRecente = useMemo(() =>
    [...(data?.registros ?? [])]
      .filter((r) => r.humor)
      .sort((a, b) => (a.data < b.data ? 1 : -1))
      .slice(0, 5)
      .map((r) => HUMOR[r.humor as string] ?? "🙂"),
    [data]);

  const insights = useMemo<Insight[]>(() => {
    if (!data?.paciente) return [];
    return gerarInsights(data.registros ?? [], {
      streakAtual: data.paciente.streakAtual,
      streakMaximo: data.paciente.streakMaximo,
      ultimoCheckin: data.paciente.ultimoCheckin,
    });
  }, [data]);

  const selReg = selKey ? registrosPorDia.get(selKey) ?? null : null;
  const pac = data?.paciente;

  const dias = diasDesde(pac?.ultimoCheckin ?? null);
  const risco =
    dias == null ? { txt: "Sem check-in", cls: "bg-nx-warn/12 text-nx-warn", Icon: ShieldAlert }
      : dias >= 4 ? { txt: "Alto risco", cls: "bg-nx-danger/15 text-nx-danger", Icon: ShieldAlert }
        : dias >= 2 ? { txt: "Atenção", cls: "bg-nx-streak/15 text-nx-streak", Icon: AlertTriangle }
          : { txt: "Engajado", cls: "bg-nx-evo/15 text-nx-evo", Icon: ShieldCheck };

  const prog = pac ? progressoLiga(pac.pontosTotal) : null;
  const adOverall = adesao?.overall ?? 0;
  const adColor = adOverall >= 70 ? "text-nx-evo" : adOverall >= 45 ? "text-nx-streak" : "text-nx-danger";

  async function enviarIncentivo() {
    if (!id) return;
    setIncentivo("enviando");
    try {
      await api.post(`/diario/${id}/mensagem`, {
        tipo: "incentivo",
        conteudo: `Vamos retomar o foco, ${pac?.nome?.split(" ")[0] ?? ""}! Registre seu próximo check-in e siga firme. 💪`,
      });
      setIncentivo("ok");
    } catch { setIncentivo("idle"); }
  }

  async function salvarCfg(body: Record<string, unknown>) {
    if (!id || savingCfg) return;
    setSavingCfg(true);
    try {
      const { data: r } = await api.put<{
        planoRefeicoes: RefeicaoPlano[]; aguaMetaMl: number | null; sonoMetaHoras: number | null; treinoDias: number[] | null;
      }>(`/pacientes/${id}/plano-missoes`, body);
      setPlano(resolverPlanoRefeicoes(r.planoRefeicoes));
      if (r.aguaMetaMl != null) setAguaMeta(r.aguaMetaMl);
      if (r.sonoMetaHoras != null) setSonoMeta(r.sonoMetaHoras);
      if (Array.isArray(r.treinoDias)) setTreinoDias(r.treinoDias);
    } catch { /* mantém a config atual */ } finally {
      setSavingCfg(false);
    }
  }
  const toggleTreinoDia = (d: number) =>
    salvarCfg({ treinoDias: treinoDias.includes(d) ? treinoDias.filter((x) => x !== d) : [...treinoDias, d] });

  /* grade do calendário (semana começa na segunda) */
  const y = mesRef.getFullYear(), m = mesRef.getMonth();
  const primeiroDiaIdx = (new Date(y, m, 1).getDay() + 6) % 7;
  const diasNoMes = new Date(y, m + 1, 0).getDate();
  const celulas: (number | null)[] = [
    ...Array(primeiroDiaIdx).fill(null),
    ...Array.from({ length: diasNoMes }, (_, i) => i + 1),
  ];

  const ligaKey = pac?.ligaAtual ?? "Bronze";

  return (
    <div className="min-h-screen bg-nx-bg-lowest text-nx-on-surface font-sans">
      <main className="mx-auto max-w-6xl px-4 py-6 pb-24 md:px-8 lg:pb-8">
        {/* Voltar + relatório */}
        <div className="mb-4 flex items-center justify-between gap-3">
          <button onClick={() => navigate("/app/pacientes")} className="flex items-center gap-1 text-body-sm text-nx-on-surface-variant hover:text-nx-on-surface">
            <ChevronLeft size={18} /> Pacientes
          </button>
          <button onClick={() => navigate(`/app/pacientes/${id}/relatorio`)} className="flex items-center gap-2 rounded-xl border border-nx-border px-3.5 py-2 text-body-sm font-medium text-nx-on-surface hover:bg-nx-surface-hover transition-colors">
            <FileBarChart2 size={16} className="text-nx-evo" /> Relatório mensal
          </button>
        </div>

        {loading ? (
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="h-44 animate-pulse rounded-nx-lg bg-nx-container/60 lg:col-span-2" />
            <div className="h-44 animate-pulse rounded-nx-lg bg-nx-container/60" />
          </div>
        ) : error ? (
          <div className={`${CARD} p-8 text-center`}>
            <p className="mb-3 text-nx-danger">{error}</p>
            <button onClick={() => navigate(0)} className="text-label-md text-nx-evo hover:underline">Tentar de novo</button>
          </div>
        ) : !pac ? null : (
          <>
            {/* ══════════ SNAPSHOT — entendimento em 10s ══════════ */}
            <section className="grid gap-4 lg:grid-cols-3">
              {/* Identidade + risco + humor */}
              <div className={`${CARD} flex gap-4 p-5 lg:col-span-2`}>
                <div className="relative shrink-0">
                  <Avatar src={pac.fotoPerfilUrl} nome={pac.nome} tamanho={64} />
                  <span className="absolute -bottom-2 -right-2"><LeagueCrest liga={ligaKey} size={34} /></span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-headline-md text-nx-on-surface">{pac.nome}</h1>
                    <span className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-label-sm font-bold uppercase ${risco.cls}`}>
                      <risco.Icon className="size-3.5" /> {risco.txt}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-body-sm text-nx-on-surface-variant">{pac.objetivo || "Sem objetivo definido"}</p>
                  <p className="mt-1 text-body-sm text-nx-on-surface-variant">
                    {dias == null ? "Nunca registrou" : dias === 0 ? "Check-in hoje" : `Último check-in há ${dias} ${dias === 1 ? "dia" : "dias"}`}
                  </p>
                  {humorRecente.length > 0 && (
                    <div className="mt-3 flex items-center gap-1.5">
                      <span className="text-label-sm uppercase text-nx-on-surface-variant">Humor</span>
                      <span className="text-lg leading-none">{humorRecente.join(" ")}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Liga */}
              <div className={`${CARD} p-5`}>
                <div className="mb-3 flex items-center justify-between">
                  <LeagueBadge liga={ligaKey} />
                  {rankPos != null && <span className="text-label-md font-bold text-nx-gold">#{rankPos}</span>}
                </div>
                <div className="flex items-center gap-3">
                  <LeagueCrest liga={ligaKey} size={48} />
                  <div className="min-w-0 flex-1">
                    <p className="text-body-lg font-bold tabular-nums text-nx-on-surface">{pac.pontosTotal.toLocaleString("pt-BR")} XP</p>
                    <div className="mt-1.5"><ProgressBarNx value={prog?.pct ?? 0} tone="gold" /></div>
                    {prog?.proxima && <p className="mt-1 text-label-sm text-nx-on-surface-variant">faltam {prog.faltam} pra {prog.proxima.liga} {prog.proxima.nivel}</p>}
                  </div>
                </div>
              </div>

              {/* Aderência + hábitos */}
              <div className={`${CARD} p-5 lg:col-span-2`}>
                <div className="mb-4 flex items-end justify-between">
                  <div className="flex items-center gap-2">
                    <Target className="size-4 text-nx-on-surface-variant" />
                    <span className="text-label-md uppercase text-nx-on-surface-variant">Aderência · 30 dias</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className={`text-display-lg leading-none tabular-nums ${adColor}`}>{adOverall}<span className="text-body-lg">%</span></span>
                    <span className="flex items-center gap-1 text-body-sm font-semibold text-nx-streak"><Flame className="size-4" />{pac.streakAtual}d</span>
                  </div>
                </div>
                {adesao ? (
                  <div className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
                    {adesao.linhas.map((l) => (
                      <div key={l.key}>
                        <div className="mb-1 flex items-center justify-between text-body-sm">
                          <span className="flex items-center gap-1.5 text-nx-on-surface-variant"><l.icon className="size-3.5" style={{ color: l.color }} />{l.label}</span>
                          <span className="font-semibold tabular-nums text-nx-on-surface">{l.pct}%</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-nx-container-low">
                          <div className="h-full rounded-full" style={{ width: `${l.pct}%`, background: l.color }} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="py-4 text-center text-body-sm text-nx-on-surface-variant">Sem check-ins suficientes ainda.</p>
                )}
              </div>

              {/* Pontos de atenção */}
              <div className={`${CARD} flex flex-col p-5`}>
                <span className="mb-3 text-label-md uppercase text-nx-on-surface-variant">Pontos de atenção</span>
                <div className="flex-1 space-y-2.5">
                  {adesao && adesao.pior.pct < 70 && (
                    <p className="flex items-start gap-2 text-body-sm text-nx-on-surface">
                      <TrendingDown className="mt-0.5 size-4 shrink-0 text-nx-streak" />
                      Menor adesão em <strong className="text-nx-streak">{adesao.pior.label}</strong> ({adesao.pior.pct}%)
                    </p>
                  )}
                  {dias != null && dias >= 2 && (
                    <p className="flex items-start gap-2 text-body-sm text-nx-on-surface">
                      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-nx-danger" />
                      Não registra há <strong className="text-nx-danger">{dias} dias</strong>
                    </p>
                  )}
                  {selReg?.pediuAjuste && (
                    <p className="flex items-start gap-2 text-body-sm text-nx-on-surface">
                      <SlidersHorizontal className="mt-0.5 size-4 shrink-0 text-nx-warn" />
                      Pediu ajuste no plano
                    </p>
                  )}
                  {(!adesao || (adesao.pior.pct >= 70 && (dias == null || dias < 2))) && (
                    <p className="flex items-center gap-2 text-body-sm text-nx-evo"><ShieldCheck className="size-4" /> Sem pontos críticos 💚</p>
                  )}
                </div>
                <button
                  onClick={enviarIncentivo}
                  disabled={incentivo === "enviando"}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-nx-md bg-nx-evo py-2.5 text-body-sm font-semibold text-nx-on-evo transition-opacity hover:opacity-90 disabled:opacity-60"
                >
                  {incentivo === "ok" ? <><CheckCircle2 className="size-4" /> Enviado</> : <><Send className="size-4" /> {incentivo === "enviando" ? "Enviando…" : "Enviar incentivo"}</>}
                </button>
              </div>
            </section>

            {/* ══════════ Leitura automática — insights prontos ══════════ */}
            {insights.length > 0 && (
              <section className={`${CARD} mt-4 p-5`}>
                <div className="mb-4 flex items-center gap-2">
                  <Lightbulb className="size-4 text-nx-evo" />
                  <span className="text-label-md uppercase text-nx-on-surface-variant">Leitura automática</span>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {insights.slice(0, 6).map((ins) => {
                    const Icon = ins.id === "tendencia" && ins.tone !== "positivo" ? TrendingDown : INSIGHT_ICON[ins.id];
                    return (
                      <div key={ins.id} className="flex items-start gap-3">
                        <span className={`mt-0.5 grid size-8 shrink-0 place-items-center rounded-nx-sm bg-nx-container ${INSIGHT_TONE[ins.tone]}`}>
                          <Icon className="size-4" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-label-sm uppercase text-nx-on-surface-variant">{ins.titulo}</p>
                          <p className={`text-body-sm font-medium ${ins.tone === "risco" || ins.tone === "atencao" ? INSIGHT_TONE[ins.tone] : "text-nx-on-surface"}`}>{ins.texto}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* ══════════ Plano de missões — configurável pela nutri ══════════ */}
            <section className={`${CARD} mt-4 p-5`}>
              <div className="mb-4 flex items-center gap-2">
                <SlidersHorizontal className="size-4 text-nx-evo" />
                <span className="text-label-md uppercase text-nx-on-surface-variant">Plano de missões de {pac.nome.split(" ")[0]}</span>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                {/* Refeições */}
                <div>
                  <p className="mb-2 flex items-center gap-1.5 text-body-sm font-semibold text-nx-on-surface"><Utensils className="size-4 text-nx-evo" /> Refeições por dia</p>
                  <div className="flex flex-wrap gap-1.5">
                    {[3, 4, 5, 6].map((n) => (
                      <button key={n} onClick={() => salvarCfg({ numRefeicoes: n })} disabled={savingCfg}
                        className={`min-w-[52px] rounded-nx-md border px-3 py-2 text-body-sm font-semibold transition-all disabled:opacity-60 ${
                          plano.length === n ? "border-nx-evo bg-nx-evo/12 text-nx-evo" : "border-nx-border bg-nx-surface text-nx-on-surface-variant hover:border-nx-outline"
                        }`}>{n}</button>
                    ))}
                  </div>
                  <p className="mt-2 text-label-sm text-nx-on-surface-variant">Os 4 XP da alimentação se dividem entre elas ({(4 / plano.length).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} cada).</p>
                </div>

                {/* Água */}
                <div>
                  <p className="mb-2 flex items-center gap-1.5 text-body-sm font-semibold text-nx-on-surface"><Droplet className="size-4 text-nx-water" /> Meta de água</p>
                  <div className="flex items-center gap-3">
                    <button onClick={() => salvarCfg({ aguaMetaMl: Math.max(1000, aguaMeta - 250) })} disabled={savingCfg || aguaMeta <= 1000}
                      className="grid size-9 place-items-center rounded-nx-md border border-nx-border bg-nx-surface text-nx-on-surface disabled:opacity-40">−</button>
                    <span className="w-16 text-center text-body-lg font-bold tabular-nums text-nx-on-surface">{(aguaMeta / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}L</span>
                    <button onClick={() => salvarCfg({ aguaMetaMl: Math.min(6000, aguaMeta + 250) })} disabled={savingCfg || aguaMeta >= 6000}
                      className="grid size-9 place-items-center rounded-nx-md border border-nx-border bg-nx-surface text-nx-on-surface disabled:opacity-40">+</button>
                  </div>
                  <p className="mt-2 text-label-sm text-nx-on-surface-variant">+2 XP ao bater a meta.</p>
                </div>

                {/* Sono */}
                <div>
                  <p className="mb-2 flex items-center gap-1.5 text-body-sm font-semibold text-nx-on-surface"><Moon className="size-4 text-nx-sleep" /> Meta de sono</p>
                  <div className="flex flex-wrap gap-1.5">
                    {[6, 7, 8, 9, 10].map((h) => (
                      <button key={h} onClick={() => salvarCfg({ sonoMetaHoras: h })} disabled={savingCfg}
                        className={`min-w-[48px] rounded-nx-md border px-3 py-2 text-body-sm font-semibold transition-all disabled:opacity-60 ${
                          sonoMeta === h ? "border-nx-evo bg-nx-evo/12 text-nx-evo" : "border-nx-border bg-nx-surface text-nx-on-surface-variant hover:border-nx-outline"
                        }`}>{h}h</button>
                    ))}
                  </div>
                  <p className="mt-2 text-label-sm text-nx-on-surface-variant">±1h da meta = 2 XP · até 2h = 1 XP.</p>
                </div>

                {/* Treino */}
                <div>
                  <p className="mb-2 flex items-center gap-1.5 text-body-sm font-semibold text-nx-on-surface"><Dumbbell className="size-4 text-nx-streak" /> Dias de treino</p>
                  <div className="flex flex-wrap gap-1.5">
                    {[{ d: 1, l: "Seg" }, { d: 2, l: "Ter" }, { d: 3, l: "Qua" }, { d: 4, l: "Qui" }, { d: 5, l: "Sex" }, { d: 6, l: "Sáb" }, { d: 0, l: "Dom" }].map(({ d, l }) => (
                      <button key={d} onClick={() => toggleTreinoDia(d)} disabled={savingCfg}
                        className={`min-w-[44px] rounded-nx-md border px-2.5 py-2 text-label-md font-semibold transition-all disabled:opacity-60 ${
                          treinoDias.includes(d) ? "border-nx-evo bg-nx-evo/12 text-nx-evo" : "border-nx-border bg-nx-surface text-nx-on-surface-variant hover:border-nx-outline"
                        }`}>{l}</button>
                    ))}
                  </div>
                  <p className="mt-2 text-label-sm text-nx-on-surface-variant">{treinoDias.length === 0 ? "Sem dias marcados = missão de treino todo dia." : "Nos outros dias o treino é creditado automaticamente."}</p>
                </div>
              </div>
            </section>

            {/* ══════════ Abas (profundidade) ══════════ */}
            <div className="mt-8 border-b border-nx-border">
              <div className="flex gap-6 overflow-x-auto hide-scrollbar">
                {TABS.map((t) => (
                  <button key={t} onClick={() => setTab(t)}
                    className={`whitespace-nowrap border-b-2 py-3 text-label-md transition-colors ${
                      tab === t ? "border-nx-evo text-nx-evo" : "border-transparent text-nx-on-surface-variant hover:text-nx-on-surface"
                    }`}>{t}</button>
                ))}
              </div>
            </div>

            <div className="pt-6">
              {tab === "Evolução" ? (
                <EvolucaoTab medicoes={data!.medicoes} fotos={data!.fotosEvolucao} pesoMeta={pac.pesoMeta} objetivo={pac.objetivo} />
              ) : tab === "Liga & Pontos" ? (
                <LigaPontosTab paciente={pac} pontosLog={data!.pontosLog} streakMarcos={data!.streakMarcos} conquistas={data!.conquistas} rankPos={rankPos} />
              ) : tab === "Desafios" ? (
                <DesafiosTab desafios={data!.desafios} />
              ) : tab === "Mensagens" ? (
                <MensagensTab pacienteId={pac.id} pacienteNome={pac.nome} />
              ) : (
                /* Linha do tempo — calendário + detalhe do dia */
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="flex items-center gap-2 rounded-nx-md border border-nx-border bg-nx-surface px-3.5 py-2 text-label-md text-nx-on-surface-variant">
                      <Filter size={15} /> {registrosPorDia.size} check-ins
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="w-32 text-right text-label-md text-nx-on-surface-variant">{MESES[m]} {y}</span>
                      <div className="flex gap-1">
                        <button onClick={() => setMesRef(new Date(y, m - 1, 1))} aria-label="Mês anterior" className="rounded-nx-sm border border-nx-border bg-nx-surface p-1.5 hover:text-nx-evo"><ChevronLeft size={18} /></button>
                        <button onClick={() => setMesRef(new Date(y, m + 1, 1))} aria-label="Próximo mês" className="rounded-nx-sm border border-nx-border bg-nx-surface p-1.5 hover:text-nx-evo"><ChevronRight size={18} /></button>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-7 gap-2">
                    {DIAS.map((d, i) => (
                      <div key={d} className={`py-2 text-center text-label-sm ${i === 6 ? "text-nx-evo" : "text-nx-on-surface-variant"}`}>{d}</div>
                    ))}
                    {celulas.map((dia, i) => {
                      if (dia === null) return <div key={`e${i}`} className="h-20" />;
                      const key = ymd(new Date(y, m, dia));
                      const reg = registrosPorDia.get(key);
                      const isSel = key === selKey;
                      const isHoje = key === ymd(new Date());
                      return (
                        <button key={key} disabled={!reg} onClick={() => reg && setSelKey(key)}
                          className={`flex h-20 flex-col justify-between rounded-nx-md border p-2 text-left transition-all ${
                            reg ? "cursor-pointer border-nx-border bg-nx-surface hover:border-nx-evo/50" : "border-nx-border/50 bg-nx-surface/40 opacity-40"
                          } ${isSel ? "!border-nx-evo ring-1 ring-nx-evo" : ""}`}>
                          <span className={`text-label-sm ${isSel ? "font-bold text-nx-evo" : isHoje ? "text-nx-evo" : "text-nx-on-surface-variant"}`}>{String(dia).padStart(2, "0")}</span>
                          {reg && (
                            <div className="flex flex-wrap gap-1">
                              {HABITOS.map((h) => (
                                <span key={h.key} className="size-1.5 rounded-full" style={{ background: reg[h.key] ? "#7CFF5B" : "#FF5D5D" }} />
                              ))}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <div className={`${CARD} p-5`}>
                    {selReg ? (() => {
                      const oks = HABITOS.filter((h) => selReg[h.key]).length;
                      const badge = oks === 4
                        ? { txt: "Dia excelente", cls: "bg-nx-evo/12 text-nx-evo border-nx-evo/30", Icon: BadgeCheck }
                        : oks >= 2
                          ? { txt: "Dia parcial", cls: "bg-nx-streak/12 text-nx-streak border-nx-streak/30", Icon: AlertTriangle }
                          : { txt: "Dia difícil", cls: "bg-nx-danger/12 text-nx-danger border-nx-danger/30", Icon: AlertTriangle };
                      const parts = selKey!.split("-");
                      return (
                        <>
                          <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <h3 className="text-headline-md">{parts[2]} de {MESES[+parts[1] - 1]}</h3>
                              <p className="text-body-sm text-nx-on-surface-variant">{oks} de 4 metas{selReg.pontosGanhos ? ` · +${selReg.pontosGanhos} XP` : ""}</p>
                            </div>
                            <div className={`flex items-center gap-2 rounded-full border px-4 py-2 ${badge.cls}`}>
                              <badge.Icon size={16} /><span className="text-label-md font-bold uppercase">{badge.txt}</span>
                            </div>
                          </div>
                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="rounded-nx-md border border-nx-border bg-nx-container p-4">
                              <span className="mb-3 block text-label-md font-bold uppercase text-nx-on-surface-variant">Hábitos</span>
                              <ul className="space-y-3">
                                {HABITOS.map((h) => (
                                  <li key={h.key} className="flex items-center justify-between">
                                    <span className="flex items-center gap-2 text-body-sm"><h.icon size={15} style={{ color: h.color }} />{h.label}</span>
                                    {selReg[h.key] ? <CheckCircle2 size={18} className="text-nx-evo" /> : <XCircle size={18} className="text-nx-danger/70" />}
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <div className="rounded-nx-md border border-nx-border bg-nx-container p-4">
                              <span className="mb-3 flex items-center gap-2 text-label-md font-bold uppercase text-nx-on-surface-variant"><Sparkles size={16} className="text-nx-evo" /> Como se sentiu</span>
                              <div className="mb-2 text-4xl">{selReg.humor ? HUMOR[selReg.humor] ?? "🙂" : "—"}</div>
                              <p className="text-body-sm leading-snug text-nx-on-surface-variant">{selReg.descricao || "Sem anotações neste dia."}</p>
                            </div>
                          </div>
                          {selReg.cafeOk != null && (
                            <div className="mt-4 rounded-nx-md border border-nx-border bg-nx-container p-4">
                              <span className="mb-3 flex items-center gap-2 text-label-md font-bold uppercase text-nx-on-surface-variant"><Utensils size={16} className="text-nx-evo" /> Refeições</span>
                              <div className="grid grid-cols-4 gap-2">
                                {REFEICOES.map((r) => {
                                  const ok = selReg[r.key];
                                  return (
                                    <div key={r.key} className={`flex flex-col items-center gap-1.5 rounded-nx-sm border py-2.5 ${ok ? "border-nx-evo/40 bg-nx-evo/10 text-nx-evo" : "border-nx-border bg-nx-surface text-nx-danger/70"}`}>
                                      {ok ? <CheckCircle2 className="size-4" /> : <XCircle className="size-4" />}
                                      <span className="text-label-sm text-nx-on-surface-variant">{r.label}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                          {selReg.pediuAjuste && (
                            <div className="mt-4 flex items-start gap-2 rounded-nx-md border border-nx-warn/30 bg-nx-warn/10 p-3">
                              <SlidersHorizontal size={16} className="mt-0.5 text-nx-warn" />
                              <p className="text-body-sm"><span className="font-bold text-nx-warn">Pedido de ajuste:</span> {selReg.motivoAjuste || "Paciente solicitou ajuste no plano."}</p>
                            </div>
                          )}
                        </>
                      );
                    })() : (
                      <div className="py-10 text-center text-body-sm text-nx-on-surface-variant">
                        {registrosPorDia.size ? "Selecione um dia com check-in." : "Nenhum check-in registrado ainda."}
                      </div>
                    )}
                  </div>

                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
