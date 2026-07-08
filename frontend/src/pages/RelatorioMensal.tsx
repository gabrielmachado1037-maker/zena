import { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ChevronLeft, FileDown, Sparkles, Loader2, Utensils, Dumbbell,
  Moon, Droplets, Trophy, CalendarClock, Smile, Scale,
} from "lucide-react";
import { useFetch } from "../hooks/useFetch";
import { gerarUrlWhatsApp } from "../lib/utils";

/* ───────── tipos (espelham o backend relatorioService) ───────── */
interface Relatorio {
  paciente: { id: string; nome: string; telefone: string | null };
  periodo: { inicio: string; fim: string; dias: number };
  resumo: { diasRegistrados: number; aderenciaPct: number; xpPeriodo: number; ligaAtual: string; streakMaximo: number };
  refeicoes: Array<{ key: string; label: string; total: number; seguiu: number; adaptou: number; comeuMal: number; pulou: number; problemaPct: number }>;
  treino: { conforme: number; parcial: number; nao: number; faltas: number; motivos: Array<{ motivo: string; vezes: number }> };
  sono: { meta: number; diasComDado: number; mediaHoras: number; diasAbaixoMeta: number };
  agua: { meta: number; diasComDado: number; mediaMl: number; diasAbaixoMeta: number };
  humor: Record<string, number>;
  finaisDeSemana: { totalFds: number; registradosFds: number; aderenciaFdsPct: number; aderenciaUteisPct: number };
  peso: { inicial: number; final: number; delta: number } | null;
  conquistas: Array<{ titulo: string; icone: string | null; data: string }>;
  motivosRefeicoes: Array<{ refeicao: string; texto: string }>;
  insightsRegras: string[];
  insightsIA: string[] | null;
}

const HUMOR_EMOJI: Record<string, string> = { otimo: "😄", bom: "🙂", neutro: "😐", dificil: "😕", pessimo: "😣" };
const HUMOR_LABEL: Record<string, string> = { otimo: "Ótimo", bom: "Bom", neutro: "Neutro", dificil: "Difícil", pessimo: "Péssimo" };

function isoHoje() { return new Date().toISOString().slice(0, 10); }
function isoHa(dias: number) { return new Date(Date.now() - dias * 86_400_000).toISOString().slice(0, 10); }
function brData(iso: string) { const [a, m, d] = iso.split("-"); return `${d}/${m}/${a}`; }

/* ───────── primitivos ───────── */
function Secao({ icon: Icon, titulo, children }: { icon: React.ComponentType<{ size?: number; className?: string }>; titulo: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-nx-border bg-nx-surface p-5">
      <div className="mb-4 flex items-center gap-2">
        <Icon size={18} className="text-nx-evo" />
        <h2 className="text-body-md font-semibold text-nx-on-surface">{titulo}</h2>
      </div>
      {children}
    </section>
  );
}
function Metrica({ rotulo, valor, sub, tom = "text-nx-on-surface" }: { rotulo: string; valor: string; sub?: string; tom?: string }) {
  return (
    <div className="rounded-xl bg-nx-container/50 p-3">
      <p className={`text-[26px] leading-none font-semibold tracking-tight ${tom}`}>{valor}</p>
      <p className="mt-1.5 text-label-sm uppercase text-nx-on-surface-variant">{rotulo}</p>
      {sub && <p className="mt-0.5 text-label-sm text-nx-on-surface-variant">{sub}</p>}
    </div>
  );
}

/* ───────── página ───────── */
export default function RelatorioMensal() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [inicio, setInicio] = useState(isoHa(29));
  const [fim, setFim] = useState(isoHoje());
  const [comIA, setComIA] = useState(false);

  const url = id ? `/pacientes/${id}/relatorio-mensal?inicio=${inicio}&fim=${fim}${comIA ? "&ia=1" : ""}` : null;
  const { data: rel, loading, error } = useFetch<Relatorio>(url);

  // Insights exibidos: IA quando disponível, senão as regras.
  const insights = rel ? (rel.insightsIA && rel.insightsIA.length ? rel.insightsIA : rel.insightsRegras) : [];
  const iaAtiva = !!(rel?.insightsIA && rel.insightsIA.length);

  const textoWhatsApp = useMemo(() => {
    if (!rel) return "";
    const linhas = [
      `*Relatório de ${rel.paciente.nome}*`,
      `${brData(rel.periodo.inicio)} a ${brData(rel.periodo.fim)} · adesão ${rel.resumo.aderenciaPct}% (${rel.resumo.diasRegistrados}/${rel.periodo.dias} dias)`,
      "",
      ...insights.map((i) => `• ${i}`),
    ];
    return linhas.join("\n");
  }, [rel, insights]);

  function abrirWhatsApp() {
    if (!rel) return;
    const tel = (rel.paciente.telefone ?? "").replace(/\D/g, "");
    // Com número do paciente → envia direto. Sem número → abre o WhatsApp sem
    // destinatário para a nutri escolher o contato (o dela ou qualquer outro).
    const link = tel
      ? gerarUrlWhatsApp(rel.paciente.telefone as string, textoWhatsApp)
      : `https://wa.me/?text=${encodeURIComponent(textoWhatsApp)}`;
    window.open(link, "_blank", "noopener");
  }

  return (
    <div className="min-h-screen bg-nx-bg-lowest text-nx-on-surface font-sans">
      <style>{`@media print { .no-print { display: none !important; } body { background: #fff; } }`}</style>

      <main className="mx-auto max-w-4xl px-4 py-6 pb-24 md:px-8">
        {/* Voltar */}
        <button onClick={() => navigate(`/app/pacientes/${id}`)} className="no-print mb-4 flex items-center gap-1 text-body-sm text-nx-on-surface-variant hover:text-nx-on-surface">
          <ChevronLeft size={18} /> Voltar ao paciente
        </button>

        {/* Cabeçalho + controles */}
        <header className="mb-6">
          <h1 className="text-headline-md text-nx-on-surface">Relatório do paciente</h1>
          {rel && <p className="mt-0.5 text-body-sm text-nx-on-surface-variant">{rel.paciente.nome} · {brData(rel.periodo.inicio)} a {brData(rel.periodo.fim)}</p>}

          <div className="no-print mt-4 flex flex-wrap items-end gap-3 rounded-2xl border border-nx-border bg-nx-surface p-4">
            <label className="flex flex-col gap-1">
              <span className="text-label-sm uppercase text-nx-on-surface-variant">De</span>
              <input type="date" value={inicio} max={fim} onChange={(e) => setInicio(e.target.value)}
                className="bg-nx-container border border-nx-border rounded-xl px-3 py-2 text-body-sm text-nx-on-surface focus:outline-none focus:ring-1 focus:ring-nx-evo" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-label-sm uppercase text-nx-on-surface-variant">Até</span>
              <input type="date" value={fim} min={inicio} max={isoHoje()} onChange={(e) => setFim(e.target.value)}
                className="bg-nx-container border border-nx-border rounded-xl px-3 py-2 text-body-sm text-nx-on-surface focus:outline-none focus:ring-1 focus:ring-nx-evo" />
            </label>
            <button onClick={() => { setInicio(isoHa(29)); setFim(isoHoje()); }}
              className="rounded-xl border border-nx-border px-3 py-2 text-body-sm text-nx-on-surface-variant hover:text-nx-on-surface transition-colors">
              Últimos 30 dias
            </button>

            <label className="ml-auto flex cursor-pointer items-center gap-2 text-body-sm text-nx-on-surface-variant">
              <input type="checkbox" checked={comIA} onChange={(e) => setComIA(e.target.checked)} className="accent-nx-evo size-4" />
              <Sparkles size={15} className="text-nx-evo" /> Leitura inteligente (IA)
            </label>
          </div>

          {/* Ações de exportação */}
          {rel && (
            <div className="no-print mt-3 flex flex-wrap gap-2">
              <button onClick={() => window.print()} className="flex items-center gap-2 rounded-xl border border-nx-border px-4 py-2.5 text-body-sm text-nx-on-surface hover:bg-nx-surface-hover transition-colors">
                <FileDown size={16} /> Exportar PDF
              </button>
              <button onClick={abrirWhatsApp}
                title={rel.paciente.telefone ? "Enviar resumo por WhatsApp" : "Paciente sem número — escolha o contato no WhatsApp"}
                className="flex items-center gap-2 rounded-xl bg-nx-evo text-nx-on-evo px-4 py-2.5 text-body-sm font-semibold hover:bg-nx-evo-2 transition-colors">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden><path d="M17.5 14.4c-.3-.15-1.7-.85-2-.95-.26-.1-.45-.15-.64.15-.19.28-.73.94-.9 1.13-.16.19-.33.21-.61.07-.3-.15-1.24-.46-2.36-1.46-.87-.78-1.46-1.74-1.63-2.03-.17-.29-.02-.45.13-.6.13-.13.29-.34.44-.5.15-.17.19-.29.29-.48.1-.19.05-.36-.02-.5-.08-.15-.64-1.55-.88-2.12-.23-.55-.47-.48-.64-.49l-.55-.01c-.19 0-.5.07-.76.36-.26.29-1 .98-1 2.38s1.02 2.76 1.17 2.95c.15.19 2.02 3.08 4.9 4.32.68.29 1.22.47 1.63.6.69.22 1.31.19 1.8.11.55-.08 1.7-.69 1.94-1.36.24-.67.24-1.24.17-1.36-.07-.12-.26-.19-.55-.34zM12 2a10 10 0 0 0-8.5 15.3L2 22l4.8-1.5A10 10 0 1 0 12 2z" /></svg>
                WhatsApp
              </button>
            </div>
          )}
        </header>

        {/* Estados */}
        {loading ? (
          <div className="space-y-4">
            <div className="h-28 animate-pulse rounded-2xl bg-nx-container/60" />
            <div className="h-40 animate-pulse rounded-2xl bg-nx-container/60" />
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-nx-border bg-nx-surface p-8 text-center text-body-sm text-nx-danger">{error}</div>
        ) : !rel ? null : (
          <div className="space-y-4">
            {/* Resumo */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Metrica rotulo="Adesão" valor={`${rel.resumo.aderenciaPct}%`} sub={`${rel.resumo.diasRegistrados}/${rel.periodo.dias} dias`} tom="text-nx-evo" />
              <Metrica rotulo="XP no período" valor={String(rel.resumo.xpPeriodo)} />
              <Metrica rotulo="Liga atual" valor={rel.resumo.ligaAtual} />
              <Metrica rotulo="Maior sequência" valor={`${rel.resumo.streakMaximo}d`} />
            </div>

            {/* Insights (IA ou regras) */}
            <section className="rounded-2xl border border-nx-evo/40 bg-nx-evo/[0.06] p-5">
              <div className="mb-3 flex items-center gap-2">
                <Sparkles size={18} className="text-nx-evo" />
                <h2 className="text-body-md font-semibold text-nx-on-surface">Leitura do período</h2>
                <span className="ml-auto rounded-full bg-nx-container px-2.5 py-1 text-label-sm text-nx-on-surface-variant">
                  {iaAtiva ? "Gerado por IA" : "Análise automática"}
                </span>
              </div>
              {insights.length === 0 ? (
                <p className="text-body-sm text-nx-on-surface-variant">Sem dados suficientes no período selecionado.</p>
              ) : (
                <ul className="space-y-2">
                  {insights.map((i, idx) => (
                    <li key={idx} className="flex gap-2 text-body-sm text-nx-on-surface">
                      <span className="mt-2 size-1.5 shrink-0 rounded-full bg-nx-evo" />{i}
                    </li>
                  ))}
                </ul>
              )}
              {comIA && !iaAtiva && (
                <p className="mt-3 text-label-sm text-nx-on-surface-variant">IA indisponível no momento — exibindo a análise automática (mesmos dados).</p>
              )}
            </section>

            {/* Refeições */}
            <Secao icon={Utensils} titulo="Alimentação por refeição">
              <div className="space-y-3">
                {rel.refeicoes.map((m) => (
                  <div key={m.key}>
                    <div className="mb-1 flex items-center justify-between text-body-sm">
                      <span className="font-medium text-nx-on-surface">{m.label}</span>
                      <span className="text-nx-on-surface-variant">{m.total} dias · <span className={m.problemaPct >= 30 ? "text-nx-streak font-semibold" : ""}>{m.problemaPct}% falha</span></span>
                    </div>
                    <div className="flex h-2.5 overflow-hidden rounded-full bg-nx-container">
                      {m.total > 0 && (<>
                        <div style={{ width: `${(m.seguiu / m.total) * 100}%`, background: "#7CFF5B" }} />
                        <div style={{ width: `${(m.adaptou / m.total) * 100}%`, background: "#F8C84B" }} />
                        <div style={{ width: `${(m.comeuMal / m.total) * 100}%`, background: "#FF8A1F" }} />
                        <div style={{ width: `${(m.pulou / m.total) * 100}%`, background: "#6B7280" }} />
                      </>)}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-3 text-label-sm text-nx-on-surface-variant">
                <span className="flex items-center gap-1"><span className="size-2.5 rounded-full" style={{ background: "#7CFF5B" }} /> Seguiu</span>
                <span className="flex items-center gap-1"><span className="size-2.5 rounded-full" style={{ background: "#F8C84B" }} /> Adaptou</span>
                <span className="flex items-center gap-1"><span className="size-2.5 rounded-full" style={{ background: "#FF8A1F" }} /> Comeu mal</span>
                <span className="flex items-center gap-1"><span className="size-2.5 rounded-full" style={{ background: "#6B7280" }} /> Pulou</span>
              </div>
            </Secao>

            <div className="grid gap-4 md:grid-cols-2">
              {/* Treino */}
              <Secao icon={Dumbbell} titulo="Treino">
                <div className="grid grid-cols-3 gap-3">
                  <Metrica rotulo="Conforme" valor={String(rel.treino.conforme)} />
                  <Metrica rotulo="Parcial" valor={String(rel.treino.parcial)} />
                  <Metrica rotulo="Faltou" valor={String(rel.treino.faltas)} tom={rel.treino.faltas ? "text-nx-streak" : "text-nx-on-surface"} />
                </div>
                {rel.treino.motivos.length > 0 && (
                  <div className="mt-3">
                    <p className="text-label-sm uppercase text-nx-on-surface-variant">Motivos das faltas</p>
                    <ul className="mt-1 space-y-1">
                      {rel.treino.motivos.map((m, i) => (
                        <li key={i} className="text-body-sm text-nx-on-surface">• {m.motivo}{m.vezes > 1 && <span className="text-nx-on-surface-variant"> ({m.vezes}×)</span>}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </Secao>

              {/* Sono + Água */}
              <div className="space-y-4">
                <Secao icon={Moon} titulo="Sono">
                  <div className="grid grid-cols-3 gap-3">
                    <Metrica rotulo="Média" valor={`${rel.sono.mediaHoras}h`} />
                    <Metrica rotulo="Meta" valor={`${rel.sono.meta}h`} />
                    <Metrica rotulo="Abaixo" valor={`${rel.sono.diasAbaixoMeta}d`} tom={rel.sono.diasAbaixoMeta >= 3 ? "text-nx-streak" : "text-nx-on-surface"} />
                  </div>
                </Secao>
                <Secao icon={Droplets} titulo="Hidratação">
                  <div className="grid grid-cols-3 gap-3">
                    <Metrica rotulo="Média" valor={`${(rel.agua.mediaMl / 1000).toFixed(1)}L`} />
                    <Metrica rotulo="Meta" valor={`${(rel.agua.meta / 1000).toFixed(1)}L`} />
                    <Metrica rotulo="Abaixo" valor={`${rel.agua.diasAbaixoMeta}d`} tom={rel.agua.diasAbaixoMeta >= 3 ? "text-nx-streak" : "text-nx-on-surface"} />
                  </div>
                </Secao>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {/* Fim de semana */}
              <Secao icon={CalendarClock} titulo="Padrão de fim de semana">
                <div className="grid grid-cols-2 gap-3">
                  <Metrica rotulo="Adesão fins de semana" valor={`${rel.finaisDeSemana.aderenciaFdsPct}%`} sub={`${rel.finaisDeSemana.registradosFds}/${rel.finaisDeSemana.totalFds} dias`} tom={rel.finaisDeSemana.aderenciaFdsPct <= 50 ? "text-nx-streak" : "text-nx-on-surface"} />
                  <Metrica rotulo="Adesão dias úteis" valor={`${rel.finaisDeSemana.aderenciaUteisPct}%`} />
                </div>
              </Secao>

              {/* Humor + Peso */}
              <div className="space-y-4">
                <Secao icon={Smile} titulo="Humor">
                  {Object.keys(rel.humor).length === 0 ? (
                    <p className="text-body-sm text-nx-on-surface-variant">Sem registros de humor.</p>
                  ) : (
                    <div className="flex flex-wrap gap-3">
                      {Object.entries(rel.humor).sort((a, b) => b[1] - a[1]).map(([k, n]) => (
                        <span key={k} className="flex items-center gap-1.5 rounded-full bg-nx-container/60 px-3 py-1.5 text-body-sm">
                          <span className="text-lg leading-none">{HUMOR_EMOJI[k] ?? "•"}</span>
                          <span className="text-nx-on-surface-variant">{HUMOR_LABEL[k] ?? k}</span>
                          <span className="font-semibold tabular-nums">{n}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </Secao>
                {rel.peso && (
                  <Secao icon={Scale} titulo="Peso">
                    <div className="flex items-baseline gap-2">
                      <span className="text-[26px] font-semibold text-nx-on-surface">{rel.peso.final}kg</span>
                      <span className={`text-body-sm font-semibold ${rel.peso.delta < 0 ? "text-nx-evo" : rel.peso.delta > 0 ? "text-nx-streak" : "text-nx-on-surface-variant"}`}>
                        {rel.peso.delta < 0 ? "−" : rel.peso.delta > 0 ? "+" : ""}{Math.abs(rel.peso.delta)}kg
                      </span>
                      <span className="text-body-sm text-nx-on-surface-variant">desde {rel.peso.inicial}kg</span>
                    </div>
                  </Secao>
                )}
              </div>
            </div>

            {/* Conquistas */}
            {rel.conquistas.length > 0 && (
              <Secao icon={Trophy} titulo="Conquistas no período">
                <div className="flex flex-wrap gap-2">
                  {rel.conquistas.map((c, i) => (
                    <span key={i} className="flex items-center gap-1.5 rounded-full bg-nx-gold/12 px-3 py-1.5 text-body-sm text-nx-on-surface">
                      <span className="text-base leading-none">{c.icone ?? "🏅"}</span> {c.titulo}
                    </span>
                  ))}
                </div>
              </Secao>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
