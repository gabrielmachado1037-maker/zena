import { useState } from "react";
import {
  Plus, FileDown, Award, AlertTriangle, Sparkles, Bell, X, Loader2,
  CalendarClock, Users, CheckCircle2, Flag, Play,
} from "lucide-react";
import { useFetch } from "../hooks/useFetch";
import api from "../lib/api";
import Avatar from "../components/Avatar";
import {
  derivarKpisDesafios, catMeta, metaLabel, TEMPLATES_IA, TONE_TEXT,
} from "../lib/desafios";
import type {
  Aba, DesafioCard, DesafioDetalhe, ResumoResp, TemplateDesafio,
} from "../lib/desafios";

/* ───────── primitivos ───────── */
function Card({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return <div className={`rounded-2xl bg-nx-surface border border-nx-border ${className}`}>{children}</div>;
}
function StateBox({ loading, error, empty, onRetry, children, minH = "h-28", emptyText = "Sem dados" }: {
  loading: boolean; error: string | null; empty?: boolean; onRetry?: () => void;
  children: React.ReactNode; minH?: string; emptyText?: string;
}) {
  if (loading) return <div className={`${minH} animate-pulse rounded-xl bg-nx-container/60`} aria-busy="true" />;
  if (error)
    return (
      <div className={`${minH} flex flex-col items-center justify-center gap-2 text-center`}>
        <p className="text-body-sm text-nx-danger">{error}</p>
        {onRetry && <button onClick={onRetry} className="text-label-md text-nx-evo hover:underline">Tentar de novo</button>}
      </div>
    );
  if (empty) return <div className={`${minH} flex items-center justify-center text-body-sm text-nx-on-surface-variant`}>{emptyText}</div>;
  return <>{children}</>;
}
function Barra({ pct, cor = "#7CFF5B" }: { pct: number; cor?: string }) {
  return (
    <div className="h-2 rounded-full bg-nx-container overflow-hidden">
      <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, pct)}%`, background: cor }} />
    </div>
  );
}

/* ───────── página ───────── */
export default function Desafios() {
  const [aba, setAba] = useState<Aba>("em_curso");
  const [createOpen, setCreateOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  const resumo = useFetch<ResumoResp>("/desafios/resumo");
  const lista = useFetch<DesafioCard[]>(`/desafios?status=${aba}`);
  const kpis = derivarKpisDesafios(resumo.data);

  function recarregar() { resumo.refetch(); lista.refetch(); }

  async function ativarTemplate(t: TemplateDesafio) {
    const hoje = new Date();
    const fim = new Date(hoje.getTime() + t.duracaoDias * 86_400_000);
    await api.post("/desafios", {
      titulo: t.titulo, descricao: t.descricao, categoria: t.categoria, icone: t.icone,
      metaValor: t.metaValor, metaUnidade: t.metaUnidade, pontosBonus: t.pontosBonus,
      dataInicio: hoje.toISOString(), dataFim: fim.toISOString(),
      status: "em_curso", inscreverTodos: true,
    });
    setAba("em_curso");
    recarregar();
  }

  async function lembreteBaixa(id: string) {
    await api.post(`/desafios/${id}/lembrete`, {});
  }

  return (
    <div className="flex min-h-screen bg-nx-bg-lowest text-nx-on-surface font-sans">
      <main className="flex-1 min-w-0 px-4 md:px-6 py-6 pb-24 lg:pb-6">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-headline-md text-nx-on-surface">Gerenciamento de Desafios</h1>
            <p className="text-body-sm text-nx-on-surface-variant mt-0.5">Engajamento e gamificação dos seus pacientes</p>
          </div>
          <div className="flex items-center gap-2 print:hidden">
            <button onClick={() => window.print()} className="flex items-center gap-2 rounded-xl border border-nx-border px-4 py-2.5 text-body-sm text-nx-on-surface-variant hover:text-nx-on-surface transition-colors">
              <FileDown size={16} /> Exportar PDF
            </button>
            <button onClick={() => setCreateOpen(true)} className="flex items-center gap-2 rounded-xl bg-nx-evo text-nx-on-evo px-4 py-2.5 text-body-sm font-semibold hover:bg-nx-evo-2 transition-colors">
              <Plus size={16} /> Novo Desafio
            </button>
          </div>
        </header>

        {/* Abas */}
        <div className="inline-flex rounded-xl bg-nx-surface border border-nx-border p-1 mb-6 print:hidden">
          {(["em_curso", "encerrado"] as Aba[]).map((a) => (
            <button key={a} onClick={() => setAba(a)}
              className={`px-4 py-2 rounded-lg text-body-sm font-medium transition-colors ${
                aba === a ? "bg-nx-container-high text-nx-on-surface" : "text-nx-on-surface-variant hover:text-nx-on-surface"
              }`}>
              {a === "em_curso" ? "Em curso" : "Encerrados"}
            </button>
          ))}
        </div>

        {/* KPIs */}
        <section className="grid grid-cols-3 gap-4 mb-8">
          {kpis.map((k) => (
            <Card key={k.key} className="p-5">
              <p className="text-body-sm text-nx-on-surface-variant">{k.label}</p>
              <StateBox loading={resumo.loading} error={resumo.error} onRetry={resumo.refetch} empty={k.value == null && !resumo.loading && !resumo.error} minH="h-14">
                <p className={`text-[32px] leading-none font-semibold tracking-tight mt-2 ${TONE_TEXT[k.tone]}`}>{k.value ?? "—"}</p>
                {k.hint && <p className="text-label-sm text-nx-on-surface-variant mt-2">{k.hint}</p>}
              </StateBox>
            </Card>
          ))}
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Seção 1: Desafios (grid) */}
          <section className="lg:col-span-2">
            <h2 className="text-body-lg font-semibold mb-4">{aba === "em_curso" ? "Desafios Ativos" : "Desafios Encerrados"}</h2>
            <StateBox loading={lista.loading} error={lista.error} onRetry={lista.refetch}
              empty={(lista.data?.length ?? 0) === 0}
              emptyText={aba === "em_curso" ? "Nenhum desafio em curso" : "Nenhum desafio encerrado"} minH="h-48">
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {lista.data?.map((d) => (
                  <DesafioCardView key={d.id} d={d} onDetalhes={() => setDetailId(d.id)} />
                ))}
              </div>
            </StateBox>
          </section>

          {/* Coluna lateral: Seções 3, 4, 5 */}
          <div className="space-y-4 print:hidden">
            {/* Seção 3: Baixa adesão */}
            <Card className="p-5 border-nx-streak/30">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle size={18} className="text-nx-streak" />
                <h3 className="text-body-md font-semibold">Baixa adesão</h3>
              </div>
              <StateBox loading={resumo.loading} error={resumo.error}
                empty={(resumo.data?.baixaAdesao.length ?? 0) === 0}
                emptyText="Nenhum desafio em risco 🎉" minH="h-24">
                <ul className="space-y-3">
                  {resumo.data?.baixaAdesao.map((b) => (
                    <li key={b.id} className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-body-sm font-medium truncate">{b.titulo}</p>
                        <p className="text-label-sm text-nx-streak">{b.adesaoMedia}% de adesão · {b.participantes} part.</p>
                      </div>
                      <button onClick={() => lembreteBaixa(b.id)} title="Enviar lembrete a todos"
                        className="shrink-0 flex items-center gap-1 rounded-lg border border-nx-streak/40 text-nx-streak px-2.5 py-1.5 text-label-md hover:bg-nx-streak/10 transition-colors">
                        <Bell size={13} /> Lembrar
                      </button>
                    </li>
                  ))}
                </ul>
              </StateBox>
            </Card>

            {/* Seção 4: Sugestões (IA INSIGHT) */}
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles size={18} className="text-nx-evo" />
                <h3 className="text-body-md font-semibold">Sugestões</h3>
              </div>
              <div className="space-y-3">
                {TEMPLATES_IA.map((t) => (
                  <TemplateCard key={t.id} t={t} onAtivar={() => ativarTemplate(t)} />
                ))}
              </div>
            </Card>

            {/* Seção 5: Relatório mensal */}
            <Card className="p-5">
              <h3 className="text-body-md font-semibold mb-1">Relatório Mensal</h3>
              <p className="text-body-sm text-nx-on-surface-variant mb-4">Engajamento dos desafios em PDF.</p>
              <button onClick={() => window.print()} className="w-full flex items-center justify-center gap-2 rounded-xl border border-nx-border py-3 text-body-sm text-nx-on-surface hover:bg-nx-surface-hover transition-colors">
                <FileDown size={16} /> Exportar PDF
              </button>
            </Card>
          </div>
        </div>
      </main>

      {createOpen && <CreateModal onClose={() => setCreateOpen(false)} onCriado={() => { setCreateOpen(false); recarregar(); }} />}
      {detailId && <DetailModal id={detailId} onClose={() => setDetailId(null)} onMudou={recarregar} />}
    </div>
  );
}

/* ───────── card de desafio (Seção 1) ───────── */
function DesafioCardView({ d, onDetalhes }: { d: DesafioCard; onDetalhes: () => void }) {
  const cat = catMeta(d.categoria);
  const meta = metaLabel(d.metaValor, d.metaUnidade);
  return (
    <Card className="p-5 flex flex-col">
      <div className="flex items-start gap-3 mb-2">
        <div className="grid place-items-center size-11 rounded-xl text-[22px] shrink-0" style={{ background: `${cat.cor}22` }}>{d.icone}</div>
        <div className="flex-1 min-w-0">
          <h3 className="text-body-md font-semibold truncate">{d.titulo}</h3>
          <span className="text-label-sm uppercase tracking-wide" style={{ color: cat.cor }}>{cat.label}</span>
        </div>
        {d.status === "encerrado" && <span className="text-label-sm rounded-full bg-nx-container px-2 py-1 text-nx-on-surface-variant">Encerrado</span>}
      </div>
      {d.descricao && <p className="text-body-sm text-nx-on-surface-variant line-clamp-2 mb-3">{d.descricao}</p>}

      <div className="flex items-center gap-4 text-label-md text-nx-on-surface-variant mb-3">
        <span className="flex items-center gap-1"><Users size={14} /> {d.participantes} part.</span>
        {d.status !== "encerrado" && (
          <span className="flex items-center gap-1">
            <CalendarClock size={14} />
            {d.diasRestantes == null ? "Sem prazo" : d.diasRestantes === 0 ? "Termina hoje" : `Termina em ${d.diasRestantes} dias`}
          </span>
        )}
        {meta && <span className="flex items-center gap-1 truncate"><Flag size={14} /> {meta}</span>}
      </div>

      <div className="mt-auto">
        <div className="flex justify-between text-label-sm text-nx-on-surface-variant mb-1.5">
          <span>Conclusão</span>
          <span className="text-nx-evo font-semibold">{d.taxaConclusao == null ? "—" : `${d.taxaConclusao}%`}</span>
        </div>
        <Barra pct={d.taxaConclusao ?? 0} />
        <button onClick={onDetalhes} className="w-full mt-4 rounded-xl border border-nx-border py-2.5 text-body-sm text-nx-evo hover:bg-nx-surface-hover transition-colors print:hidden">
          Ver Detalhes
        </button>
      </div>
    </Card>
  );
}

/* ───────── template (Seção 4) ───────── */
function TemplateCard({ t, onAtivar }: { t: TemplateDesafio; onAtivar: () => void }) {
  const [busy, setBusy] = useState(false);
  const cat = catMeta(t.categoria);
  async function ativar() { setBusy(true); try { await onAtivar(); } finally { setBusy(false); } }
  return (
    <div className="rounded-xl border border-nx-border bg-nx-container/40 p-3.5">
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-[11px] font-bold uppercase tracking-wider text-nx-evo bg-nx-evo/12 rounded-full px-2 py-0.5">IA Insight</span>
        <span className="text-[18px] ml-auto">{t.icone}</span>
      </div>
      <p className="text-body-sm font-semibold" style={{ color: cat.cor }}>{t.titulo}</p>
      <p className="text-label-sm text-nx-on-surface-variant mt-1 leading-relaxed">{t.insight}</p>
      <button onClick={ativar} disabled={busy}
        className="w-full mt-3 rounded-lg bg-nx-evo text-nx-on-evo py-2 text-label-md font-bold hover:bg-nx-evo-2 disabled:opacity-60 transition-colors flex items-center justify-center gap-2">
        {busy ? <Loader2 size={14} className="animate-spin" /> : <Play size={13} />} Ativar Agora
      </button>
    </div>
  );
}

/* ───────── modal criar ───────── */
const RECOMPENSA_XP: Record<number, number> = { 7: 5, 14: 10, 21: 15 };
const ADESAO_MIN: Record<number, number> = { 7: 6, 14: 12, 21: 18 };

function CreateModal({ onClose, onCriado }: { onClose: () => void; onCriado: () => void }) {
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [categoria, setCategoria] = useState("hidratacao");
  const [icone, setIcone] = useState("🎯");
  const [metaValor, setMetaValor] = useState("");
  const [metaUnidade, setMetaUnidade] = useState("");
  const [duracaoDias, setDuracaoDias] = useState("7");
  const [inscreverTodos, setInscreverTodos] = useState(true);
  const [ativar, setAtivar] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function salvar() {
    if (!titulo.trim()) { setErro("Informe o título"); return; }
    setSalvando(true); setErro(null);
    try {
      const hoje = new Date();
      const dias = Number(duracaoDias) || 7;
      const fim = new Date(hoje.getTime() + dias * 86_400_000);
      await api.post("/desafios", {
        titulo, descricao, categoria, icone,
        metaValor: metaValor ? Number(metaValor) : null,
        metaUnidade: metaUnidade || null,
        duracaoDias: dias,
        dataInicio: ativar ? hoje.toISOString() : null,
        dataFim: ativar ? fim.toISOString() : null,
        status: ativar ? "em_curso" : "rascunho",
        inscreverTodos,
      });
      onCriado();
    } catch (e: any) {
      setErro(e?.response?.data?.error ?? "Erro ao criar desafio");
      setSalvando(false);
    }
  }

  return (
    <ModalShell titulo="Novo Desafio" onClose={onClose}>
      <div className="space-y-3">
        <div className="flex gap-3">
          <input value={icone} onChange={(e) => setIcone(e.target.value)} maxLength={2} aria-label="Ícone"
            className="w-16 text-center text-[24px] bg-nx-container border border-nx-border rounded-xl" />
          <Campo label="Título" value={titulo} onChange={setTitulo} className="flex-1" />
        </div>
        <Campo label="Descrição" value={descricao} onChange={setDescricao} />
        <label className="block">
          <span className="text-label-md text-nx-on-surface-variant">Categoria</span>
          <select value={categoria} onChange={(e) => setCategoria(e.target.value)}
            className="mt-1 w-full bg-nx-container border border-nx-border rounded-xl px-3 py-2.5 text-body-sm text-nx-on-surface focus:outline-none focus:ring-1 focus:ring-nx-evo">
            <option value="hidratacao">Hidratação</option>
            <option value="alimentacao">Alimentação</option>
            <option value="treino">Treino</option>
            <option value="sono">Sono</option>
            <option value="custom">Personalizado</option>
          </select>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <Campo label="Meta (valor)" value={metaValor} onChange={setMetaValor} type="number" />
          <Campo label="Unidade" value={metaUnidade} onChange={setMetaUnidade} placeholder="L/dia" />
        </div>
        <div>
          <span className="text-label-md text-nx-on-surface-variant">Duração</span>
          <div className="mt-1 flex gap-2">
            {[7, 14, 21].map((d) => (
              <button key={d} type="button" onClick={() => setDuracaoDias(String(d))}
                className={`flex-1 rounded-xl border px-3 py-2.5 text-body-sm font-semibold transition-colors ${
                  Number(duracaoDias) === d ? "border-nx-evo bg-nx-evo/12 text-nx-evo" : "border-nx-border bg-nx-container text-nx-on-surface-variant hover:border-nx-outline"
                }`}>{d} dias</button>
            ))}
          </div>
          <p className="mt-1.5 text-label-sm text-nx-on-surface-variant">
            Recompensa <span className="font-semibold text-nx-evo">+{RECOMPENSA_XP[Number(duracaoDias)] ?? 0} XP</span> ao concluir · aderência mín. {ADESAO_MIN[Number(duracaoDias)] ?? 0} dias.
          </p>
        </div>
        <label className="flex items-center gap-2.5 text-body-sm text-nx-on-surface-variant cursor-pointer">
          <input type="checkbox" checked={inscreverTodos} onChange={(e) => setInscreverTodos(e.target.checked)} className="accent-nx-evo size-4" />
          Inscrever todos os pacientes ativos
        </label>
        <label className="flex items-center gap-2.5 text-body-sm text-nx-on-surface-variant cursor-pointer">
          <input type="checkbox" checked={ativar} onChange={(e) => setAtivar(e.target.checked)} className="accent-nx-evo size-4" />
          Ativar imediatamente (senão fica como rascunho)
        </label>
      </div>
      {erro && <p className="text-nx-danger text-body-sm mt-3">{erro}</p>}
      <button onClick={salvar} disabled={salvando}
        className="w-full mt-5 bg-nx-evo hover:bg-nx-evo-2 disabled:opacity-50 text-nx-on-evo text-label-md font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2">
        {salvando ? <><Loader2 size={16} className="animate-spin" /> Criando...</> : "Criar Desafio"}
      </button>
    </ModalShell>
  );
}

/* ───────── modal detalhe (info + Seção 2 + ações) ───────── */
function DetailModal({ id, onClose, onMudou }: { id: string; onClose: () => void; onMudou: () => void }) {
  const det = useFetch<DesafioDetalhe>(`/desafios/${id}`);
  const [acaoBusy, setAcaoBusy] = useState<string | null>(null);

  async function acao(tipo: "ativar" | "encerrar" | "lembrete") {
    setAcaoBusy(tipo);
    try {
      if (tipo === "lembrete") await api.post(`/desafios/${id}/lembrete`, {});
      else await api.patch(`/desafios/${id}`, { acao: tipo });
      det.refetch();
      onMudou();
    } finally { setAcaoBusy(null); }
  }

  const d = det.data;
  const cat = d ? catMeta(d.categoria) : null;

  return (
    <ModalShell titulo="Detalhes do Desafio" onClose={onClose} wide>
      <StateBox loading={det.loading} error={det.error} onRetry={det.refetch} minH="h-40">
        {d && cat && (
          <div className="space-y-5">
            {/* Info */}
            <div className="flex items-start gap-3">
              <div className="grid place-items-center size-12 rounded-xl text-[24px]" style={{ background: `${cat.cor}22` }}>{d.icone}</div>
              <div className="flex-1 min-w-0">
                <h3 className="text-body-lg font-bold">{d.titulo}</h3>
                <span className="text-label-sm uppercase tracking-wide" style={{ color: cat.cor }}>{cat.label}</span>
                {d.descricao && <p className="text-body-sm text-nx-on-surface-variant mt-1">{d.descricao}</p>}
              </div>
            </div>

            {/* Métricas */}
            <div className="grid grid-cols-3 gap-3">
              <MiniStat label="Participantes" value={String(d.participantes)} />
              <MiniStat label="Conclusão" value={d.taxaConclusao == null ? "—" : `${d.taxaConclusao}%`} tone="text-nx-evo" />
              <MiniStat label="Adesão média" value={d.adesaoMedia == null ? "—" : `${d.adesaoMedia}%`} tone="text-nx-streak" />
            </div>

            {/* Seção 2: Status dos Participantes */}
            <div>
              <h4 className="text-body-md font-semibold mb-3">Status dos Participantes</h4>
              {d.lista.length === 0 ? (
                <p className="text-body-sm text-nx-on-surface-variant py-6 text-center">Sem participantes inscritos</p>
              ) : (
                <ul className="space-y-3 max-h-64 overflow-auto pr-1">
                  {d.lista.map((p) => (
                    <li key={p.pacienteId} className="flex items-center gap-3">
                      <Avatar src={p.foto} nome={p.nome} tamanho={36} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-body-sm font-medium truncate">{p.nome}</p>
                          {p.concluido && <CheckCircle2 size={14} className="text-nx-evo shrink-0" />}
                        </div>
                        <div className="mt-1"><Barra pct={p.progresso} cor={p.concluido ? "#7CFF5B" : "#6B7280"} /></div>
                      </div>
                      <span className="text-label-md text-nx-on-surface-variant shrink-0 w-10 text-right">{Math.round(p.progresso)}%</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Ações */}
            <div className="flex flex-wrap gap-2 pt-1">
              {d.status === "rascunho" && (
                <BtnAcao onClick={() => acao("ativar")} busy={acaoBusy === "ativar"} icon={Play} label="Ativar" primary />
              )}
              <BtnAcao onClick={() => acao("lembrete")} busy={acaoBusy === "lembrete"} icon={Bell} label="Enviar lembrete" />
              {d.status !== "encerrado" && (
                <BtnAcao onClick={() => acao("encerrar")} busy={acaoBusy === "encerrar"} icon={Flag} label="Encerrar" danger />
              )}
            </div>
          </div>
        )}
      </StateBox>
    </ModalShell>
  );
}

/* ───────── auxiliares de UI ───────── */
function ModalShell({ titulo, onClose, wide, children }: { titulo: string; onClose: () => void; wide?: boolean; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm p-0 md:p-4" onClick={onClose}>
      <div className={`w-full ${wide ? "md:max-w-xl" : "md:max-w-md"} max-h-[92vh] overflow-auto bg-nx-surface border border-nx-border rounded-t-3xl md:rounded-2xl p-6`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-body-lg font-bold flex items-center gap-2"><Award size={18} className="text-nx-gold" /> {titulo}</h3>
          <button onClick={onClose} aria-label="Fechar" className="text-nx-outline hover:text-nx-on-surface"><X size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
function MiniStat({ label, value, tone = "text-nx-on-surface" }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-xl bg-nx-container/60 p-3 text-center">
      <p className={`text-body-lg font-semibold ${tone}`}>{value}</p>
      <p className="text-label-sm text-nx-on-surface-variant mt-0.5">{label}</p>
    </div>
  );
}
function BtnAcao({ onClick, busy, icon: Icon, label, primary, danger }: {
  onClick: () => void; busy: boolean; icon: React.ComponentType<{ size?: number }>; label: string; primary?: boolean; danger?: boolean;
}) {
  const cls = primary
    ? "bg-nx-evo text-nx-on-evo hover:bg-nx-evo-2"
    : danger
    ? "border border-nx-danger/50 text-nx-danger hover:bg-nx-danger/10"
    : "border border-nx-border text-nx-on-surface hover:bg-nx-surface-hover";
  return (
    <button onClick={onClick} disabled={busy} className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-body-sm font-semibold transition-colors disabled:opacity-60 ${cls}`}>
      {busy ? <Loader2 size={15} className="animate-spin" /> : <Icon size={15} />} {label}
    </button>
  );
}
function Campo({ label, value, onChange, type = "text", placeholder, className = "" }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string; className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="text-label-md text-nx-on-surface-variant">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} type={type} placeholder={placeholder}
        className="mt-1 w-full bg-nx-container border border-nx-border rounded-xl px-3 py-2.5 text-body-sm text-nx-on-surface focus:outline-none focus:ring-1 focus:ring-nx-evo" />
    </label>
  );
}
