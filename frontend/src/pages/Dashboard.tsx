import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronRight, Sparkles, ShieldAlert, TrendingUp, TrendingDown, Minus,
  MessageSquare, Target, ArrowRight, Trophy, Utensils, Dumbbell, Droplets, Moon, CheckCircle2,
} from "lucide-react";
import { useFetch } from "../hooks/useFetch";
import Avatar from "../components/Avatar";
import AccountSheet from "../components/AccountSheet";
import { useAuth } from "../contexts/AuthContext";
import { CORES_LIGA, progressoLiga } from "../lib/ligas";

/* ───────── shapes reais da API ───────── */
type Risco = "risco" | "atencao" | "ok";
interface Dificuldade { habito: string; label: string; pct: number }
interface PacienteLinha {
  id: string; nome: string; foto: string | null;
  liga: string; ligaNivel: string; pontos: number;
  streak: number; diasInativo: number; ultimoCheckin: string | null;
  score: number; risco: Risco; maiorDificuldade: Dificuldade | null;
}
interface LigasResp {
  nutri: { nome: string };
  kpis: {
    pacientesAtivos: number; novosMes: number; retencao30: number;
    checkinsHoje: number; pctCheckins: number; emRisco: number; indiceSaude: number;
    ligaClinica: { liga: string; nivel: string; cor: string; icone: string };
  };
  aderenciaSemana: { atual: number; anterior: number; delta: number };
  aguaSemana: { atual: number; anterior: number; delta: number };
  retencaoPrevista: number;
  pacientesLista: PacienteLinha[];
  subiramSemana: { id: string; nome: string; foto: string | null; liga: string; ligaNivel: string }[];
  desafiosResumo: { ativos: number; participantes: number; concluidos: number };
  distribuicaoLigas: { liga: string; count: number; cor: string }[];
  desempenhoCategoria: { alimentacao: number; treino: number; agua: number; sono: number };
  alimentacaoBreakdown: { seguiu: number | null; adaptou: number | null; comeu_mal: number | null; pulou: number | null; amostra: number };
}

const nf = (n: number) => n.toLocaleString("pt-BR");
const RISCO_RANK: Record<Risco, number> = { risco: 0, atencao: 1, ok: 2 };

const HABITO = {
  alimentacao: { label: "Alimentação", Icon: Utensils, cor: "#7CFF5B" },
  treino: { label: "Treino", Icon: Dumbbell, cor: "#FF8A1F" },
  agua: { label: "Hidratação", Icon: Droplets, cor: "#49A8FF" },
  sono: { label: "Sono", Icon: Moon, cor: "#8B7DFF" },
} as const;

function saudacao() {
  const h = new Date().getHours();
  return h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
}

/* Insight curto CALCULADO por paciente — leva a uma ação, não só informa. */
function insightDe(p: PacienteLinha): { texto: string; tone: Risco } {
  if (p.diasInativo >= 3 || !p.ultimoCheckin)
    return { texto: p.ultimoCheckin ? `${p.diasInativo} dias sem check-in` : "Nunca registrou", tone: "risco" };
  if (p.maiorDificuldade && p.maiorDificuldade.pct < 40)
    return { texto: `${p.maiorDificuldade.label} só ${p.maiorDificuldade.pct}% dos dias`, tone: "atencao" };
  if (p.diasInativo >= 1) return { texto: `${p.diasInativo} dia sem registrar`, tone: "atencao" };
  if (p.streak >= 7) return { texto: `Sequência de ${p.streak} dias 🔥`, tone: "ok" };
  if (p.score >= 80) return { texto: `Aderência alta · ${p.score}%`, tone: "ok" };
  return { texto: "Registrou hoje", tone: "ok" };
}

const TONE_TEXT: Record<Risco, string> = {
  risco: "text-nx-danger", atencao: "text-nx-streak", ok: "text-nx-on-surface-variant",
};

/* Cor do score de aderência (0–100) → semáforo. */
function scoreCor(s: number) {
  return s >= 60 ? "#7CFF5B" : s >= 35 ? "#F8C84B" : "#FF5D5D";
}

/* ───────── página ───────── */
export default function Dashboard() {
  const navigate = useNavigate();
  const { nutricionista } = useAuth();
  const { data, loading, error, refetch } = useFetch<LigasResp>("/dashboard/ligas");
  const { data: conversas } = useFetch<{ naoLidoCount: number }[]>("/mensagens/conversas");
  const [filtro, setFiltro] = useState<"todos" | "criticos" | "hoje">("todos");
  const [contaOpen, setContaOpen] = useState(false);

  const k = data?.kpis;
  const primeiroNome = (data?.nutri?.nome ?? "").trim().split(/\s+/)[0] || "";

  const mensagensNaoLidas = useMemo(
    () => (Array.isArray(conversas) ? conversas : []).reduce((s, c) => s + (c.naoLidoCount || 0), 0),
    [conversas],
  );

  const lista = data?.pacientesLista ?? [];
  const criticos = useMemo(() => lista.filter((p) => p.risco === "risco"), [lista]);
  const listaFiltrada = useMemo(() => {
    let base = lista;
    if (filtro === "criticos") base = criticos;
    else if (filtro === "hoje") base = lista.filter((p) => p.diasInativo === 0);
    // apresenta quem precisa de atenção no topo (só ordenação visual, não muda dados)
    return [...base].sort((a, b) => RISCO_RANK[a.risco] - RISCO_RANK[b.risco]);
  }, [lista, criticos, filtro]);

  const irParaPrioridades = () => {
    setFiltro("criticos");
    document.getElementById("prioridades")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // hábito mais difícil da clínica (Panorama)
  const piorHabito = useMemo(() => {
    const d = data?.desempenhoCategoria;
    if (!d) return null;
    const arr = (Object.keys(HABITO) as (keyof typeof HABITO)[]).map((key) => ({ key, pct: d[key] }));
    return arr.reduce((a, b) => (a.pct <= b.pct ? a : b));
  }, [data]);

  return (
    <div className="min-h-screen bg-nx-bg-lowest text-nx-on-surface font-sans">
      <main className="mx-auto max-w-6xl px-4 py-6 pb-24 md:px-6 lg:pb-8">
        {/* Boas-vindas */}
        <header className="mb-5 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-headline-lg text-nx-on-surface">
              {saudacao()}{primeiroNome ? `, ${primeiroNome}` : ""} 👋
            </h1>
            <p className="mt-1 text-body-md text-nx-on-surface-variant">
              {loading ? "Carregando o pulso da clínica…"
                : k
                  ? <>Hoje, <span className="font-semibold text-nx-on-surface">{k.checkinsHoje}</span> de {k.pacientesAtivos} pacientes já registraram
                      {data && ` · aderência ${data.aderenciaSemana.atual}% na semana`}.</>
                  : "Resumo da sua carteira de pacientes."}
            </p>
          </div>
          {/* Avatar de conta — apenas mobile (desktop já tem no menu lateral) */}
          <button
            onClick={() => setContaOpen(true)}
            aria-label="Abrir menu da conta"
            className="lg:hidden shrink-0 rounded-full ring-1 ring-nx-border hover:ring-nx-evo/50 transition-all active:scale-95"
          >
            <Avatar src={nutricionista?.foto} nome={nutricionista?.nome ?? ""} tamanho={42} className="rounded-full" />
          </button>
        </header>

        {/* 1 · Resumo Inteligente (será preenchido pela IA no futuro) */}
        <section className="mb-6">
          <ResumoInteligente
            loading={loading}
            emRisco={k?.emRisco}
            evoluiram={data?.subiramSemana?.length}
            mensagens={conversas ? mensagensNaoLidas : undefined}
            desafios={data?.desafiosResumo?.ativos}
            onPrioridades={irParaPrioridades}
          />
        </section>

        {/* 2 · Indicadores compactos */}
        <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <StatTile Icon={CheckCircle2} cor="#7CFF5B" label="Check-ins hoje" valor={k?.checkinsHoje} loading={loading} />
          <StatTile Icon={ShieldAlert} cor="#FF5D5D" label="Críticos" valor={k?.emRisco} loading={loading}
            mudo={(k?.emRisco ?? 0) === 0} onClick={irParaPrioridades} />
          <StatTile Icon={MessageSquare} cor="#49A8FF" label="Mensagens" valor={mensagensNaoLidas}
            loading={loading} mudo={mensagensNaoLidas === 0} onClick={() => navigate("/app/mensagens")} />
          <StatTile Icon={TrendingUp} cor="#F8C84B" label="Evoluíram" valor={data?.subiramSemana?.length} loading={loading} />
          <StatTile Icon={Target} cor="#FF8A1F" label="Desafios" valor={data?.desafiosResumo?.ativos} loading={loading}
            mudo={(data?.desafiosResumo?.ativos ?? 0) === 0} onClick={() => navigate("/app/desafios")} />
        </section>

        {/* 3 · Adesão da clínica */}
        <section className="mb-8">
          <AdesaoPremium ader={data?.aderenciaSemana} retencao={data?.retencaoPrevista} loading={loading} />
        </section>

        {/* 4 · Pacientes que precisam de você */}
        <section id="prioridades" className="mb-9 scroll-mt-6">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h2 className="text-body-lg font-semibold text-nx-on-surface">Pacientes que precisam de você</h2>
              <span className="rounded-full bg-nx-container-high px-2 py-0.5 text-label-md font-semibold tabular-nums text-nx-on-surface-variant">{listaFiltrada.length}</span>
            </div>
            <div className="flex items-center gap-1 rounded-full border border-nx-border bg-nx-surface p-0.5">
              {([["todos", "Todos"], ["criticos", "Em risco"], ["hoje", "Ativos hoje"]] as const).map(([key, label]) => (
                <button key={key} onClick={() => setFiltro(key)}
                  className={`rounded-full px-3 py-1 text-label-md font-semibold transition-colors ${
                    filtro === key ? "bg-nx-container-high text-nx-on-surface" : "text-nx-on-surface-variant hover:text-nx-on-surface"}`}>
                  {label}{key === "criticos" && criticos.length > 0 ? ` ${criticos.length}` : ""}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-hidden rounded-nx-lg border border-nx-border bg-nx-surface">
            <StateBox loading={loading} error={error} onRetry={refetch} minH="h-56">
              {listaFiltrada.length === 0 ? (
                <EmptyCarteira filtro={filtro} />
              ) : (
                <ul className="divide-y divide-nx-border/70">
                  {listaFiltrada.map((p) => (
                    <PrioridadeRow key={p.id} p={p} onOpen={() => navigate(`/app/pacientes/${p.id}`)} navigate={navigate} />
                  ))}
                </ul>
              )}
            </StateBox>
          </div>
        </section>

        {/* Ligas + Subiram esta semana */}
        <section className="mb-9 grid gap-4 lg:grid-cols-2">
          <div className="rounded-nx-lg border border-nx-border bg-nx-surface p-5">
            <h2 className="mb-4 text-body-lg font-semibold text-nx-on-surface">Distribuição por liga</h2>
            <StateBox loading={loading} error={error} onRetry={refetch} minH="h-40">
              <LigasDistribuicao dados={data?.distribuicaoLigas} />
            </StateBox>
          </div>
          <div className="rounded-nx-lg border border-nx-border bg-nx-surface p-5">
            <div className="mb-4 flex items-center gap-2">
              <Trophy className="size-4 text-nx-gold" />
              <h2 className="text-body-lg font-semibold text-nx-on-surface">Subiram de liga esta semana</h2>
            </div>
            <StateBox loading={loading} error={error} onRetry={refetch} minH="h-40">
              <SubiramSemana itens={data?.subiramSemana} onOpen={(id) => navigate(`/app/pacientes/${id}`)} />
            </StateBox>
          </div>
        </section>

        {/* Panorama da clínica (métricas de 30 dias) */}
        <section>
          <div className="mb-3 flex items-center gap-2">
            <Sparkles className="size-4 text-nx-evo" />
            <h2 className="text-body-lg font-semibold text-nx-on-surface">Panorama da clínica</h2>
            <span className="text-label-md uppercase tracking-wide text-nx-on-surface-variant">calculado · 30 dias</span>
          </div>
          <div className="rounded-nx-lg border border-nx-border bg-nx-surface p-5">
            <StateBox loading={loading} error={error} onRetry={refetch} minH="h-40">
              {data && k && (
                <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
                  <Leitura Icon={TrendingUp} cor="#7CFF5B" titulo="Aderência média"
                    valor={`${data.aderenciaSemana.atual}%`} trend={data.aderenciaSemana.delta} sufixo="p.p. vs semana passada" />
                  <Leitura Icon={piorHabito ? HABITO[piorHabito.key].Icon : Target} cor={piorHabito ? HABITO[piorHabito.key].cor : "#9CA3AF"}
                    titulo="Hábito mais difícil da carteira"
                    valor={piorHabito ? `${HABITO[piorHabito.key].label} · ${piorHabito.pct}%` : "—"} />
                  <Leitura Icon={Droplets} cor="#49A8FF" titulo="Hidratação"
                    valor={`${data.aguaSemana.atual}%`} trend={data.aguaSemana.delta} sufixo="dos check-ins bateram a meta" />
                  <Leitura Icon={ShieldAlert} cor={k.emRisco > 0 ? "#FF5D5D" : "#9CA3AF"} titulo="Pacientes críticos"
                    valor={`${k.emRisco}`} sufixo={`de ${k.pacientesAtivos} ativos`} />
                  <Leitura Icon={Utensils} cor="#7CFF5B" titulo="Seguiram o plano alimentar"
                    valor={data.alimentacaoBreakdown.amostra ? `${data.alimentacaoBreakdown.seguiu ?? 0}%` : "sem dados"}
                    sufixo={data.alimentacaoBreakdown.amostra ? "das refeições registradas" : undefined} />
                  {data.desafiosResumo.ativos > 0 && (
                    <Leitura Icon={Target} cor="#F8C84B" titulo="Desafios ativos"
                      valor={`${data.desafiosResumo.ativos}`}
                      sufixo={`${data.desafiosResumo.participantes} participando · ${data.desafiosResumo.concluidos} concluíram`} />
                  )}
                </div>
              )}
            </StateBox>
          </div>
        </section>
      </main>

      <AccountSheet open={contaOpen} onClose={() => setContaOpen(false)} />
    </div>
  );
}

/* ───────── 1 · Resumo Inteligente ───────── */
function ResumoInteligente({
  loading, emRisco, evoluiram, mensagens, desafios, onPrioridades,
}: {
  loading: boolean; emRisco?: number; evoluiram?: number; mensagens?: number; desafios?: number;
  onPrioridades: () => void;
}) {
  const linhas: { cor: string; texto: React.ReactNode }[] = [];
  if (emRisco != null)
    linhas.push({ cor: "#FF5D5D", texto: emRisco > 0
      ? <><b className="text-nx-on-surface">{emRisco}</b> {emRisco === 1 ? "paciente precisa" : "pacientes precisam"} de atenção.</>
      : <>Ninguém em risco agora — carteira saudável 💚</> });
  if (evoluiram != null && evoluiram > 0)
    linhas.push({ cor: "#7CFF5B", texto: <><b className="text-nx-on-surface">{evoluiram}</b> {evoluiram === 1 ? "paciente evoluiu" : "pacientes evoluíram"} muito bem esta semana.</> });
  if (mensagens != null && mensagens > 0)
    linhas.push({ cor: "#49A8FF", texto: <><b className="text-nx-on-surface">{mensagens}</b> {mensagens === 1 ? "mensagem aguarda" : "mensagens aguardam"} resposta.</> });
  if (desafios != null && desafios > 0)
    linhas.push({ cor: "#F8C84B", texto: <><b className="text-nx-on-surface">{desafios}</b> {desafios === 1 ? "desafio ativo" : "desafios ativos"} em andamento.</> });

  return (
    <div className="relative overflow-hidden rounded-nx-lg border border-nx-evo/25 bg-nx-surface p-5 sm:p-6">
      {/* brilho de marca, discreto */}
      <div className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-nx-evo/10 blur-3xl" />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="mb-3 flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-nx-md bg-nx-evo/12">
              <Sparkles className="size-4 text-nx-evo" />
            </span>
            <h2 className="text-body-lg font-semibold text-nx-on-surface">Resumo Inteligente</h2>
            <span className="rounded-full border border-nx-border px-2 py-0.5 text-label-sm uppercase tracking-wide text-nx-on-surface-variant">IA em breve</span>
          </div>

          {loading ? (
            <div className="space-y-2.5">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-4 w-64 max-w-full animate-pulse rounded bg-nx-container/60" />
              ))}
            </div>
          ) : (
            <ul className="grid gap-2.5 sm:grid-cols-2 sm:gap-x-8">
              {linhas.map((l, i) => (
                <li key={i} className="flex items-start gap-2.5 text-body-md text-nx-on-surface-variant">
                  <span className="mt-1.5 size-2 shrink-0 rounded-full" style={{ background: l.cor, boxShadow: `0 0 8px ${l.cor}` }} />
                  <span>{l.texto}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <button
          onClick={onPrioridades}
          className="group inline-flex shrink-0 items-center justify-center gap-1.5 self-start rounded-nx-md bg-nx-evo px-4 py-2.5 text-label-md font-bold text-nx-on-evo shadow-[0_8px_30px_-10px_rgba(124,255,91,0.5)] transition-colors hover:bg-nx-evo-2"
        >
          Ver prioridades
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0" />
        </button>
      </div>
    </div>
  );
}

/* ───────── 2 · indicador compacto ───────── */
function StatTile({
  Icon, cor, label, valor, loading, mudo, onClick,
}: {
  Icon: typeof CheckCircle2; cor: string; label: string; valor?: number; loading: boolean; mudo?: boolean; onClick?: () => void;
}) {
  if (loading || valor == null)
    return <div className="h-[92px] animate-pulse rounded-nx-lg bg-nx-container/40" />;
  const ativo = !mudo;
  const Wrap: any = onClick ? "button" : "div";
  return (
    <Wrap
      {...(onClick ? { onClick, type: "button" } : {})}
      className={`flex h-[92px] flex-col justify-between rounded-nx-lg border border-nx-border bg-nx-surface p-4 text-left ${
        onClick ? "transition-colors hover:border-nx-outline active:scale-[0.99]" : ""}`}
    >
      <div className="flex items-center justify-between">
        <span className="truncate text-label-md uppercase tracking-wide text-nx-on-surface-variant">{label}</span>
        <Icon className="size-4 shrink-0" style={{ color: ativo ? cor : "#6B7280" }} />
      </div>
      <span className="text-display-md leading-none tabular-nums" style={{ color: ativo ? cor : undefined }}>
        <span className={ativo ? "" : "text-nx-on-surface"}>{nf(valor)}</span>
      </span>
    </Wrap>
  );
}

/* ───────── 3 · Adesão premium ───────── */
function trendMeta(delta: number) {
  if (delta > 0) return { Icon: TrendingUp, cls: "text-nx-evo", txt: `+${delta}` };
  if (delta < 0) return { Icon: TrendingDown, cls: "text-nx-danger", txt: `${delta}` };
  return { Icon: Minus, cls: "text-nx-on-surface-variant", txt: "0" };
}
function aderStatus(pct: number) {
  if (pct >= 70) return { label: "Saudável", cls: "bg-nx-evo/12 text-nx-evo" };
  if (pct >= 50) return { label: "Atenção", cls: "bg-nx-gold/15 text-nx-gold" };
  return { label: "Crítico", cls: "bg-nx-danger/12 text-nx-danger" };
}

function AdesaoPremium({ ader, retencao, loading }: {
  ader?: LigasResp["aderenciaSemana"]; retencao?: number; loading: boolean;
}) {
  if (loading || !ader) return <div className="h-[150px] animate-pulse rounded-nx-lg bg-nx-container/40" />;
  const t = trendMeta(ader.delta);
  const st = aderStatus(ader.atual);
  const maxBar = Math.max(ader.atual, ader.anterior, 1);
  const bars = [
    { key: "anterior", label: "Semana passada", val: ader.anterior, cor: "#3A4150" },
    { key: "atual", label: "Esta semana", val: ader.atual, cor: "#7CFF5B" },
  ];
  return (
    <div className="flex flex-col gap-6 rounded-nx-lg border border-nx-border bg-nx-surface p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
      {/* valor grande + status */}
      <div className="min-w-0">
        <div className="mb-2 flex items-center gap-2">
          <span className="text-label-md uppercase tracking-wide text-nx-on-surface-variant">Adesão da clínica</span>
          <span className={`rounded-full px-2 py-0.5 text-label-md font-semibold ${st.cls}`}>{st.label}</span>
        </div>
        <div className="flex items-end gap-3">
          <p className="text-display-lg leading-none tabular-nums text-nx-on-surface">
            {ader.atual}<span className="text-headline-md text-nx-on-surface-variant">%</span>
          </p>
          <p className={`mb-1.5 flex items-center gap-1 text-body-sm font-medium ${t.cls}`}>
            <t.Icon className="size-4" /> {t.txt} p.p.
          </p>
        </div>
        {retencao != null && (
          <p className="mt-2 text-body-sm text-nx-on-surface-variant">
            Retenção prevista <span className="font-semibold text-nx-on-surface tabular-nums">{retencao}%</span> · sequência viva e ativos há ≤3 dias
          </p>
        )}
      </div>

      {/* gráfico pequeno (esta semana vs anterior) */}
      <div className="flex shrink-0 items-end gap-4">
        {bars.map((b) => (
          <div key={b.key} className="flex flex-col items-center gap-2">
            <div className="flex h-20 w-9 items-end overflow-hidden rounded-md bg-nx-container-low">
              <div className="w-full rounded-md transition-all"
                style={{ height: `${Math.max(6, (b.val / maxBar) * 100)}%`, background: b.cor, boxShadow: b.key === "atual" ? `0 0 12px ${b.cor}66` : undefined }} />
            </div>
            <span className="text-label-sm font-semibold tabular-nums text-nx-on-surface">{b.val}%</span>
            <span className="w-14 text-center text-label-sm leading-tight text-nx-on-surface-variant">{b.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ───────── 4 · linha de prioridade (uma por paciente) ───────── */
function ScoreCircle({ score }: { score: number }) {
  const cor = scoreCor(score);
  return (
    <span
      title={`Score de aderência ${score}%`}
      className="grid size-9 shrink-0 place-items-center rounded-full text-label-sm font-bold tabular-nums"
      style={{ color: cor, border: `2px solid ${cor}`, background: `${cor}14` }}
    >
      {score}
    </span>
  );
}

function AcaoBtn({ Icon, label, onClick }: { Icon: typeof MessageSquare; label: string; onClick: () => void }) {
  return (
    <button
      title={label} aria-label={label}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className="grid size-8 place-items-center rounded-nx-sm border border-nx-border bg-nx-container text-nx-on-surface-variant transition-colors hover:border-nx-outline hover:text-nx-on-surface"
    >
      <Icon className="size-4" />
    </button>
  );
}

function PrioridadeRow({ p, onOpen, navigate }: { p: PacienteLinha; onOpen: () => void; navigate: (to: string) => void }) {
  const ins = insightDe(p);
  const ligaCor = CORES_LIGA[p.liga] ?? "#9CA3AF";
  const { pct, faltam, proxima } = progressoLiga(p.pontos);
  return (
    <li
      onClick={onOpen}
      className="group flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-nx-container/40"
    >
      {/* Foto + status + nome + motivo */}
      <div className="relative shrink-0">
        <Avatar src={p.foto} nome={p.nome} tamanho={40} />
        <span className={`absolute -right-0.5 -top-0.5 size-2.5 rounded-full ring-2 ring-nx-surface ${
          p.risco === "risco" ? "bg-nx-danger" : p.risco === "atencao" ? "bg-nx-streak" : "bg-nx-evo"}`} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-body-md font-semibold text-nx-on-surface">{p.nome}</p>
        <p className={`truncate text-body-sm ${TONE_TEXT[ins.tone]}`}>{ins.texto}</p>
      </div>

      {/* Liga */}
      <span className="hidden w-24 shrink-0 items-center gap-1.5 whitespace-nowrap text-body-sm text-nx-on-surface md:inline-flex">
        <span className="size-2.5 rounded-full" style={{ background: ligaCor }} />
        {p.liga} {p.ligaNivel}
      </span>

      {/* XP + barra de progresso + % */}
      <div className="hidden w-40 shrink-0 lg:block">
        <div className="mb-1 flex items-baseline justify-between">
          <span className="text-label-md font-semibold tabular-nums text-nx-on-surface">{nf(p.pontos)} <span className="font-normal text-nx-on-surface-variant">XP</span></span>
          <span className="text-label-sm font-semibold tabular-nums" style={{ color: ligaCor }}>{proxima ? `${pct}%` : "MÁX"}</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-nx-container-low">
          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: ligaCor }} />
        </div>
        <p className="mt-1 truncate text-label-sm text-nx-on-surface-variant">
          {proxima ? `Faltam ${nf(faltam)} XP p/ ${proxima.liga} ${proxima.nivel}` : "Liga máxima 👑"}
        </p>
      </div>

      {/* Score */}
      <ScoreCircle score={p.score} />

      {/* Ações + abrir */}
      <div className="flex shrink-0 items-center gap-1.5">
        <span className="hidden items-center gap-1.5 sm:flex">
          <AcaoBtn Icon={MessageSquare} label="Mensagem" onClick={() => navigate(`/app/mensagens/${p.id}`)} />
          <AcaoBtn Icon={Target} label="Criar desafio" onClick={() => navigate("/app/desafios")} />
        </span>
        <ChevronRight className="size-5 text-nx-outline transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0" />
      </div>
    </li>
  );
}

function EmptyCarteira({ filtro }: { filtro: "todos" | "criticos" | "hoje" }) {
  const msg = filtro === "criticos" ? "Nenhum paciente em risco agora 💚"
    : filtro === "hoje" ? "Ninguém registrou hoje ainda."
    : "Nenhum paciente ativo na carteira.";
  return (
    <div className="flex h-40 flex-col items-center justify-center gap-2 text-center">
      <Sparkles className="size-6 text-nx-evo" />
      <p className="text-body-md text-nx-on-surface-variant">{msg}</p>
    </div>
  );
}

/* ───────── ligas ───────── */
function LigasDistribuicao({ dados }: { dados?: LigasResp["distribuicaoLigas"] }) {
  const arr = (dados ?? []).filter((d) => d.count > 0);
  const total = arr.reduce((s, d) => s + d.count, 0);
  if (total === 0) return <p className="text-body-sm text-nx-on-surface-variant">Sem pacientes com liga ainda.</p>;
  const max = Math.max(...arr.map((d) => d.count));
  return (
    <div className="space-y-3">
      {arr.map((d) => {
        const cor = CORES_LIGA[d.liga] ?? d.cor;
        return (
          <div key={d.liga} className="flex items-center gap-3">
            <span className="flex w-24 shrink-0 items-center gap-1.5 text-body-sm text-nx-on-surface">
              <span className="size-2.5 rounded-full" style={{ background: cor }} /> {d.liga}
            </span>
            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-nx-container-low">
              <div className="h-full rounded-full" style={{ width: `${Math.max(6, (d.count / max) * 100)}%`, background: cor }} />
            </div>
            <span className="w-8 shrink-0 text-right text-body-sm font-semibold tabular-nums text-nx-on-surface">{d.count}</span>
          </div>
        );
      })}
    </div>
  );
}

function SubiramSemana({ itens, onOpen }: { itens?: LigasResp["subiramSemana"]; onOpen: (id: string) => void }) {
  if (!itens || itens.length === 0) {
    return (
      <div className="flex h-40 flex-col items-center justify-center gap-2 text-center">
        <Trophy className="size-6 text-nx-on-surface-variant" />
        <p className="text-body-sm text-nx-on-surface-variant">Ninguém subiu de liga esta semana ainda.</p>
        <p className="text-label-md text-nx-outline">Quando alguém promover, aparece aqui.</p>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {itens.map((p) => (
        <button key={p.id} onClick={() => onOpen(p.id)}
          className="flex w-full items-center gap-3 rounded-nx-md border border-nx-border bg-nx-container/40 px-3 py-2.5 text-left transition-colors hover:border-nx-outline">
          <Avatar src={p.foto} nome={p.nome} tamanho={34} />
          <span className="min-w-0 flex-1 truncate text-body-md font-semibold text-nx-on-surface">{p.nome}</span>
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-body-sm font-medium" style={{ color: CORES_LIGA[p.liga] ?? "#F8C84B" }}>
            <TrendingUp className="size-3.5" /> {p.liga} {p.ligaNivel}
          </span>
        </button>
      ))}
    </div>
  );
}

/* ───────── panorama ───────── */
function Leitura({ Icon, cor, titulo, valor, trend, sufixo }: {
  Icon: typeof TrendingUp; cor: string; titulo: string; valor: string; trend?: number; sufixo?: string;
}) {
  const t = trend != null ? trendMeta(trend) : null;
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-nx-md" style={{ background: `${cor}1F` }}>
        <Icon className="size-4" style={{ color: cor }} />
      </span>
      <div className="min-w-0">
        <p className="text-body-sm text-nx-on-surface-variant">{titulo}</p>
        <p className="flex flex-wrap items-baseline gap-x-2 text-body-lg font-semibold text-nx-on-surface">
          {valor}
          {t && <span className={`inline-flex items-center gap-0.5 text-body-sm font-medium ${t.cls}`}><t.Icon className="size-3.5" />{t.txt}</span>}
        </p>
        {sufixo && <p className="text-label-md text-nx-on-surface-variant">{sufixo}</p>}
      </div>
    </div>
  );
}

/* ───────── primitivos ───────── */
function StateBox({
  loading, error, empty, onRetry, children, minH = "h-28",
}: {
  loading: boolean; error: string | null; empty?: boolean; onRetry?: () => void;
  children: React.ReactNode; minH?: string;
}) {
  if (loading) return <div className={`${minH} animate-pulse rounded-nx-lg bg-nx-container/50`} aria-busy="true" />;
  if (error)
    return (
      <div className={`${minH} flex flex-col items-center justify-center gap-2 text-center`}>
        <p className="text-body-sm text-nx-danger">{error}</p>
        {onRetry && <button onClick={onRetry} className="text-label-md text-nx-evo hover:underline">Tentar de novo</button>}
      </div>
    );
  if (empty) return <div className={`${minH} flex items-center justify-center text-body-sm text-nx-on-surface-variant`}>Sem dados ainda</div>;
  return <>{children}</>;
}
