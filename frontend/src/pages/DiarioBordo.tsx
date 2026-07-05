import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Search, Bell, HelpCircle, Filter, ChevronLeft, ChevronRight,
  Utensils, Droplet, Dumbbell, Moon, CheckCircle2, XCircle, Sparkles,
  Lightbulb, AlertTriangle, BadgeCheck, Flame, Award, Send, SlidersHorizontal,
  TrendingDown, TrendingUp,
} from "lucide-react";
import api from "../lib/api";
import Avatar from "../components/Avatar";
import { useAuth } from "../contexts/AuthContext";
import { calcularLiga, progressoLiga, CORES_LIGA, diasDesde } from "../lib/ligas";
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
  tipoRegistro: string; descricao: string | null; humor: string | null;
  pontosGanhos: number; pediuAjuste: boolean; motivoAjuste: string | null;
}
interface DiarioData {
  paciente: {
    id: string; nome: string; objetivo: string; fotoPerfilUrl: string | null;
    pesoMeta: number | null;
    pontosTotal: number; ligaAtual: string; ligaNivel: string;
    streakAtual: number; streakMaximo: number; ultimoCheckin: string | null;
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

const TABS = ["Diário de Bordo", "Evolução", "Liga & Pontos", "Desafios", "Mensagens"] as const;
const HUMOR: Record<string, string> = { otimo: "😄", bom: "🙂", neutro: "😐", dificil: "😔", pessimo: "😢" };
const DIAS = ["SEG", "TER", "QUA", "QUI", "SEX", "SÁB", "DOM"];
const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

const HABITOS = [
  { key: "alimentacaoOk", label: "Alimentação", icon: Utensils },
  { key: "treinoOk", label: "Treino", icon: Dumbbell },
  { key: "aguaOk", label: "Hidratação", icon: Droplet },
  { key: "sonoOk", label: "Sono", icon: Moon },
] as const;

const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const keyOf = (iso: string) => iso.slice(0, 10); // Registro.data é @db.Date (UTC midnight) → fatiar evita shift de fuso

/* estilo glass sem linhas brancas (border-subtle = rgba(124,58,237,.1)) */
const GLASS = "bg-nx-surface/80 backdrop-blur-md border border-nx-primary-container/10 rounded-2xl";

export default function DiarioBordo() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { nutricionista } = useAuth();

  const [data, setData] = useState<DiarioData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rankPos, setRankPos] = useState<number | null>(null);
  const [tab, setTab] = useState<(typeof TABS)[number]>("Diário de Bordo");
  const [mesRef, setMesRef] = useState(() => new Date());
  const [selKey, setSelKey] = useState<string | null>(null);
  const [incentivo, setIncentivo] = useState<"idle" | "enviando" | "ok">("idle");

  useEffect(() => {
    if (!id) return;
    setLoading(true); setError(null);
    api.get<DiarioData>(`/diario/${id}`)
      .then((r) => {
        setData(r.data);
        const regs = r.data.registros ?? [];
        if (regs.length) {
          const recente = regs.reduce((a, b) => (a.data > b.data ? a : b));
          setMesRef(new Date(recente.data));
          setSelKey(keyOf(recente.data));
        }
      })
      .catch((e) => setError(e?.response?.data?.error ?? "Não foi possível carregar o perfil"))
      .finally(() => setLoading(false));
    // posição no ranking (opcional, não bloqueia a tela)
    api.get<{ ranking: RankingItem[] }>(`/ranking?periodo=semanal`)
      .then((r) => setRankPos(r.data.ranking.find((x) => x.pacienteId === id)?.posicaoRanking ?? null))
      .catch(() => setRankPos(null));
  }, [id]);

  const registrosPorDia = useMemo(() => {
    const mm = new Map<string, Registro>();
    (data?.registros ?? []).forEach((r) => mm.set(keyOf(r.data), r));
    return mm;
  }, [data]);

  // adesão real por hábito (últimos 30 registros) → Pontos de Atrito
  const adesao = useMemo(() => {
    const regs = [...(data?.registros ?? [])].sort((a, b) => (a.data < b.data ? 1 : -1)).slice(0, 30);
    if (!regs.length) return null;
    const pct = (k: "alimentacaoOk" | "treinoOk" | "aguaOk" | "sonoOk") =>
      Math.round((regs.filter((r) => r[k]).length / regs.length) * 100);
    const linhas = HABITOS.map((h) => ({ label: h.label, pct: pct(h.key) }));
    return {
      pior: linhas.reduce((a, b) => (a.pct <= b.pct ? a : b)),
      melhor: linhas.reduce((a, b) => (a.pct >= b.pct ? a : b)),
    };
  }, [data]);

  const selReg = selKey ? registrosPorDia.get(selKey) ?? null : null;
  const pac = data?.paciente;

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

  /* ── grade do calendário (semana começa na segunda) ── */
  const y = mesRef.getFullYear(), m = mesRef.getMonth();
  const primeiroDiaIdx = (new Date(y, m, 1).getDay() + 6) % 7;
  const diasNoMes = new Date(y, m + 1, 0).getDate();
  const celulas: (number | null)[] = [
    ...Array(primeiroDiaIdx).fill(null),
    ...Array.from({ length: diasNoMes }, (_, i) => i + 1),
  ];

  return (
    <div className="flex min-h-screen bg-nx-bg-lowest text-nx-on-surface font-sans">
      <main className="flex-1 min-w-0 flex flex-col pb-24 lg:pb-0">
        {/* Top app bar */}
        <header className="flex justify-between items-center gap-4 px-6 lg:px-8 h-16 bg-nx-bg-lowest border-b border-nx-outline-variant sticky top-0 z-30">
          <div className="flex items-center gap-4 min-w-0">
            <button onClick={() => navigate("/app/pacientes")} aria-label="Voltar" className="text-nx-outline hover:text-nx-primary lg:hidden">
              <ChevronLeft size={22} />
            </button>
            <h2 className="text-headline-md font-extrabold truncate">{pac?.nome ?? (loading ? "Carregando…" : "Paciente")}</h2>
            {pac && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-nx-surface rounded-full border border-nx-outline-variant">
                <Award size={16} style={{ color: CORES_LIGA[pac.ligaAtual] }} />
                <span className="text-label-md" style={{ color: CORES_LIGA[pac.ligaAtual] }}>{pac.ligaAtual} {pac.ligaNivel}</span>
              </div>
            )}
            {pac && (
              <div className="hidden md:flex items-center gap-1 text-nx-primary">
                <Flame size={16} />
                <span className="text-label-md">{pac.streakAtual} dias de foco</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="relative hidden lg:block">
              <input className="bg-nx-container-high border-none rounded-full pl-10 pr-4 py-1.5 text-body-sm w-56 text-nx-on-surface placeholder:text-nx-outline focus:outline-none focus:ring-1 focus:ring-nx-primary" placeholder="Buscar no perfil..." />
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-nx-outline" />
            </div>
            <button aria-label="Notificações" className="relative p-2 rounded-full hover:bg-nx-surface-hover transition-colors">
              <Bell size={20} /><span className="absolute top-1.5 right-1.5 w-2 h-2 bg-nx-primary rounded-full" />
            </button>
            <button aria-label="Ajuda" className="p-2 rounded-full hover:bg-nx-surface-hover transition-colors"><HelpCircle size={20} /></button>
            <Avatar src={nutricionista?.foto} nome={nutricionista?.nome ?? "Nutri"} tamanho={32} />
          </div>
        </header>

        {/* Tabs */}
        <div className="px-6 lg:px-8 border-b border-nx-outline-variant bg-nx-bg-lowest/60 backdrop-blur-md sticky top-16 z-20">
          <div className="flex gap-6 overflow-x-auto hide-scrollbar">
            {TABS.map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`py-4 text-label-md whitespace-nowrap border-b-2 transition-colors ${
                  tab === t ? "text-nx-primary border-nx-primary" : "text-nx-on-surface-variant border-transparent hover:text-nx-primary"
                }`}>{t}</button>
            ))}
          </div>
        </div>

        {/* Conteúdo */}
        {loading ? (
          <div className="p-8 grid grid-cols-12 gap-4">
            <div className="col-span-12 lg:col-span-8 h-96 animate-pulse rounded-2xl bg-nx-container/60" />
            <div className="col-span-12 lg:col-span-4 h-96 animate-pulse rounded-2xl bg-nx-container/60" />
          </div>
        ) : error ? (
          <div className="p-8"><div className={`${GLASS} p-8 text-center`}>
            <p className="text-nx-error mb-3">{error}</p>
            <button onClick={() => navigate(0)} className="text-nx-primary hover:underline text-label-md">Tentar de novo</button>
          </div></div>
        ) : !data ? null : tab === "Evolução" ? (
          <div className="p-6 lg:p-8">
            <EvolucaoTab medicoes={data.medicoes} fotos={data.fotosEvolucao} pesoMeta={data.paciente.pesoMeta} objetivo={data.paciente.objetivo} />
          </div>
        ) : tab === "Liga & Pontos" ? (
          <div className="p-6 lg:p-8">
            <LigaPontosTab paciente={data.paciente} pontosLog={data.pontosLog} streakMarcos={data.streakMarcos} conquistas={data.conquistas} rankPos={rankPos} />
          </div>
        ) : tab === "Desafios" ? (
          <div className="p-6 lg:p-8">
            <DesafiosTab desafios={data.desafios} />
          </div>
        ) : tab === "Mensagens" ? (
          <div className="p-6 lg:p-8">
            <MensagensTab pacienteId={data.paciente.id} pacienteNome={data.paciente.nome} />
          </div>
        ) : (
          <div className="flex-grow p-6 lg:p-8 grid grid-cols-12 gap-4">
            {/* ── Coluna principal ── */}
            <div className="col-span-12 lg:col-span-8 space-y-4">
              {/* Filtros + navegador de mês */}
              <div className="flex flex-wrap justify-between items-center gap-3">
                <div className="flex gap-2">
                  <span className="flex items-center gap-2 px-4 py-2 bg-nx-surface rounded-xl text-label-md border border-nx-outline-variant text-nx-on-surface-variant">
                    <Filter size={16} /> Check-ins do mês
                  </span>
                  <span className="px-4 py-2 bg-nx-primary-container/20 text-nx-primary rounded-xl text-label-md border border-nx-primary/30">
                    {registrosPorDia.size} registros
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-label-md text-nx-on-surface-variant w-32 text-right">{MESES[m]} {y}</span>
                  <div className="flex gap-1">
                    <button onClick={() => setMesRef(new Date(y, m - 1, 1))} aria-label="Mês anterior" className="p-1.5 bg-nx-surface rounded-lg border border-nx-outline-variant hover:text-nx-primary"><ChevronLeft size={18} /></button>
                    <button onClick={() => setMesRef(new Date(y, m + 1, 1))} aria-label="Próximo mês" className="p-1.5 bg-nx-surface rounded-lg border border-nx-outline-variant hover:text-nx-primary"><ChevronRight size={18} /></button>
                  </div>
                </div>
              </div>

              {/* Calendário bento (REAL) */}
              <div className="grid grid-cols-7 gap-2">
                {DIAS.map((d, i) => (
                  <div key={d} className={`text-center text-label-sm py-2 ${i === 6 ? "text-nx-primary" : "text-nx-on-surface-variant"}`}>{d}</div>
                ))}
                {celulas.map((dia, i) => {
                  if (dia === null) return <div key={`e${i}`} className="h-24" />;
                  const key = ymd(new Date(y, m, dia));
                  const reg = registrosPorDia.get(key);
                  const isSel = key === selKey;
                  const isHoje = key === ymd(new Date());
                  return (
                    <button key={key} disabled={!reg} onClick={() => reg && setSelKey(key)}
                      className={`h-24 ${GLASS} p-2 flex flex-col justify-between text-left transition-all ${
                        reg ? "cursor-pointer hover:border-nx-primary" : "opacity-40 cursor-default"
                      } ${isSel ? "!border-nx-primary ring-1 ring-nx-primary bg-nx-primary/5" : ""}`}>
                      <span className={`text-label-sm ${isSel ? "font-bold text-nx-primary" : isHoje ? "text-nx-primary" : ""}`}>{String(dia).padStart(2, "0")}</span>
                      {reg && (
                        <div className="flex gap-1 flex-wrap">
                          {HABITOS.map((h) => (
                            <span key={h.key} className="w-1.5 h-1.5 rounded-full"
                              style={{ background: reg[h.key] ? "#4edea3" : "#ffb4ab" }} />
                          ))}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Detalhamento do dia (REAL) */}
              <div className={`${GLASS} p-5`}>
                {selReg ? (() => {
                  const oks = HABITOS.filter((h) => selReg[h.key]).length;
                  const badge = oks === 4
                    ? { txt: "Dia Excelente", cls: "bg-nx-tertiary/10 text-nx-tertiary border-nx-tertiary/30", Icon: BadgeCheck }
                    : oks >= 2
                    ? { txt: "Dia Parcial", cls: "bg-nx-secondary/10 text-nx-secondary border-nx-secondary/30", Icon: AlertTriangle }
                    : { txt: "Dia Difícil", cls: "bg-nx-error/10 text-nx-error border-nx-error/30", Icon: AlertTriangle };
                  const parts = selKey!.split("-");
                  return (
                    <>
                      <div className="flex flex-wrap justify-between items-start gap-3 mb-5">
                        <div>
                          <h3 className="text-headline-md">Detalhamento: {parts[2]} de {MESES[+parts[1] - 1]}</h3>
                          <p className="text-body-sm text-nx-on-surface-variant">{oks} de 4 metas concluídas{selReg.pontosGanhos ? ` · +${selReg.pontosGanhos} XP` : ""}</p>
                        </div>
                        <div className={`px-4 py-2 rounded-full border flex items-center gap-2 ${badge.cls}`}>
                          <badge.Icon size={16} /><span className="text-label-md font-bold uppercase">{badge.txt}</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Hábitos */}
                        <div className="bg-nx-container p-4 rounded-xl border border-nx-outline-variant">
                          <div className="flex items-center gap-2 mb-3"><Utensils size={18} className="text-nx-primary" /><span className="text-label-md font-bold uppercase">Hábitos</span></div>
                          <ul className="space-y-3">
                            {HABITOS.map((h) => (
                              <li key={h.key} className="flex items-center justify-between">
                                <span className="text-body-sm flex items-center gap-2"><h.icon size={15} className="text-nx-outline" />{h.label}</span>
                                {selReg[h.key] ? <CheckCircle2 size={18} className="text-nx-tertiary" /> : <XCircle size={18} className="text-nx-error/70" />}
                              </li>
                            ))}
                          </ul>
                        </div>
                        {/* Humor & nota */}
                        <div className="bg-nx-container p-4 rounded-xl border border-nx-outline-variant">
                          <div className="flex items-center gap-2 mb-3"><Sparkles size={18} className="text-nx-primary" /><span className="text-label-md font-bold uppercase">Como se sentiu</span></div>
                          <div className="text-4xl mb-2">{selReg.humor ? HUMOR[selReg.humor] ?? "🙂" : "—"}</div>
                          <p className="text-body-sm text-nx-on-surface-variant leading-snug">{selReg.descricao || "Sem anotações neste dia."}</p>
                        </div>
                        {/* Diagnóstico AI (placeholder honesto) */}
                        <div className="bg-nx-container p-4 rounded-xl border border-nx-outline-variant relative overflow-hidden">
                          <div className="flex items-center gap-2 mb-3"><Lightbulb size={18} className="text-nx-primary" /><span className="text-label-md font-bold uppercase">Diagnóstico AI</span></div>
                          {/* TODO: sem fonte de dados no schema — análise de IA ainda não disponível */}
                          <p className="text-body-sm text-nx-on-surface-variant italic">Análise de IA ainda não disponível para este dia.</p>
                          <Sparkles size={90} className="absolute -right-4 -bottom-4 text-nx-primary opacity-10" />
                        </div>
                      </div>
                      {selReg.pediuAjuste && (
                        <div className="mt-4 p-3 rounded-xl bg-nx-secondary/10 border border-nx-secondary/30 flex items-start gap-2">
                          <SlidersHorizontal size={16} className="text-nx-secondary mt-0.5" />
                          <p className="text-body-sm"><span className="font-bold text-nx-secondary">Pedido de ajuste:</span> {selReg.motivoAjuste || "Paciente solicitou ajuste no plano."}</p>
                        </div>
                      )}
                    </>
                  );
                })() : (
                  <div className="py-10 text-center text-nx-on-surface-variant text-body-sm">
                    {registrosPorDia.size ? "Selecione um dia com check-in no calendário." : "Nenhum check-in registrado ainda."}
                  </div>
                )}
              </div>
            </div>

            {/* ── Coluna direita ── */}
            <div className="col-span-12 lg:col-span-4 space-y-4">
              {/* Pontos de Atrito (derivado real + sugestão placeholder) */}
              <div className={`${GLASS} p-5 border-nx-primary/20 bg-gradient-to-br from-nx-surface to-nx-primary-container/5`}>
                <div className="flex items-center gap-3 mb-5">
                  <div className="p-2 bg-nx-primary/20 rounded-lg"><TrendingUp size={20} className="text-nx-primary" /></div>
                  <h4 className="text-headline-md">Pontos de Atrito</h4>
                </div>
                {adesao ? (
                  <div className="space-y-3">
                    <div className="p-4 rounded-xl bg-nx-container-low border-l-4 border-nx-secondary">
                      <h5 className="text-label-md font-bold text-nx-secondary uppercase mb-1 flex items-center gap-1"><TrendingDown size={14} /> Padrão detectado</h5>
                      <p className="text-body-md">Menor adesão em <strong>{adesao.pior.label}</strong> — {adesao.pior.pct}% dos check-ins recentes.</p>
                    </div>
                    <div className="p-4 rounded-xl bg-nx-container-low border-l-4 border-nx-tertiary">
                      <h5 className="text-label-md font-bold text-nx-tertiary uppercase mb-1 flex items-center gap-1"><TrendingUp size={14} /> Força</h5>
                      <p className="text-body-md">Alta consistência em <strong>{adesao.melhor.label}</strong> — {adesao.melhor.pct}% dos dias.</p>
                    </div>
                    <div className="p-4 rounded-xl bg-nx-container-low border-l-4 border-nx-primary">
                      <h5 className="text-label-md font-bold text-nx-primary uppercase mb-1">Sugestão</h5>
                      {/* TODO: sugestão de IA não disponível no schema — texto genérico derivado */}
                      <p className="text-body-md">Reforce {adesao.pior.label.toLowerCase()} no próximo plano com metas menores e lembretes.</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-body-sm text-nx-on-surface-variant text-center py-6">Sem check-ins suficientes para gerar insights.</p>
                )}
              </div>

              {/* Alerta de Recaída (REAL: diasDesde) */}
              {(() => {
                const dias = diasDesde(pac?.ultimoCheckin ?? null);
                const alerta = dias != null && dias >= 2;
                const primeiro = pac?.nome?.split(" ")[0] ?? "";
                return (
                  <div className={`${GLASS} p-5 relative overflow-hidden ${alerta ? "radar-pulse border-league-gold/30" : "border-nx-tertiary/20"}`}>
                    <div className="flex justify-between items-center mb-3">
                      <span className={`text-label-md font-bold uppercase tracking-widest ${alerta ? "text-league-gold" : "text-nx-tertiary"}`}>
                        {alerta ? "Alerta de Recaída" : "Engajamento em dia"}
                      </span>
                      {alerta ? <AlertTriangle size={20} className="text-league-gold" /> : <CheckCircle2 size={20} className="text-nx-tertiary" />}
                    </div>
                    <p className="text-body-md mb-4 leading-relaxed">
                      {dias == null
                        ? `${primeiro} ainda não fez o primeiro check-in.`
                        : alerta
                        ? <>{primeiro} não registra há <span className="text-league-gold font-bold">{dias} {dias === 1 ? "dia" : "dias"}</span>. Vale um empurrãozinho.</>
                        : <>Último check-in há {dias === 0 ? "menos de 1 dia" : `${dias} dia${dias > 1 ? "s" : ""}`}. Streak de {pac?.streakAtual} dias. 🔥</>}
                    </p>
                    {alerta && (
                      <button onClick={enviarIncentivo} disabled={incentivo !== "idle"}
                        className="w-full py-3 bg-league-gold text-[#472a00] font-bold rounded-xl shadow-[0_0_15px_rgba(245,158,11,0.3)] hover:scale-[1.02] transition-transform disabled:opacity-60 flex items-center justify-center gap-2">
                        {incentivo === "ok" ? <><CheckCircle2 size={18} /> Mensagem enviada</> : <><Send size={16} /> {incentivo === "enviando" ? "Enviando…" : "Enviar Mensagem de Incentivo"}</>}
                      </button>
                    )}
                  </div>
                );
              })()}

              {/* Progresso na Liga (REAL) */}
              {pac && (() => {
                const prog = progressoLiga(pac.pontosTotal);
                const atual = calcularLiga(pac.pontosTotal);
                const cor = CORES_LIGA[pac.ligaAtual] ?? "#F59E0B";
                const xp = pac.pontosTotal >= 1000 ? `${(pac.pontosTotal / 1000).toFixed(1)}k` : `${pac.pontosTotal}`;
                return (
                  <div className={`${GLASS} p-5`}>
                    <div className="flex justify-between items-center mb-5">
                      <h4 className="text-label-md font-bold uppercase tracking-widest text-nx-on-surface-variant">Progresso na Liga</h4>
                      {rankPos != null && <span className="text-body-sm font-bold" style={{ color: cor }}>#{rankPos} no Ranking</span>}
                    </div>
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 rounded-full flex items-center justify-center border shrink-0" style={{ background: `${cor}22`, borderColor: `${cor}66` }}>
                        <Award size={24} style={{ color: cor }} />
                      </div>
                      <div className="flex-grow min-w-0">
                        <div className="flex justify-between items-center mb-1 gap-2">
                          <span className="text-label-md font-bold truncate">{prog.proxima ? `Promoção para ${prog.proxima.liga} ${prog.proxima.nivel}` : "Nível máximo"}</span>
                          <span className="text-label-sm text-nx-on-surface-variant shrink-0">{pac.pontosTotal} pts</span>
                        </div>
                        <div className="w-full bg-nx-container-high h-1.5 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${prog.pct}%`, background: cor, boxShadow: `0 0 8px ${cor}80` }} />
                        </div>
                        {prog.proxima && <p className="text-label-sm text-nx-outline mt-1">faltam {prog.faltam} pts</p>}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-3 bg-nx-container-low rounded-xl text-center">
                        <span className="text-label-sm text-nx-on-surface-variant block mb-1">Streak</span>
                        <span className="text-headline-md font-bold">{pac.streakAtual}</span>
                      </div>
                      <div className="p-3 bg-nx-container-low rounded-xl text-center">
                        {/* XP reutiliza pontosTotal — não há campo de XP separado no schema */}
                        <span className="text-label-sm text-nx-on-surface-variant block mb-1">XP Total</span>
                        <span className="text-headline-md font-bold text-nx-tertiary">{xp}</span>
                      </div>
                    </div>
                    <p className="sr-only">Liga atual {atual.liga} {atual.nivel}</p>
                  </div>
                );
              })()}
            </div>
          </div>
        )}
      </main>

      {/* FAB Ajustar Plano → envia recado ao paciente (POST real /diario/:id/mensagem) */}
      {tab === "Diário de Bordo" && !loading && !error && (
        <button onClick={enviarIncentivo} disabled={incentivo === "enviando"}
          className="fixed bottom-24 lg:bottom-8 right-6 lg:right-8 z-40 flex items-center gap-3 px-6 py-4 rounded-full bg-nx-surface/80 backdrop-blur-xl border border-nx-secondary/40 shadow-2xl hover:scale-105 transition-transform disabled:opacity-60">
          <AlertTriangle size={22} className="text-nx-secondary" />
          <span className="text-label-md font-bold uppercase tracking-wider text-nx-secondary">{incentivo === "ok" ? "Enviado ✓" : "Ajustar Plano"}</span>
        </button>
      )}
    </div>
  );
}
