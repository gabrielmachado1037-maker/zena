import { useNavigate } from "react-router-dom";
import {
  Flame, ChevronRight, Send, SlidersHorizontal, Sparkles,
  Users, HeartPulse, ShieldAlert, Trophy,
} from "lucide-react";
import { useFetch } from "../hooks/useFetch";
import Avatar from "../components/Avatar";

/* ───────── shapes reais da API ───────── */
interface LigasResp {
  kpis: {
    pacientesAtivos: number; novosMes: number; retencao30: number;
    checkinsHoje: number; pctCheckins: number; emRisco: number; indiceSaude: number;
    ligaClinica: { liga: string; nivel: string; cor: string; icone: string };
  };
  distribuicaoLigas: { liga: string; count: number; cor: string }[];
  retencaoMensal: { label: string; pct: number }[];
  topRanking: { pos: number; nome: string; pontos: number; liga: string; ligaNivel: string; streak: number; foto: string | null }[];
  alertas: { id: string; nome: string; foto: string | null; diasInativo: number; liga: string; ultimoCheckin: string | null }[];
  pedidosAjuste: { registroId: string; pacienteId: string; pacienteNome: string }[];
  desempenhoCategoria: { alimentacao: number; treino: number; agua: number; sono: number };
}

const nf = (n: number) => n.toLocaleString("pt-BR");

/* ───────── primitivos ───────── */
function StateBox({
  loading, error, empty, onRetry, children, minH = "h-28",
}: {
  loading: boolean; error: string | null; empty?: boolean; onRetry?: () => void;
  children: React.ReactNode; minH?: string;
}) {
  if (loading) return <div className={`${minH} animate-pulse rounded-nx-lg bg-nx-container/60`} aria-busy="true" />;
  if (error)
    return (
      <div className={`${minH} flex flex-col items-center justify-center gap-2 text-center`}>
        <p className="text-body-sm text-nx-danger">{error}</p>
        {onRetry && <button onClick={onRetry} className="text-label-md text-nx-evo hover:underline">Tentar de novo</button>}
      </div>
    );
  if (empty) return <div className={`${minH} flex items-center justify-center text-body-sm text-nx-outline`}>Sem dados ainda</div>;
  return <>{children}</>;
}

/* Pessoa que precisa de ação — a linha é o alvo de toque (vai pro paciente). */
function PersonaRow({
  foto, nome, motivo, acao, tone, onClick,
}: {
  foto: string | null; nome: string; motivo: string; acao: string;
  tone: "risco" | "ajuste"; onClick: () => void;
}) {
  const c = tone === "risco"
    ? { border: "border-l-nx-danger", motivo: "text-nx-danger", acao: "text-nx-danger", Icon: Send }
    : { border: "border-l-nx-streak", motivo: "text-nx-streak", acao: "text-nx-streak", Icon: SlidersHorizontal };
  const Icon = c.Icon;
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-nx-md border border-nx-border border-l-2 ${c.border} bg-nx-surface px-3.5 py-3 text-left transition-colors hover:bg-nx-surface-hover`}
    >
      <Avatar src={foto} nome={nome} tamanho={40} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-body-md font-semibold text-nx-on-surface">{nome}</p>
        <p className={`truncate text-body-sm ${c.motivo}`}>{motivo}</p>
      </div>
      <span className={`flex shrink-0 items-center gap-1 text-body-sm font-semibold ${c.acao}`}>
        <Icon className="size-4" /> {acao}
      </span>
      <ChevronRight className="size-4 shrink-0 text-nx-outline" />
    </button>
  );
}

const MEDAL = ["#F8C84B", "#C2C9D2", "#C77B3C"];
const CATS: { key: keyof LigasResp["desempenhoCategoria"]; label: string; color: string }[] = [
  { key: "agua", label: "Hidratação", color: "#49A8FF" },
  { key: "alimentacao", label: "Alimentação", color: "#7CFF5B" },
  { key: "treino", label: "Treino", color: "#FF8A1F" },
  { key: "sono", label: "Sono", color: "#8B7DFF" },
];

/* ───────── página ───────── */
export default function Dashboard() {
  const navigate = useNavigate();
  const ligas = useFetch<LigasResp>("/dashboard/ligas");
  const k = ligas.data?.kpis;

  const hoje = new Date().toLocaleDateString("pt-BR", { day: "numeric", month: "long" });

  const risco = (ligas.data?.alertas ?? []).map((a) => ({
    key: `r-${a.id}`, id: a.id, nome: a.nome, foto: a.foto,
    motivo: `${a.diasInativo} ${a.diasInativo === 1 ? "dia" : "dias"} sem check-in`,
    tone: "risco" as const, acao: "Motivar",
  }));
  const ajuste = (ligas.data?.pedidosAjuste ?? []).map((p) => ({
    key: `a-${p.registroId}`, id: p.pacienteId, nome: p.pacienteNome, foto: null as string | null,
    motivo: "Pediu ajuste no plano", tone: "ajuste" as const, acao: "Ajustar",
  }));
  const prioridade = [...risco, ...ajuste];

  return (
    <div className="min-h-screen bg-nx-bg-lowest text-nx-on-surface font-sans">
      <main className="mx-auto max-w-5xl px-4 py-6 pb-24 md:px-6 lg:pb-6">
        {/* Header */}
        <header className="mb-6">
          <h1 className="text-headline-lg text-nx-on-surface">Visão geral</h1>
          <p className="mt-0.5 text-body-md text-nx-on-surface-variant">Resumo do dia {hoje}</p>
        </header>

        {/* Faixa enxuta de sinais vitais */}
        <section className="mb-8 grid grid-cols-3 gap-3">
          <StatMini label="Ativos" value={k?.pacientesAtivos} icon={<Users className="size-4 text-nx-on-surface-variant" />} loading={ligas.loading} />
          <StatMini label="Check-ins hoje" value={k?.checkinsHoje} tone="evo" sub={k ? `${k.pctCheckins}% dos ativos` : undefined} icon={<HeartPulse className="size-4 text-nx-evo" />} loading={ligas.loading} />
          <StatMini label="Em risco" value={k?.emRisco} tone={k && k.emRisco > 0 ? "danger" : undefined} icon={<ShieldAlert className={`size-4 ${k && k.emRisco > 0 ? "text-nx-danger" : "text-nx-on-surface-variant"}`} />} loading={ligas.loading} />
        </section>

        {/* BLOCO 1 — Precisa de você agora */}
        <section className="mb-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-body-lg font-semibold text-nx-on-surface">Precisa de você agora</h2>
            {prioridade.length > 0 && (
              <button onClick={() => navigate("/app/pacientes")} className="text-body-sm text-nx-evo hover:underline">Ver todos</button>
            )}
          </div>
          <StateBox loading={ligas.loading} error={ligas.error} onRetry={ligas.refetch} minH="h-40">
            {prioridade.length === 0 ? (
              <div className="flex items-center gap-3 rounded-nx-lg border border-nx-evo/30 bg-nx-evo/8 p-5">
                <Sparkles className="size-6 shrink-0 text-nx-evo" />
                <div>
                  <p className="text-body-md font-semibold text-nx-on-surface">Tudo em dia 💚</p>
                  <p className="text-body-sm text-nx-on-surface-variant">Ninguém precisa de atenção urgente agora.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {prioridade.slice(0, 6).map((p) => (
                  <PersonaRow key={p.key} foto={p.foto} nome={p.nome} motivo={p.motivo} acao={p.acao} tone={p.tone} onClick={() => navigate(`/app/pacientes/${p.id}`)} />
                ))}
              </div>
            )}
          </StateBox>
        </section>

        {/* BLOCO 2 — Evoluíram esta semana */}
        <section className="mb-8">
          <h2 className="mb-3 text-body-lg font-semibold text-nx-on-surface">Evoluíram esta semana</h2>
          <StateBox loading={ligas.loading} error={ligas.error} onRetry={ligas.refetch} empty={(ligas.data?.topRanking.length ?? 0) === 0} minH="h-40">
            <div className="space-y-2">
              {ligas.data?.topRanking.slice(0, 5).map((p, i) => (
                <button
                  key={p.pos}
                  onClick={() => navigate("/app/pacientes")}
                  className="flex w-full items-center gap-3 rounded-nx-md border border-nx-border bg-nx-surface px-3.5 py-3 text-left transition-colors hover:bg-nx-surface-hover"
                >
                  <span className="w-5 text-center text-body-md font-bold tabular-nums" style={{ color: i < 3 ? MEDAL[i] : undefined }}>{p.pos}</span>
                  <Avatar src={p.foto} nome={p.nome} tamanho={38} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-body-md font-semibold text-nx-on-surface">{p.nome}</p>
                    <p className="truncate text-body-sm text-nx-outline">{p.liga} {p.ligaNivel}</p>
                  </div>
                  {p.streak > 0 && (
                    <span className="flex shrink-0 items-center gap-1 text-body-sm font-medium text-nx-streak">
                      <Flame className="size-3.5" /> {p.streak}
                    </span>
                  )}
                  <span className="shrink-0 text-body-sm font-bold tabular-nums text-nx-evo">{nf(p.pontos)} XP</span>
                </button>
              ))}
            </div>
          </StateBox>
        </section>

        {/* Pulso da clínica — slim, sem gráficos pesados */}
        <section>
          <h2 className="mb-3 text-body-lg font-semibold text-nx-on-surface">Pulso da clínica</h2>
          <div className="rounded-nx-lg border border-nx-border bg-nx-surface p-5">
            <StateBox loading={ligas.loading} error={ligas.error} onRetry={ligas.refetch} minH="h-32">
              <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
                {CATS.map((cat) => {
                  const pct = ligas.data?.desempenhoCategoria[cat.key] ?? 0;
                  return (
                    <div key={cat.key}>
                      <div className="mb-1.5 flex items-center justify-between text-body-sm">
                        <span className="text-nx-on-surface-variant">{cat.label}</span>
                        <span className="font-semibold tabular-nums text-nx-on-surface">{pct}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-nx-container-low">
                        <div className="h-full rounded-full" style={{ width: `${Math.min(100, pct)}%`, background: cat.color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </StateBox>
          </div>
        </section>
      </main>
    </div>
  );
}

/* ───────── subcomponentes ───────── */
function StatMini({
  label, value, sub, tone, icon, loading,
}: {
  label: string; value?: number; sub?: string; tone?: "evo" | "danger";
  icon: React.ReactNode; loading: boolean;
}) {
  const valueColor = tone === "evo" ? "text-nx-evo" : tone === "danger" ? "text-nx-danger" : "text-nx-on-surface";
  return (
    <div className="rounded-nx-md border border-nx-border bg-nx-surface p-4">
      <div className="flex items-center justify-between">
        <span className="text-label-md uppercase text-nx-outline">{label}</span>
        {icon}
      </div>
      {loading ? (
        <div className="mt-2 h-8 w-12 animate-pulse rounded bg-nx-container/60" />
      ) : (
        <p className={`mt-1 text-display-lg leading-none tabular-nums ${valueColor}`}>{value ?? "—"}</p>
      )}
      {sub && !loading && <p className="mt-1.5 text-body-sm text-nx-on-surface-variant">{sub}</p>}
    </div>
  );
}
