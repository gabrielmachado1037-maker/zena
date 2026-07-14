import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Flame, ChevronRight, Sparkles, Users, ShieldAlert, TrendingUp, TrendingDown, Minus,
  MessageSquare, Target, ArrowRight, Trophy, Utensils, Dumbbell, Droplets, Moon,
} from "lucide-react";
import { useFetch } from "../hooks/useFetch";
import Avatar from "../components/Avatar";
import AccountSheet from "../components/AccountSheet";
import { useAuth } from "../contexts/AuthContext";
import { CORES_LIGA } from "../lib/ligas";

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

/* ───────── página ───────── */
export default function Dashboard() {
  const navigate = useNavigate();
  const { nutricionista } = useAuth();
  const { data, loading, error, refetch } = useFetch<LigasResp>("/dashboard/ligas");
  const [filtro, setFiltro] = useState<"todos" | "criticos" | "hoje">("todos");
  const [contaOpen, setContaOpen] = useState(false);

  const k = data?.kpis;
  const primeiroNome = (data?.nutri?.nome ?? "").trim().split(/\s+/)[0] || "";

  const lista = data?.pacientesLista ?? [];
  const criticos = useMemo(() => lista.filter((p) => p.risco === "risco"), [lista]);
  const listaFiltrada = useMemo(() => {
    if (filtro === "criticos") return criticos;
    if (filtro === "hoje") return lista.filter((p) => p.diasInativo === 0);
    return lista;
  }, [lista, criticos, filtro]);

  // hábito mais difícil da clínica (Resumo Inteligente)
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
        <header className="mb-7 flex items-start justify-between gap-4">
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

        {/* 3 indicadores com tendência */}
        <section className="mb-9 grid gap-3 sm:grid-cols-3">
          <AderenciaCard s={data?.aderenciaSemana} loading={loading} />
          <CriticosCard n={k?.emRisco} total={k?.pacientesAtivos} loading={loading}
            onClick={() => { setFiltro("criticos"); document.getElementById("carteira")?.scrollIntoView({ behavior: "smooth", block: "start" }); }} />
          <RetencaoCard pct={data?.retencaoPrevista} loading={loading} />
        </section>

        {/* Carteira de pacientes */}
        <section id="carteira" className="mb-9 scroll-mt-6">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h2 className="text-body-lg font-semibold text-nx-on-surface">Carteira de pacientes</h2>
              <span className="rounded-full bg-nx-container-high px-2 py-0.5 text-label-md font-semibold tabular-nums text-nx-on-surface-variant">{lista.length}</span>
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
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] border-collapse text-left">
                    <thead>
                      <tr className="border-b border-nx-border text-label-md uppercase tracking-wide text-nx-on-surface-variant">
                        <th className="px-4 py-2.5 font-semibold">Paciente</th>
                        <th className="px-3 py-2.5 font-semibold">Liga</th>
                        <th className="px-3 py-2.5 font-semibold">Sequência</th>
                        <th className="px-3 py-2.5 font-semibold">Aderência</th>
                        <th className="hidden px-3 py-2.5 font-semibold lg:table-cell">Sem check-in</th>
                        <th className="hidden px-3 py-2.5 font-semibold lg:table-cell">Maior dificuldade</th>
                        <th className="px-3 py-2.5 text-right font-semibold">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {listaFiltrada.map((p) => (
                        <PacienteRow key={p.id} p={p} onOpen={() => navigate(`/app/pacientes/${p.id}`)} navigate={navigate} />
                      ))}
                    </tbody>
                  </table>
                </div>
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

        {/* Resumo Inteligente da Clínica */}
        <section>
          <div className="mb-3 flex items-center gap-2">
            <Sparkles className="size-4 text-nx-evo" />
            <h2 className="text-body-lg font-semibold text-nx-on-surface">Resumo inteligente da clínica</h2>
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

/* ───────── indicadores ───────── */
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

function IndicadorShell({ children, minH = "h-[132px]" }: { children: React.ReactNode; minH?: string }) {
  return <div className={`flex flex-col justify-between rounded-nx-lg border border-nx-border bg-nx-surface p-5 ${minH}`}>{children}</div>;
}

function AderenciaCard({ s, loading }: { s?: LigasResp["aderenciaSemana"]; loading: boolean }) {
  if (loading || !s) return <IndicadorShell><div className="h-full animate-pulse rounded bg-nx-container/50" /></IndicadorShell>;
  const t = trendMeta(s.delta);
  const st = aderStatus(s.atual);
  return (
    <IndicadorShell>
      <div className="flex items-center justify-between">
        <span className="text-label-md uppercase tracking-wide text-nx-on-surface-variant">Aderência da clínica</span>
        <span className={`rounded-full px-2 py-0.5 text-label-md font-semibold ${st.cls}`}>{st.label}</span>
      </div>
      <div className="flex items-end gap-2">
        <p className="text-display-lg leading-none tabular-nums text-nx-on-surface">{s.atual}<span className="text-headline-md text-nx-on-surface-variant">%</span></p>
      </div>
      <p className={`flex items-center gap-1 text-body-sm font-medium ${t.cls}`}>
        <t.Icon className="size-4" /> {t.txt} p.p. <span className="font-normal text-nx-on-surface-variant">vs semana passada</span>
      </p>
    </IndicadorShell>
  );
}

function CriticosCard({ n, total, loading, onClick }: { n?: number; total?: number; loading: boolean; onClick: () => void }) {
  if (loading || n == null) return <IndicadorShell><div className="h-full animate-pulse rounded bg-nx-container/50" /></IndicadorShell>;
  const danger = n > 0;
  return (
    <IndicadorShell>
      <div className="flex items-center justify-between">
        <span className="text-label-md uppercase tracking-wide text-nx-on-surface-variant">Pacientes críticos</span>
        <ShieldAlert className={`size-4 ${danger ? "text-nx-danger" : "text-nx-on-surface-variant"}`} />
      </div>
      <p className={`text-display-lg leading-none tabular-nums ${danger ? "text-nx-danger" : "text-nx-on-surface"}`}>{n}</p>
      {danger ? (
        <button onClick={onClick} className="flex items-center gap-1 text-body-sm font-semibold text-nx-danger hover:underline">
          Ver críticos <ArrowRight className="size-3.5" />
        </button>
      ) : (
        <p className="text-body-sm text-nx-on-surface-variant">Ninguém inativo há 3+ dias 💚</p>
      )}
    </IndicadorShell>
  );
}

function RetencaoCard({ pct, loading }: { pct?: number; loading: boolean }) {
  if (loading || pct == null) return <IndicadorShell><div className="h-full animate-pulse rounded bg-nx-container/50" /></IndicadorShell>;
  return (
    <IndicadorShell>
      <div className="flex items-center justify-between">
        <span className="text-label-md uppercase tracking-wide text-nx-on-surface-variant">Retenção prevista</span>
        <Users className="size-4 text-nx-on-surface-variant" />
      </div>
      <p className="text-display-lg leading-none tabular-nums text-nx-on-surface">{pct}<span className="text-headline-md text-nx-on-surface-variant">%</span></p>
      <p className="text-body-sm text-nx-on-surface-variant">estimativa · com sequência viva e ativos há ≤3 dias</p>
    </IndicadorShell>
  );
}

/* ───────── carteira ───────── */
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

function PacienteRow({ p, onOpen, navigate }: { p: PacienteLinha; onOpen: () => void; navigate: (to: string) => void }) {
  const ins = insightDe(p);
  const ligaCor = CORES_LIGA[p.liga] ?? "#9CA3AF";
  const diasCls = p.diasInativo >= 3 ? "text-nx-danger" : p.diasInativo >= 1 ? "text-nx-streak" : "text-nx-on-surface-variant";
  const dif = p.maiorDificuldade;
  const difCor = dif ? (HABITO[dif.habito as keyof typeof HABITO]?.cor ?? "#9CA3AF") : "#9CA3AF";
  return (
    <tr onClick={onOpen}
      className="group cursor-pointer border-b border-nx-border/70 transition-colors last:border-0 hover:bg-nx-container/40">
      {/* Paciente + insight */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            <Avatar src={p.foto} nome={p.nome} tamanho={38} />
            <span className={`absolute -right-0.5 -top-0.5 size-2.5 rounded-full ring-2 ring-nx-surface ${
              p.risco === "risco" ? "bg-nx-danger" : p.risco === "atencao" ? "bg-nx-streak" : "bg-nx-evo"}`} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-body-md font-semibold text-nx-on-surface">{p.nome}</p>
            <p className={`truncate text-body-sm ${TONE_TEXT[ins.tone]}`}>{ins.texto}</p>
          </div>
        </div>
      </td>
      {/* Liga */}
      <td className="px-3 py-3">
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-body-sm text-nx-on-surface">
          <span className="size-2.5 rounded-full" style={{ background: ligaCor }} />
          {p.liga} {p.ligaNivel}
        </span>
      </td>
      {/* Sequência */}
      <td className="px-3 py-3">
        {p.streak > 0 ? (
          <span className="inline-flex items-center gap-1 text-body-sm font-medium text-nx-streak">
            <Flame className="size-3.5" /> {p.streak}
          </span>
        ) : <span className="text-body-sm text-nx-on-surface-variant">—</span>}
      </td>
      {/* Aderência */}
      <td className="px-3 py-3">
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-nx-container-low">
            <div className="h-full rounded-full" style={{ width: `${p.score}%`, background: p.score >= 60 ? "#7CFF5B" : p.score >= 35 ? "#F8C84B" : "#FF5D5D" }} />
          </div>
          <span className="text-body-sm font-semibold tabular-nums text-nx-on-surface">{p.score}%</span>
        </div>
      </td>
      {/* Sem check-in */}
      <td className="hidden px-3 py-3 lg:table-cell">
        <span className={`text-body-sm font-medium tabular-nums ${diasCls}`}>
          {p.diasInativo === 0 ? "Hoje" : p.diasInativo === 1 ? "1 dia" : `${p.diasInativo} dias`}
        </span>
      </td>
      {/* Maior dificuldade */}
      <td className="hidden px-3 py-3 lg:table-cell">
        {dif ? (
          <span className="inline-flex items-center gap-1.5 rounded-nx-sm border border-nx-border px-2 py-1 text-label-md text-nx-on-surface">
            <span className="size-2 rounded-full" style={{ background: difCor }} />
            {dif.label} {dif.pct}%
          </span>
        ) : <span className="text-body-sm text-nx-on-surface-variant">—</span>}
      </td>
      {/* Ações */}
      <td className="px-3 py-3">
        <div className="flex items-center justify-end gap-1.5">
          <AcaoBtn Icon={MessageSquare} label="Mensagem" onClick={() => navigate("/app/mensagens")} />
          <AcaoBtn Icon={Target} label="Criar desafio" onClick={() => navigate("/app/desafios")} />
          <ChevronRight className="size-4 text-nx-outline transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0" />
        </div>
      </td>
    </tr>
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

/* ───────── resumo inteligente ───────── */
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
