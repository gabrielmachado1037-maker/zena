import { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ChevronLeft, FileDown, Sparkles } from "lucide-react";
import { useFetch } from "../hooks/useFetch";
import { gerarUrlWhatsApp } from "../lib/utils";

/* ───────── tipos (espelham o backend relatorioService) ───────── */
interface Relatorio {
  paciente: { id: string; nome: string; telefone: string | null };
  periodo: { inicio: string; fim: string; dias: number };
  resumo: { diasRegistrados: number; aderenciaPct: number; desafiosCumpridos: number; xpPeriodo: number; ligaAtual: string; streakMaximo: number };
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

const REF_CORES = { seguiu: "#7CFF5B", adaptou: "#F8C84B", comeuMal: "#FF8A1F", pulou: "#C7CBD1" };

function isoHoje() { return new Date().toISOString().slice(0, 10); }
function isoHa(dias: number) { return new Date(Date.now() - dias * 86_400_000).toISOString().slice(0, 10); }
function brData(iso: string) { const [a, m, d] = iso.split("-"); return `${d}/${m}/${a}`; }

/* Estilo do documento (claro, marca Nexvel). WYSIWYG: a tela é igual ao PDF. */
const CSS = `
.rel-wrap{ --ink:#14171E; --muted:#6B7280; --line:#E7E7E4; --soft:#F5F5F3;
  --green:#7CFF5B; --greenDeep:#1B7A3E; --gold:#F8C84B; --orange:#FF8A1F; --water:#49A8FF; --danger:#E5484D; }
.rel-doc{ max-width:820px; margin:0 auto; background:#fff; color:var(--ink);
  border-radius:20px; box-shadow:0 12px 44px rgba(0,0,0,.38); overflow:hidden;
  font-family:Inter,ui-sans-serif,system-ui,sans-serif; }
.rel-head{ display:flex; justify-content:space-between; align-items:flex-start; gap:20px;
  padding:26px 40px; background:#0C0F14; color:#fff; border-bottom:4px solid var(--green); }
.rel-brand{ font-weight:800; letter-spacing:.16em; font-size:16px; }
.rel-brand small{ display:block; font-weight:600; letter-spacing:.34em; font-size:8.5px; color:#7CFF5B; margin-top:4px; }
.rel-head .r{ text-align:right; }
.rel-htitle{ font-size:10.5px; text-transform:uppercase; letter-spacing:.16em; color:#9CA3AF; }
.rel-hpac{ font-size:22px; font-weight:700; margin-top:3px; line-height:1.1; }
.rel-hper{ font-size:11.5px; color:#9CA3AF; margin-top:5px; }
.rel-body{ padding:32px 40px 12px; }
.rel-metrics{ display:grid; grid-template-columns:repeat(3,1fr); gap:14px; }
.rel-metric{ background:var(--soft); border-radius:16px; padding:18px 20px; }
.rel-metric b{ display:block; font-weight:300; font-size:46px; line-height:1; letter-spacing:-.02em; color:var(--ink); }
.rel-metric b.g{ color:var(--greenDeep); }
.rel-metric span{ display:block; margin-top:12px; font-size:10.5px; text-transform:uppercase; letter-spacing:.09em; color:var(--muted); }
.rel-metric em{ font-style:normal; color:var(--muted); font-size:11px; }
.rel-callout{ margin-top:20px; border:1px solid var(--line); border-left:4px solid var(--green);
  background:#FAFEF7; border-radius:14px; padding:18px 20px; page-break-inside:avoid; }
.rel-callout h3{ font-size:11px; text-transform:uppercase; letter-spacing:.12em; color:var(--greenDeep);
  margin:0 0 10px; display:flex; align-items:center; gap:8px; }
.rel-callout .tag{ margin-left:auto; font-size:9.5px; letter-spacing:.06em; color:var(--muted);
  background:#EEF0EE; border-radius:99px; padding:3px 9px; }
.rel-callout ul{ list-style:none; margin:0; padding:0; }
.rel-callout li{ display:flex; gap:9px; font-size:13px; line-height:1.55; margin:7px 0; color:var(--ink); }
.rel-callout li::before{ content:""; width:6px; height:6px; border-radius:50%; background:var(--green); margin-top:6px; flex:none; }
.rel-sec{ margin-top:26px; page-break-inside:avoid; }
.rel-sec>h2{ font-size:12px; text-transform:uppercase; letter-spacing:.1em; color:var(--ink);
  margin:0 0 13px; display:flex; align-items:center; gap:9px; }
.rel-sec>h2::before{ content:""; width:4px; height:14px; border-radius:2px; background:var(--green); }
.rel-grid2{ display:grid; grid-template-columns:1fr 1fr; gap:16px; }
.rel-sub{ background:var(--soft); border-radius:14px; padding:16px 18px; }
.rel-sub h4{ margin:0 0 10px; font-size:10.5px; text-transform:uppercase; letter-spacing:.09em; color:var(--muted); }
.rel-kpis{ display:flex; gap:22px; }
.rel-kpi b{ display:block; font-weight:300; font-size:30px; line-height:1; color:var(--ink); }
.rel-kpi b.warn{ color:var(--orange); }
.rel-kpi span{ display:block; margin-top:6px; font-size:10px; text-transform:uppercase; letter-spacing:.06em; color:var(--muted); }
.rel-meal{ margin:11px 0; }
.rel-meal .t{ display:flex; justify-content:space-between; font-size:12.5px; margin-bottom:5px; }
.rel-meal .t b{ font-weight:600; }
.rel-meal .t .p{ color:var(--muted); }
.rel-meal .t .p.warn{ color:var(--orange); font-weight:700; }
.rel-bar{ height:10px; border-radius:99px; background:#ECECE8; display:flex; overflow:hidden; }
.rel-bar i{ display:block; height:100%; }
.rel-legend{ display:flex; flex-wrap:wrap; gap:14px; margin-top:12px; font-size:10.5px; color:var(--muted); }
.rel-legend span{ display:flex; align-items:center; gap:6px; }
.rel-dot{ width:9px; height:9px; border-radius:3px; display:inline-block; }
.rel-motivos{ margin:10px 0 0; padding:0; list-style:none; }
.rel-motivos li{ font-size:12.5px; margin:4px 0; color:var(--ink); }
.rel-motivos li em{ font-style:normal; color:var(--muted); }
.rel-chips{ display:flex; flex-wrap:wrap; gap:8px; }
.rel-chip{ display:inline-flex; align-items:center; gap:7px; background:var(--soft); border-radius:99px; padding:7px 12px; font-size:12.5px; }
.rel-chip b{ font-weight:700; }
.rel-chip.gold{ background:#FDF6E3; }
.rel-peso{ display:flex; align-items:baseline; gap:10px; }
.rel-peso b{ font-weight:300; font-size:34px; color:var(--ink); }
.rel-peso .d.down{ color:var(--greenDeep); font-weight:700; }
.rel-peso .d.up{ color:var(--orange); font-weight:700; }
.rel-empty{ font-size:12.5px; color:var(--muted); }
.rel-foot{ margin-top:30px; padding:16px 40px; border-top:1px solid var(--line);
  display:flex; justify-content:space-between; font-size:10px; color:var(--muted); }
@media print{
  .no-print{ display:none !important; }
  @page{ size:A4; margin:11mm; }
  html,body{ background:#fff !important; }
  .rel-wrap{ background:#fff !important; padding:0 !important; }
  .rel-doc{ box-shadow:none !important; border-radius:0 !important; max-width:none !important; }
  .rel-wrap *{ -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important; }
}
`;

/* ───────── página ───────── */
export default function RelatorioMensal() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [inicio, setInicio] = useState(isoHa(29));
  const [fim, setFim] = useState(isoHoje());
  const [comIA, setComIA] = useState(false);

  const url = id ? `/pacientes/${id}/relatorio-mensal?inicio=${inicio}&fim=${fim}${comIA ? "&ia=1" : ""}` : null;
  const { data: rel, loading, error } = useFetch<Relatorio>(url);

  const insights = rel ? (rel.insightsIA && rel.insightsIA.length ? rel.insightsIA : rel.insightsRegras) : [];
  const iaAtiva = !!(rel?.insightsIA && rel.insightsIA.length);

  const textoWhatsApp = useMemo(() => {
    if (!rel) return "";
    return [
      `*Nexvel · Relatório de ${rel.paciente.nome}*`,
      `${brData(rel.periodo.inicio)} a ${brData(rel.periodo.fim)} · adesão ${rel.resumo.aderenciaPct}% (${rel.resumo.diasRegistrados}/${rel.periodo.dias} dias)`,
      "",
      ...insights.map((i) => `• ${i}`),
    ].join("\n");
  }, [rel, insights]);

  function abrirWhatsApp() {
    if (!rel) return;
    const tel = (rel.paciente.telefone ?? "").replace(/\D/g, "");
    const link = tel
      ? gerarUrlWhatsApp(rel.paciente.telefone as string, textoWhatsApp)
      : `https://wa.me/?text=${encodeURIComponent(textoWhatsApp)}`;
    window.open(link, "_blank", "noopener");
  }

  function exportarPdf() {
    const original = document.title;
    document.title = `Nexvel - Relatório - ${rel?.paciente.nome ?? "paciente"}`;
    const restaurar = () => { document.title = original; window.removeEventListener("afterprint", restaurar); };
    window.addEventListener("afterprint", restaurar);
    window.print();
  }

  return (
    <div className="rel-wrap min-h-screen bg-nx-bg-lowest text-nx-on-surface font-sans">
      <style>{CSS}</style>

      <main className="mx-auto max-w-4xl px-4 py-6 pb-24 md:px-6">
        {/* Barra de controles (não sai no PDF) */}
        <div className="no-print">
          <button onClick={() => navigate(`/app/pacientes/${id}`)} className="mb-4 flex items-center gap-1 text-body-sm text-nx-on-surface-variant hover:text-nx-on-surface">
            <ChevronLeft size={18} /> Voltar ao paciente
          </button>

          <div className="mb-4 flex flex-wrap items-end gap-3 rounded-2xl border border-nx-border bg-nx-surface p-4">
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

          {rel && (
            <div className="mb-5 flex flex-wrap gap-2">
              <button onClick={exportarPdf} className="flex items-center gap-2 rounded-xl bg-nx-evo text-nx-on-evo px-4 py-2.5 text-body-sm font-semibold hover:bg-nx-evo-2 transition-colors">
                <FileDown size={16} /> Exportar PDF
              </button>
              <button onClick={abrirWhatsApp}
                title={rel.paciente.telefone ? "Enviar resumo por WhatsApp" : "Paciente sem número — escolha o contato no WhatsApp"}
                className="flex items-center gap-2 rounded-xl border border-nx-border px-4 py-2.5 text-body-sm font-semibold text-nx-on-surface hover:bg-nx-surface-hover transition-colors">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden><path d="M17.5 14.4c-.3-.15-1.7-.85-2-.95-.26-.1-.45-.15-.64.15-.19.28-.73.94-.9 1.13-.16.19-.33.21-.61.07-.3-.15-1.24-.46-2.36-1.46-.87-.78-1.46-1.74-1.63-2.03-.17-.29-.02-.45.13-.6.13-.13.29-.34.44-.5.15-.17.19-.29.29-.48.1-.19.05-.36-.02-.5-.08-.15-.64-1.55-.88-2.12-.23-.55-.47-.48-.64-.49l-.55-.01c-.19 0-.5.07-.76.36-.26.29-1 .98-1 2.38s1.02 2.76 1.17 2.95c.15.19 2.02 3.08 4.9 4.32.68.29 1.22.47 1.63.6.69.22 1.31.19 1.8.11.55-.08 1.7-.69 1.94-1.36.24-.67.24-1.24.17-1.36-.07-.12-.26-.19-.55-.34zM12 2a10 10 0 0 0-8.5 15.3L2 22l4.8-1.5A10 10 0 1 0 12 2z" /></svg>
                WhatsApp
              </button>
            </div>
          )}
        </div>

        {/* Estados */}
        {loading ? (
          <div className="mx-auto max-w-[820px] space-y-4">
            <div className="h-24 animate-pulse rounded-2xl bg-nx-container/60" />
            <div className="h-64 animate-pulse rounded-2xl bg-nx-container/60" />
          </div>
        ) : error ? (
          <div className="mx-auto max-w-[820px] rounded-2xl border border-nx-border bg-nx-surface p-8 text-center text-body-sm text-nx-danger">{error}</div>
        ) : !rel ? null : (
          /* ═══════════ DOCUMENTO (branco, marca Nexvel) — igual ao PDF ═══════════ */
          <article className="rel-doc">
            <header className="rel-head">
              <div className="rel-brand">NEXVEL<small>NUTRITION PRO</small></div>
              <div className="r">
                <div className="rel-htitle">Relatório do paciente</div>
                <div className="rel-hpac">{rel.paciente.nome}</div>
                <div className="rel-hper">{brData(rel.periodo.inicio)} — {brData(rel.periodo.fim)} · {rel.periodo.dias} dias</div>
              </div>
            </header>

            <div className="rel-body">
              {/* 3 quadrados */}
              <div className="rel-metrics">
                <div className="rel-metric"><b className="g">{rel.resumo.aderenciaPct}%</b><span>Adesão <em>· {rel.resumo.diasRegistrados}/{rel.periodo.dias} dias</em></span></div>
                <div className="rel-metric"><b>{rel.resumo.desafiosCumpridos}</b><span>Desafios cumpridos</span></div>
                <div className="rel-metric"><b>{rel.resumo.diasRegistrados}</b><span>Dias registrados</span></div>
              </div>

              {/* Leitura do período (o "mastigado" para a nutri) */}
              <section className="rel-callout">
                <h3><Sparkles size={13} /> Leitura do período <span className="tag">{iaAtiva ? "Gerado por IA" : "Análise automática"}</span></h3>
                {insights.length === 0
                  ? <p className="rel-empty">Sem dados suficientes no período selecionado.</p>
                  : <ul>{insights.map((i, idx) => <li key={idx}>{i}</li>)}</ul>}
              </section>

              {/* Alimentação */}
              <section className="rel-sec">
                <h2>Alimentação por refeição</h2>
                {rel.refeicoes.map((m) => (
                  <div className="rel-meal" key={m.key}>
                    <div className="t"><b>{m.label}</b><span className={`p ${m.problemaPct >= 30 ? "warn" : ""}`}>{m.total} dias · {m.problemaPct}% falha</span></div>
                    <div className="rel-bar">
                      {m.total > 0 && (<>
                        <i style={{ width: `${(m.seguiu / m.total) * 100}%`, background: REF_CORES.seguiu }} />
                        <i style={{ width: `${(m.adaptou / m.total) * 100}%`, background: REF_CORES.adaptou }} />
                        <i style={{ width: `${(m.comeuMal / m.total) * 100}%`, background: REF_CORES.comeuMal }} />
                        <i style={{ width: `${(m.pulou / m.total) * 100}%`, background: REF_CORES.pulou }} />
                      </>)}
                    </div>
                  </div>
                ))}
                <div className="rel-legend">
                  <span><i className="rel-dot" style={{ background: REF_CORES.seguiu }} /> Seguiu</span>
                  <span><i className="rel-dot" style={{ background: REF_CORES.adaptou }} /> Adaptou</span>
                  <span><i className="rel-dot" style={{ background: REF_CORES.comeuMal }} /> Comeu mal</span>
                  <span><i className="rel-dot" style={{ background: REF_CORES.pulou }} /> Pulou</span>
                </div>
              </section>

              {/* Treino + Sono/Água */}
              <section className="rel-sec">
                <h2>Treino, sono e hidratação</h2>
                <div className="rel-grid2">
                  <div className="rel-sub">
                    <h4>Treino</h4>
                    <div className="rel-kpis">
                      <div className="rel-kpi"><b>{rel.treino.conforme}</b><span>Conforme</span></div>
                      <div className="rel-kpi"><b>{rel.treino.parcial}</b><span>Parcial</span></div>
                      <div className="rel-kpi"><b className={rel.treino.faltas ? "warn" : ""}>{rel.treino.faltas}</b><span>Faltou</span></div>
                    </div>
                    {rel.treino.motivos.length > 0 && (
                      <ul className="rel-motivos">
                        {rel.treino.motivos.map((m, i) => <li key={i}>• {m.motivo}{m.vezes > 1 && <em> ({m.vezes}×)</em>}</li>)}
                      </ul>
                    )}
                  </div>
                  <div style={{ display: "grid", gap: 16 }}>
                    <div className="rel-sub">
                      <h4>Sono</h4>
                      <div className="rel-kpis">
                        <div className="rel-kpi"><b>{rel.sono.mediaHoras}h</b><span>Média</span></div>
                        <div className="rel-kpi"><b>{rel.sono.meta}h</b><span>Meta</span></div>
                        <div className="rel-kpi"><b className={rel.sono.diasAbaixoMeta >= 3 ? "warn" : ""}>{rel.sono.diasAbaixoMeta}d</b><span>Abaixo</span></div>
                      </div>
                    </div>
                    <div className="rel-sub">
                      <h4>Hidratação</h4>
                      <div className="rel-kpis">
                        <div className="rel-kpi"><b>{(rel.agua.mediaMl / 1000).toFixed(1)}L</b><span>Média</span></div>
                        <div className="rel-kpi"><b>{(rel.agua.meta / 1000).toFixed(1)}L</b><span>Meta</span></div>
                        <div className="rel-kpi"><b className={rel.agua.diasAbaixoMeta >= 3 ? "warn" : ""}>{rel.agua.diasAbaixoMeta}d</b><span>Abaixo</span></div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Fim de semana + humor + peso */}
              <section className="rel-sec">
                <h2>Comportamento e evolução</h2>
                <div className="rel-grid2">
                  <div className="rel-sub">
                    <h4>Padrão de fim de semana</h4>
                    <div className="rel-kpis">
                      <div className="rel-kpi"><b className={rel.finaisDeSemana.aderenciaFdsPct <= 50 ? "warn" : ""}>{rel.finaisDeSemana.aderenciaFdsPct}%</b><span>Fins de semana</span></div>
                      <div className="rel-kpi"><b>{rel.finaisDeSemana.aderenciaUteisPct}%</b><span>Dias úteis</span></div>
                    </div>
                    <p className="rel-empty" style={{ marginTop: 10 }}>{rel.finaisDeSemana.registradosFds}/{rel.finaisDeSemana.totalFds} dias de fim de semana registrados.</p>
                  </div>
                  <div style={{ display: "grid", gap: 16 }}>
                    <div className="rel-sub">
                      <h4>Humor</h4>
                      {Object.keys(rel.humor).length === 0 ? <p className="rel-empty">Sem registros de humor.</p> : (
                        <div className="rel-chips">
                          {Object.entries(rel.humor).sort((a, b) => b[1] - a[1]).map(([k, n]) => (
                            <span className="rel-chip" key={k}><span style={{ fontSize: 16, lineHeight: 1 }}>{HUMOR_EMOJI[k] ?? "•"}</span>{HUMOR_LABEL[k] ?? k} <b>{n}</b></span>
                          ))}
                        </div>
                      )}
                    </div>
                    {rel.peso && (
                      <div className="rel-sub">
                        <h4>Peso</h4>
                        <div className="rel-peso">
                          <b>{rel.peso.final}kg</b>
                          <span className={`d ${rel.peso.delta < 0 ? "down" : rel.peso.delta > 0 ? "up" : ""}`}>
                            {rel.peso.delta < 0 ? "−" : rel.peso.delta > 0 ? "+" : ""}{Math.abs(rel.peso.delta)}kg
                          </span>
                          <span className="rel-empty">desde {rel.peso.inicial}kg</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </section>

              {/* Conquistas */}
              {rel.conquistas.length > 0 && (
                <section className="rel-sec">
                  <h2>Conquistas no período</h2>
                  <div className="rel-chips">
                    {rel.conquistas.map((c, i) => (
                      <span className="rel-chip gold" key={i}><span style={{ fontSize: 15, lineHeight: 1 }}>{c.icone ?? "🏅"}</span>{c.titulo}</span>
                    ))}
                  </div>
                </section>
              )}
            </div>

            <footer className="rel-foot">
              <span>Nexvel · Relatório gerado em {brData(isoHoje())}</span>
              <span>{rel.paciente.nome} · {brData(rel.periodo.inicio)}–{brData(rel.periodo.fim)}</span>
            </footer>
          </article>
        )}
      </main>
    </div>
  );
}
