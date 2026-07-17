import { useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ChevronLeft, FileDown, Sparkles, Utensils, Droplet, Moon, Dumbbell, Smile,
  Target, User, AlertTriangle, AlertCircle, CheckCircle2, TrendingUp,
  StickyNote, CalendarCheck, Star,
} from "lucide-react";
import { useFetch } from "../hooks/useFetch";
import { gerarUrlWhatsApp } from "../lib/utils";

/* ───────── tipos (espelham o backend relatorioService) ───────── */
interface DiaRel {
  data: string;
  alimentacao: "seguiu" | "adaptou" | "pulou" | null;
  aguaMl: number | null;
  sonoHoras: number | null;
  treino: "sim" | "nao" | null;
  humor: string | null;
  checkin: boolean;
}
interface Medida { inicial: number; final: number; delta: number }
interface Relatorio {
  paciente: { id: string; nome: string; telefone: string | null; foto: string | null; objetivo: string | null; nutricionista: string | null };
  periodo: { inicio: string; fim: string; dias: number };
  resumo: {
    diasRegistrados: number; aderenciaPct: number; desafiosCumpridos: number; xpPeriodo: number;
    ligaAtual: string; ligaNivel: string; streakMaximo: number; streakAtual: number;
    pontosTotal: number; xpParaProxima: number; proximaLiga: string | null;
  };
  refeicoes: Array<{ key: string; label: string; total: number; seguiu: number; adaptou: number; comeuMal: number; pulou: number; problemaPct: number }>;
  treino: { conforme: number; parcial: number; nao: number; faltas: number; motivos: Array<{ motivo: string; vezes: number }> };
  sono: { meta: number; diasComDado: number; mediaHoras: number; diasAbaixoMeta: number };
  agua: { meta: number; diasComDado: number; mediaMl: number; diasAbaixoMeta: number };
  humor: Record<string, number>;
  finaisDeSemana: { totalFds: number; registradosFds: number; aderenciaFdsPct: number; aderenciaUteisPct: number };
  peso: { inicial: number; final: number; delta: number } | null;
  conquistas: Array<{ titulo: string; icone: string | null; data: string }>;
  motivosRefeicoes: Array<{ refeicao: string; texto: string }>;
  scoreGeral: { valor: number; status: string };
  dificuldades: Array<{ texto: string; vezes: number }>;
  evolucaoFisica: {
    peso: Medida | null;
    medidas: Record<string, Medida | null>;
    laudo: string | null;
    observacoes: string | null;
    fotos: Array<{ data: string; tipo: string; imagem: string }>;
  };
  dias: DiaRel[];
  diasAtencao?: Array<{ data: string; motivo: string }>;
  mesAnterior: { aderenciaPct: number } | null;
  evolucao?: Array<{ dim: string; atual: number | null; anterior: number | null; delta: number | null; unidade: "%" | "nivel" }>;
  insightsRegras: string[];
  insightsIA: string[] | null;
  focoRegras: string[];
  focoIA: string[] | null;
  chamaAtencao: string[];
  padroes: string[];
  metas: string[];
  maiorSequenciaPeriodo: number;
}

const HUMOR_LABEL: Record<string, string> = { otimo: "Ótimo", bom: "Bom", neutro: "Neutro", dificil: "Difícil", pessimo: "Péssimo" };
const HUMOR_SCORE: Record<string, number> = { otimo: 5, bom: 4, neutro: 3, dificil: 2, pessimo: 1 };
const MEDIDA_LABEL: Record<string, string> = {
  gordura: "Gordura corporal", musculo: "Massa muscular", cintura: "Cintura",
  quadril: "Quadril", braco: "Braço", coxa: "Coxa",
};
const MEDIDA_UNIDADE: Record<string, string> = { gordura: "%", musculo: "kg", cintura: "cm", quadril: "cm", braco: "cm", coxa: "cm" };
const MEDIDAS_ORDEM = ["gordura", "musculo", "cintura", "quadril", "braco", "coxa"];

/* cores do documento (claro, clínico) */
const C = { green: "#16A34A", greenSoft: "#E7F6EC", amber: "#B45309", amberSoft: "#FBF0DC", red: "#B91C1C", redSoft: "#FBE7E7", water: "#1D4ED8", waterSoft: "#E4ECFB", sleep: "#6D28D9", sleepSoft: "#EEE8FB", ink: "#111827", sub: "#374151", muted: "#6B7280", line: "#E3E5E9", soft: "#F6F6F4" };

function isoHoje() { return new Date().toISOString().slice(0, 10); }
function isoHa(dias: number) { return new Date(Date.now() - dias * 86_400_000).toISOString().slice(0, 10); }
function brData(iso: string) { const [a, m, d] = iso.split("-"); return `${d}/${m}/${a}`; }
function diaMes(iso: string) { const [, m, d] = iso.split("-"); return `${d}/${m}`; }
function nf(n: number) { return n.toLocaleString("pt-BR"); }
function litros(ml: number) { return `${(ml / 1000).toFixed(1).replace(".", ",")}L`; }
function fmtSono(h: number) { const hh = Math.floor(h); const mm = Math.round((h - hh) * 60); return `${hh}h${mm ? ` ${String(mm).padStart(2, "0")}min` : ""}`; }
function classeIndicador(p: number) { return p >= 85 ? "Excelente" : p >= 70 ? "Muito boa" : p >= 55 ? "Regular" : "Baixa"; }
function sinal(n: number) { return n > 0 ? "+" : n < 0 ? "−" : ""; }

/* status do dia (P2): calculado a partir dos hábitos registrados */
function statusDia(d: DiaRel, metaAgua: number, metaSono: number): { label: string; tone: "green" | "blue" | "amber" | "muted" } {
  if (!d.checkin) return { label: "Sem registro", tone: "muted" };
  let problemas = 0;
  if (d.alimentacao === "pulou") problemas++;
  if (d.aguaMl != null && d.aguaMl < metaAgua) problemas++;
  if (d.sonoHoras != null && d.sonoHoras < metaSono) problemas++;
  if (d.treino === "nao") problemas++;
  if (problemas === 0) return { label: "Excelente", tone: "green" };
  if (problemas === 1) return { label: "Bom", tone: "blue" };
  return { label: "Atenção", tone: "amber" };
}
const TONE_COR: Record<string, { cor: string; bg: string }> = {
  green: { cor: C.green, bg: C.greenSoft }, blue: { cor: C.water, bg: C.waterSoft },
  amber: { cor: C.amber, bg: C.amberSoft }, muted: { cor: C.muted, bg: C.soft },
};
function statusScoreCor(status: string) {
  return status === "Excelente" ? C.green : status === "Bom" ? C.water : status === "Regular" ? C.amber : C.red;
}

/* ───────── CSS base (visual — usado na tela e passado ao Paged.js) ───────── */
const BASE_CSS = `
.rp{ --ink:${C.ink}; --sub:${C.sub}; --muted:${C.muted}; --line:${C.line}; --soft:${C.soft};
  font-family:Inter,ui-sans-serif,system-ui,sans-serif; }
.rp-report{ }
/* folha = 1 página */
.rp-page{ width:820px; max-width:100%; margin:0 auto 24px; background:#fff; color:var(--ink);
  border-radius:12px; box-shadow:0 10px 40px rgba(0,0,0,.26); padding:34px 38px; box-sizing:border-box; }
.rp-page + .rp-page{ break-before:page; page-break-before:always; }
.rp-page > * + *{ margin-top:22px; }

/* header */
.rp-top{ display:flex; justify-content:space-between; align-items:flex-start; padding-bottom:16px; border-bottom:1px solid var(--line); }
.rp-logo{ display:flex; align-items:center; gap:11px; }
.rp-logo .mark{ width:34px; height:34px; border-radius:9px; background:#0F1115; display:grid; place-items:center; }
.rp-logo .mark svg{ color:#7CFF5B; }
.rp-logo b{ font-size:18px; font-weight:800; letter-spacing:.05em; }
.rp-logo small{ display:block; font-size:10.5px; color:var(--muted); font-weight:500; margin-top:1px; }
.rp-gen{ text-align:right; font-size:10.5px; color:var(--muted); line-height:1.55; }
.rp-gen b{ color:var(--ink); font-weight:600; }
.rp-page-tag{ font-size:10px; text-transform:uppercase; letter-spacing:.09em; color:var(--muted); font-weight:700; margin:0 0 12px; }

/* paciente */
.rp-pac{ display:flex; gap:18px; align-items:center; }
.rp-avatar{ width:74px; height:74px; border-radius:50%; object-fit:cover; flex:none; border:1px solid var(--line); }
.rp-avatar.ph{ display:grid; place-items:center; background:var(--soft); font-size:28px; font-weight:700; color:var(--muted); }
.rp-pinfo h1{ font-size:23px; font-weight:800; margin:0 0 6px; line-height:1.05; }
.rp-pline{ display:flex; align-items:center; gap:7px; font-size:12.5px; color:var(--muted); margin:3px 0; }
.rp-pline b{ color:var(--sub); font-weight:600; }

/* score */
.rp-score{ display:flex; align-items:center; gap:20px; border:1px solid var(--line); border-radius:14px; padding:16px 20px; background:var(--soft); }
.rp-score .num{ font-size:46px; font-weight:800; line-height:1; }
.rp-score .num small{ font-size:18px; font-weight:600; color:var(--muted); }
.rp-score .status{ display:inline-block; font-size:13px; font-weight:700; padding:3px 12px; border-radius:99px; }
.rp-score .sub{ font-size:12px; color:var(--muted); margin-top:7px; }
.rp-score .cap{ font-size:10px; text-transform:uppercase; letter-spacing:.06em; color:var(--muted); font-weight:700; margin-bottom:6px; }

/* indicadores */
.rp-inds{ display:grid; grid-template-columns:repeat(5,1fr); gap:11px; }
.rp-ind{ border:1px solid var(--line); border-radius:12px; padding:13px 10px; text-align:center; }
.rp-ind .ic{ width:32px; height:32px; border-radius:9px; display:grid; place-items:center; margin:0 auto 7px; }
.rp-ind .t{ font-size:10px; text-transform:uppercase; letter-spacing:.03em; color:var(--muted); }
.rp-ind .v{ font-size:25px; font-weight:800; line-height:1.1; margin-top:2px; }
.rp-ind .d{ font-size:9.5px; color:var(--muted); margin-top:3px; }

/* blocos de texto (IA / foco / dificuldades) */
.rp-block{ border:1px solid var(--line); border-radius:12px; padding:16px 18px; }
.rp-block.hl{ border-color:#CBB68A; background:#FBF7EE; }
.rp-block h3{ display:flex; align-items:center; gap:8px; font-size:11px; text-transform:uppercase; letter-spacing:.06em; color:var(--ink); font-weight:800; margin:0 0 11px; }
.rp-block h3 .tag{ margin-left:auto; font-size:8.5px; font-weight:600; color:var(--muted); background:#fff; border:1px solid var(--line); border-radius:99px; padding:2px 8px; letter-spacing:.02em; }
.rp-list{ list-style:none; margin:0; padding:0; }
.rp-list li{ display:flex; gap:9px; font-size:12.5px; line-height:1.55; color:var(--sub); margin:7px 0; }
.rp-list li::before{ content:""; width:5px; height:5px; border-radius:50%; background:#CBB68A; margin-top:7px; flex:none; }
.rp-block.plain h3{ } .rp-block.plain .rp-list li::before{ background:var(--muted); }
.rp-dif li{ align-items:center; }
.rp-dif li::before{ background:${C.amber}; }
.rp-dif .n{ margin-left:auto; font-size:11px; font-weight:700; color:var(--muted); white-space:nowrap; padding-left:10px; }
.rp-empty{ font-size:12px; color:var(--muted); }
.rp-cols2{ display:grid; grid-template-columns:1fr 1fr; gap:16px; }

/* evolução vs período anterior (só número) */
.rp-evobox{ display:flex; align-items:center; justify-content:space-between; border:1px solid var(--line); border-radius:12px; padding:14px 18px; }
.rp-evobox .cap{ font-size:10px; text-transform:uppercase; letter-spacing:.06em; color:var(--muted); font-weight:700; }
.rp-evobox .l{ font-size:13px; color:var(--sub); font-weight:600; margin-top:4px; }
.rp-evobox .d{ font-size:26px; font-weight:800; display:flex; align-items:center; gap:5px; }

/* dias que merecem atenção (mini-tabela Data|Motivo) */
.rp-mini{ width:100%; border-collapse:collapse; font-size:11.5px; }
.rp-mini td{ padding:5px 0; border-bottom:1px solid var(--line); color:var(--sub); vertical-align:top; }
.rp-mini tr:last-child td{ border-bottom:none; }
.rp-mini .dt{ font-weight:700; color:var(--ink); width:54px; white-space:nowrap; }

/* evolução por dimensão vs período anterior */
.rp-evogrid{ display:grid; grid-template-columns:repeat(5,1fr); gap:10px; }
.rp-evoitem{ text-align:center; border:1px solid var(--line); border-radius:10px; padding:11px 6px; }
.rp-evoitem .l{ display:block; font-size:9.5px; text-transform:uppercase; letter-spacing:.03em; color:var(--muted); margin-bottom:5px; }
.rp-evoitem .d{ font-size:15px; font-weight:800; }

/* anti-corte: nenhum card/seção é fatiado no meio ao paginar (Paged.js) */
.rp-score, .rp-inds, .rp-ind, .rp-block, .rp-evobox, .rp-cols2,
.rp-med, .rp-medcard, .rp-foto, .rp-evogrid, .rp-evoitem, .rp-mini tr, .rp-pac{
  break-inside:avoid; page-break-inside:avoid;
}

/* tabela dia-a-dia */
.rp-tbl{ width:100%; border-collapse:separate; border-spacing:0; font-size:11px; }
.rp-tbl th{ background:#0F1115; color:#fff; font-weight:600; padding:10px 9px; text-align:left; font-size:10.5px; }
.rp-tbl th small{ display:block; font-weight:400; color:#9CA3AF; font-size:9px; }
.rp-tbl th:first-child{ border-top-left-radius:9px; } .rp-tbl th:last-child{ border-top-right-radius:9px; }
.rp-tbl td{ padding:8px 9px; border-bottom:1px solid var(--line); vertical-align:middle; }
.rp-tbl tr:nth-child(even) td{ background:#FAFAF9; }
.rp-tbl .cd{ font-weight:600; white-space:nowrap; }
.rp-cell{ display:inline-flex; align-items:center; gap:5px; white-space:nowrap; font-weight:600; }
.rp-badge{ display:inline-flex; align-items:center; gap:5px; font-weight:600; }
.rp-st{ display:inline-block; font-size:10px; font-weight:700; padding:2px 9px; border-radius:99px; white-space:nowrap; }
.rp-mut{ color:#B6BAC1; }
.rp-tbl tr{ break-inside:avoid; page-break-inside:avoid; }
.rp-tbl thead{ display:table-header-group; }
.rp-legrow td{ background:#fff !important; border-bottom:none; padding-top:11px; }
.rp-leg{ display:flex; flex-wrap:wrap; gap:6px 14px; font-size:9.5px; color:var(--muted); }
.rp-leg span{ display:inline-flex; align-items:center; gap:4px; }

/* evolução física (P3) */
.rp-med{ display:grid; grid-template-columns:repeat(3,1fr); gap:12px; }
.rp-medcard{ border:1px solid var(--line); border-radius:12px; padding:13px 15px; }
.rp-medcard .t{ font-size:10.5px; text-transform:uppercase; letter-spacing:.03em; color:var(--muted); }
.rp-medcard .row{ display:flex; align-items:baseline; gap:8px; margin-top:6px; }
.rp-medcard .val{ font-size:19px; font-weight:800; }
.rp-medcard .arw{ font-size:12px; color:var(--muted); }
.rp-medcard .dl{ margin-left:auto; font-size:12px; font-weight:700; }
.rp-fotos{ display:grid; grid-template-columns:repeat(4,1fr); gap:12px; }
.rp-foto{ border:1px solid var(--line); border-radius:10px; overflow:hidden; background:var(--soft); }
.rp-foto img{ display:block; width:100%; height:150px; object-fit:cover; }
.rp-foto .cap{ font-size:9.5px; color:var(--muted); padding:5px 8px; text-align:center; }
.rp-obs{ font-size:12.5px; line-height:1.6; color:var(--sub); white-space:pre-wrap; }
.rp-humor{ display:flex; flex-wrap:wrap; gap:8px; }
.rp-humorchip{ font-size:11.5px; color:var(--sub); border:1px solid var(--line); border-radius:99px; padding:5px 12px; }
.rp-humorchip b{ font-weight:700; color:var(--ink); }

/* rodapé de página (Paged.js running element) */
.rp-runfoot{ display:none; align-items:center; gap:7px; font-size:8pt; color:${C.muted}; }
.rp-runfoot .m{ width:14px; height:14px; border-radius:4px; background:#0F1115; display:inline-grid; place-items:center; }
.rp-runfoot b{ color:${C.ink}; font-weight:700; letter-spacing:.04em; }

/* KPIs do resumo executivo */
.rp-kpis{ display:grid; grid-template-columns:repeat(6,1fr); gap:9px; }
.rp-kpi{ border:1px solid var(--line); border-radius:10px; padding:11px 9px; text-align:center; }
.rp-kpi .t{ font-size:9px; text-transform:uppercase; letter-spacing:.04em; color:var(--muted); }
.rp-kpi .v{ font-size:17px; font-weight:800; line-height:1.15; margin-top:3px; color:var(--ink); }
.rp-kpi .v small{ font-size:11px; font-weight:600; color:var(--muted); }

/* resumo lateral da linha do tempo (contagem de status) */
.rp-sumline{ display:flex; flex-wrap:wrap; gap:8px; margin-bottom:12px; }
.rp-sumcell{ display:flex; align-items:center; gap:6px; border:1px solid var(--line); border-radius:99px; padding:5px 12px; font-size:11px; color:var(--sub); }
.rp-sumcell b{ font-weight:800; color:var(--ink); }
.rp-sumcell .dot{ width:8px; height:8px; border-radius:50%; flex:none; }
`;

/* CSS aplicado na TELA e na impressão nativa (caminho de sucesso: só imprime o Paged.js) */
const SCREEN_CSS = `
.rp-print-root{ position:absolute; left:-100000px; top:0; width:820px; }
@media print{
  html,body{ background:#fff !important; }
  body *{ visibility:hidden !important; }
  .rp-print-root, .rp-print-root *{ visibility:visible !important; }
  .no-print{ display:none !important; }
  .rp-print-root{ position:static !important; left:0 !important; width:auto !important; }
  @page{ margin:0; }
  .pagedjs_page{ margin:0 !important; box-shadow:none !important; }
  *{ -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important; }
}
`;

/* CSS só para o Paged.js (paginação real + rodapé com nº de página em toda página) */
const PAGED_CSS = `
${BASE_CSS}
@page{
  size:A4; margin:14mm 12mm 16mm;
  @bottom-left{ content:element(runfoot); }
  @bottom-right{ content:"Página " counter(page) " de " counter(pages);
    font-family:Inter,ui-sans-serif,sans-serif; font-size:8pt; color:${C.muted}; }
}
.rp-page{ box-shadow:none !important; border-radius:0 !important; margin:0 auto !important; padding:0 !important; width:100% !important; }
.rp-runfoot{ display:flex !important; position:running(runfoot); }
`;

/* ───────── página ───────── */
export default function RelatorioMensal() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const reportRef = useRef<HTMLDivElement>(null);

  const [inicio, setInicio] = useState(isoHa(29));
  const [fim, setFim] = useState(isoHoje());
  const [comIA, setComIA] = useState(false);
  const [gerando, setGerando] = useState(false);

  const url = id ? `/pacientes/${id}/relatorio-mensal?inicio=${inicio}&fim=${fim}${comIA ? "&ia=1" : ""}` : null;
  const { data: rel, loading, error } = useFetch<Relatorio>(url);

  const iaAtiva = !!(rel?.insightsIA && rel.insightsIA.length);
  const insights = rel ? (iaAtiva ? rel.insightsIA! : rel.insightsRegras) : [];
  const focoAtiva = !!(rel?.focoIA && rel.focoIA.length);
  const foco = rel ? (focoAtiva ? rel.focoIA! : rel.focoRegras) : [];

  /* ── indicadores (a partir dos dados já existentes) ── */
  const view = useMemo(() => {
    if (!rel) return null;
    const R = rel.refeicoes;
    const totRef = R.reduce((s, m) => s + m.total, 0);
    const p = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);
    const treinoDen = rel.treino.conforme + rel.treino.parcial + rel.treino.nao;

    const alimentacaoPct = totRef > 0 ? p(R.reduce((s, m) => s + m.seguiu + m.adaptou, 0), totRef) : null;
    const hidratacaoPct = rel.agua.diasComDado > 0 ? p(rel.agua.diasComDado - rel.agua.diasAbaixoMeta, rel.agua.diasComDado) : null;
    const sonoPct = rel.sono.diasComDado > 0 ? p(rel.sono.diasComDado - rel.sono.diasAbaixoMeta, rel.sono.diasComDado) : null;
    const treinoPct = treinoDen > 0 ? p(rel.treino.conforme + rel.treino.parcial, treinoDen) : null;

    const humorTot = Object.values(rel.humor).reduce((s, n) => s + n, 0);
    const humorAvg = humorTot ? Object.entries(rel.humor).reduce((s, [k, n]) => s + (HUMOR_SCORE[k] ?? 3) * n, 0) / humorTot : 0;
    const humorKey = humorAvg >= 4.5 ? "otimo" : humorAvg >= 3.5 ? "bom" : humorAvg >= 2.5 ? "neutro" : humorAvg >= 1.5 ? "dificil" : humorTot ? "pessimo" : null;
    const humorDesc = humorAvg >= 3.5 ? "Predominante positivo" : humorAvg >= 2.5 ? "Equilibrado" : humorTot ? "Requer atenção" : "Sem registros";

    const deltaMes = rel.mesAnterior ? rel.resumo.aderenciaPct - rel.mesAnterior.aderenciaPct : null;
    return { alimentacaoPct, hidratacaoPct, sonoPct, treinoPct, humorKey, humorDesc, deltaMes };
  }, [rel]);

  const geradoEm = useMemo(() => {
    const d = new Date();
    const p2 = (x: number) => String(x).padStart(2, "0");
    return `${p2(d.getDate())}/${p2(d.getMonth() + 1)}/${d.getFullYear()} às ${p2(d.getHours())}:${p2(d.getMinutes())}`;
  }, [rel]);

  /* evolução física — o que mostrar (blocos vazios são ocultados) */
  const fis = useMemo(() => {
    if (!rel) return null;
    const ev = rel.evolucaoFisica;
    const medidas = MEDIDAS_ORDEM
      .map((k) => ({ k, m: ev.medidas[k] }))
      .filter((x): x is { k: string; m: Medida } => !!x.m);
    const humorTot = Object.values(rel.humor).reduce((s, n) => s + n, 0);
    const temAlgo = !!ev.peso || medidas.length > 0 || ev.fotos.length > 0 || !!(ev.laudo || ev.observacoes) || humorTot > 0;
    return { ev, medidas, humorTot, temAlgo };
  }, [rel]);

  /* linha do tempo — contagem de status do dia (resumo lateral da tabela) */
  const stCounts = useMemo(() => {
    if (!rel) return null;
    const c = { green: 0, blue: 0, amber: 0, muted: 0 };
    for (const d of rel.dias) c[statusDia(d, rel.agua.meta, rel.sono.meta).tone] += 1;
    return c;
  }, [rel]);

  const textoWhatsApp = useMemo(() => {
    if (!rel) return "";
    return [
      `*Nexvel · Relatório de ${rel.paciente.nome}*`,
      `${brData(rel.periodo.inicio)} a ${brData(rel.periodo.fim)} · Score ${rel.scoreGeral.valor}/100 (${rel.scoreGeral.status})`,
      "", ...insights.map((i) => `• ${i}`),
    ].join("\n");
  }, [rel, insights]);

  function abrirWhatsApp() {
    if (!rel) return;
    const tel = (rel.paciente.telefone ?? "").replace(/\D/g, "");
    const link = tel ? gerarUrlWhatsApp(rel.paciente.telefone as string, textoWhatsApp) : `https://wa.me/?text=${encodeURIComponent(textoWhatsApp)}`;
    window.open(link, "_blank", "noopener");
  }

  /* Export: paginação real via Paged.js (rodapé + nº de página em toda página).
     Falha na lib → cai na impressão nativa simples. */
  async function exportarPdf() {
    const src = reportRef.current;
    const original = document.title;
    document.title = `Nexvel - Relatório - ${rel?.paciente.nome ?? "paciente"}`;
    const restaurar = () => { document.title = original; };
    if (!src) { window.print(); restaurar(); return; }

    setGerando(true);
    let root: HTMLDivElement | null = null;
    let cssUrl = "";
    try {
      const { Previewer } = await import("pagedjs");
      root = document.createElement("div");
      root.className = "rp-print-root";
      document.body.appendChild(root);
      cssUrl = URL.createObjectURL(new Blob([PAGED_CSS], { type: "text/css" }));
      await new Previewer().preview(src.cloneNode(true), [cssUrl], root);

      const limpar = () => {
        if (root && document.body.contains(root)) root.remove();
        if (cssUrl) URL.revokeObjectURL(cssUrl);
        window.removeEventListener("afterprint", onAfter);
        restaurar();
      };
      const onAfter = () => limpar();
      window.addEventListener("afterprint", onAfter);
      setGerando(false);
      window.print();
      setTimeout(() => { if (root && document.body.contains(root)) limpar(); }, 120000);
    } catch (e) {
      console.error("[relatorio] Paged.js falhou, imprimindo direto", e);
      if (root && document.body.contains(root)) root.remove();
      if (cssUrl) URL.revokeObjectURL(cssUrl);
      setGerando(false);
      window.print();
      restaurar();
    }
  }

  const metaAgua = rel?.agua.meta ?? 0;
  const metaSono = rel?.sono.meta ?? 0;

  return (
    <div className="rp min-h-screen bg-nx-bg-lowest text-nx-on-surface font-sans">
      <style>{BASE_CSS + SCREEN_CSS}</style>

      <main className="mx-auto max-w-4xl px-4 py-6 pb-24 md:px-6">
        {/* Controles (não saem no PDF) */}
        <div className="no-print">
          <button onClick={() => navigate(`/app/pacientes/${id}`)} className="mb-4 flex items-center gap-1 text-body-sm text-nx-on-surface-variant hover:text-nx-on-surface">
            <ChevronLeft size={18} /> Voltar ao paciente
          </button>
          <div className="mb-4 flex flex-wrap items-end gap-3 rounded-2xl border border-nx-border bg-nx-surface p-4">
            <label className="flex flex-col gap-1">
              <span className="text-label-sm uppercase text-nx-on-surface-variant">De</span>
              <input type="date" value={inicio} max={fim} onChange={(e) => setInicio(e.target.value)} className="bg-nx-container border border-nx-border rounded-xl px-3 py-2 text-body-sm text-nx-on-surface focus:outline-none focus:ring-1 focus:ring-nx-evo" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-label-sm uppercase text-nx-on-surface-variant">Até</span>
              <input type="date" value={fim} min={inicio} max={isoHoje()} onChange={(e) => setFim(e.target.value)} className="bg-nx-container border border-nx-border rounded-xl px-3 py-2 text-body-sm text-nx-on-surface focus:outline-none focus:ring-1 focus:ring-nx-evo" />
            </label>
            <button onClick={() => { setInicio(isoHa(29)); setFim(isoHoje()); }} className="rounded-xl border border-nx-border px-3 py-2 text-body-sm text-nx-on-surface-variant hover:text-nx-on-surface transition-colors">Últimos 30 dias</button>
            <label className="ml-auto flex cursor-pointer items-center gap-2 text-body-sm text-nx-on-surface-variant">
              <input type="checkbox" checked={comIA} onChange={(e) => setComIA(e.target.checked)} className="accent-nx-evo size-4" />
              <Sparkles size={15} className="text-nx-evo" /> Leitura inteligente (IA)
            </label>
          </div>
          {rel && (
            <div className="mb-5 flex flex-wrap gap-2">
              <button onClick={exportarPdf} disabled={gerando} className="flex items-center gap-2 rounded-xl bg-nx-evo text-nx-on-evo px-4 py-2.5 text-body-sm font-semibold hover:bg-nx-evo-2 transition-colors disabled:opacity-60"><FileDown size={16} /> {gerando ? "Preparando…" : "Exportar PDF"}</button>
              <button onClick={abrirWhatsApp} title={rel.paciente.telefone ? "Enviar resumo por WhatsApp" : "Paciente sem número — escolha o contato no WhatsApp"} className="flex items-center gap-2 rounded-xl border border-nx-border px-4 py-2.5 text-body-sm font-semibold text-nx-on-surface hover:bg-nx-surface-hover transition-colors">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden><path d="M17.5 14.4c-.3-.15-1.7-.85-2-.95-.26-.1-.45-.15-.64.15-.19.28-.73.94-.9 1.13-.16.19-.33.21-.61.07-.3-.15-1.24-.46-2.36-1.46-.87-.78-1.46-1.74-1.63-2.03-.17-.29-.02-.45.13-.6.13-.13.29-.34.44-.5.15-.17.19-.29.29-.48.1-.19.05-.36-.02-.5-.08-.15-.64-1.55-.88-2.12-.23-.55-.47-.48-.64-.49l-.55-.01c-.19 0-.5.07-.76.36-.26.29-1 .98-1 2.38s1.02 2.76 1.17 2.95c.15.19 2.02 3.08 4.9 4.32.68.29 1.22.47 1.63.6.69.22 1.31.19 1.8.11.55-.08 1.7-.69 1.94-1.36.24-.67.24-1.24.17-1.36-.07-.12-.26-.19-.55-.34zM12 2a10 10 0 0 0-8.5 15.3L2 22l4.8-1.5A10 10 0 1 0 12 2z" /></svg> WhatsApp
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="mx-auto max-w-[820px] space-y-4"><div className="h-40 animate-pulse rounded-2xl bg-nx-container/60" /><div className="h-96 animate-pulse rounded-2xl bg-nx-container/60" /></div>
        ) : error ? (
          <div className="mx-auto max-w-[820px] rounded-2xl border border-nx-border bg-nx-surface p-8 text-center text-body-sm text-nx-danger">{error}</div>
        ) : !rel || !view || !fis ? null : (
          /* ═══════════ FICHA CLÍNICA (3 páginas) ═══════════ */
          <div className="rp-report" ref={reportRef}>
            {/* rodapé repetido em toda página (Paged.js) */}
            <div className="rp-runfoot">
              <span className="m"><Sparkles size={9} style={{ color: "#7CFF5B" }} /></span>
              <b>NEXVEL</b>· Relatório Mensal · Gerado em {geradoEm}
            </div>

            {/* ───────── PÁGINA 1 — RESUMO EXECUTIVO ───────── */}
            <section className="rp-page">
              <header className="rp-top" style={{ marginTop: 0 }}>
                <div className="rp-logo">
                  <span className="mark"><Sparkles size={18} /></span>
                  <div><b>NEXVEL</b><small>Relatório Mensal do Paciente</small></div>
                </div>
                <div className="rp-gen">Gerado em: <b>{geradoEm}</b><br />Período: {brData(rel.periodo.inicio)} — {brData(rel.periodo.fim)} ({rel.periodo.dias} dias)</div>
              </header>

              <section className="rp-pac">
                {rel.paciente.foto
                  ? <img src={rel.paciente.foto} alt={rel.paciente.nome} className="rp-avatar" />
                  : <div className="rp-avatar ph">{rel.paciente.nome.charAt(0).toUpperCase()}</div>}
                <div className="rp-pinfo">
                  <h1>{rel.paciente.nome}</h1>
                  {rel.paciente.objetivo && <div className="rp-pline"><Target size={14} /> Objetivo: <b>{rel.paciente.objetivo}</b></div>}
                  {rel.paciente.nutricionista && <div className="rp-pline"><User size={14} /> Nutricionista responsável: <b>{rel.paciente.nutricionista}</b></div>}
                </div>
              </section>

              {/* Score Geral */}
              <section className="rp-score">
                <div>
                  <div className="cap">Score geral de adesão</div>
                  <div className="num" style={{ color: statusScoreCor(rel.scoreGeral.status) }}>{rel.scoreGeral.valor}<small>/100</small></div>
                </div>
                <div className="rp-score-meta">
                  <span className="status" style={{ color: statusScoreCor(rel.scoreGeral.status), background: `${statusScoreCor(rel.scoreGeral.status)}18` }}>{rel.scoreGeral.status}</span>
                  <div className="sub">Check-ins realizados: <b style={{ color: C.sub }}>{rel.resumo.diasRegistrados} de {rel.periodo.dias} dias</b> · {rel.resumo.aderenciaPct}% de adesão no período</div>
                </div>
              </section>

              {/* 5 indicadores */}
              <section className="rp-inds">
                {[
                  { ic: Utensils, cor: C.green, bg: C.greenSoft, t: "Alimentação", pct: view.alimentacaoPct },
                  { ic: Droplet, cor: C.water, bg: C.waterSoft, t: "Hidratação", pct: view.hidratacaoPct },
                  { ic: Moon, cor: C.sleep, bg: C.sleepSoft, t: "Sono", pct: view.sonoPct },
                  { ic: Dumbbell, cor: "#C2410C", bg: "#FBEBDD", t: "Treino", pct: view.treinoPct },
                  { ic: Smile, cor: "#A16207", bg: "#FBF3D5", t: "Humor médio", pct: null as number | null, v: view.humorKey ? HUMOR_LABEL[view.humorKey] : "—", d: view.humorDesc },
                ].map((k, i) => {
                  const semDado = k.t !== "Humor médio" && k.pct == null;
                  const v = "v" in k ? (k as { v: string }).v : semDado ? "—" : `${k.pct}%`;
                  const d = "d" in k ? (k as { d: string }).d : semDado ? "Sem registros" : classeIndicador(k.pct as number);
                  return (
                    <div className="rp-ind" key={i}>
                      <div className="ic" style={{ background: k.bg }}><k.ic size={18} style={{ color: k.cor }} /></div>
                      <div className="t">{k.t}</div>
                      <div className="v" style={{ color: semDado ? C.muted : k.cor, fontSize: k.t === "Humor médio" ? 19 : undefined }}>{v}</div>
                      <div className="d">{d}</div>
                    </div>
                  );
                })}
              </section>

              {/* Resumo executivo — KPIs */}
              <section className="rp-kpis">
                <div className="rp-kpi"><div className="t">Liga</div><div className="v" style={{ fontSize: 13 }}>{rel.resumo.ligaAtual}<small> {rel.resumo.ligaNivel}</small></div></div>
                <div className="rp-kpi"><div className="t">XP total</div><div className="v">{nf(rel.resumo.pontosTotal)}</div></div>
                <div className="rp-kpi"><div className="t">Seq. atual</div><div className="v">{rel.resumo.streakAtual}<small> d</small></div></div>
                <div className="rp-kpi"><div className="t">Melhor seq.</div><div className="v">{rel.resumo.streakMaximo}<small> d</small></div></div>
                <div className="rp-kpi"><div className="t">Check-ins</div><div className="v">{rel.resumo.diasRegistrados}<small>/{rel.periodo.dias}</small></div></div>
                <div className="rp-kpi"><div className="t">Aderência</div><div className="v">{rel.resumo.aderenciaPct}<small>%</small></div></div>
              </section>

              {/* Resumo Inteligente (destaque) */}
              <section className="rp-block hl">
                <h3><Sparkles size={14} style={{ color: "#B08D57" }} /> Resumo inteligente <span className="tag">{iaAtiva ? "Gerado por IA" : "Leitura automática"}</span></h3>
                {insights.length === 0 ? <p className="rp-empty">Sem dados suficientes no período.</p> : (
                  <ul className="rp-list">{insights.slice(0, 6).map((t, i) => <li key={i}>{t}</li>)}</ul>
                )}
              </section>

              {/* O que mais chama atenção */}
              {rel.chamaAtencao.length > 0 && (
                <section className="rp-block plain">
                  <h3><AlertTriangle size={14} style={{ color: C.amber }} /> O que mais chama atenção</h3>
                  <ul className="rp-list rp-dif">{rel.chamaAtencao.map((t, i) => <li key={i}>{t}</li>)}</ul>
                </section>
              )}

              {/* Padrões identificados */}
              {rel.padroes.length > 0 && (
                <section className="rp-block plain">
                  <h3><AlertCircle size={14} style={{ color: C.water }} /> Padrões identificados</h3>
                  <ul className="rp-list">{rel.padroes.map((t, i) => <li key={i}>{t}</li>)}</ul>
                </section>
              )}

              {/* Evolução vs. período anterior — só quando há período anterior */}
              {rel.mesAnterior != null && !!rel.evolucao?.length && (
                <section className="rp-block plain">
                  <h3><TrendingUp size={14} style={{ color: C.green }} /> Evolução vs. período anterior</h3>
                  <div className="rp-evogrid">
                    {rel.evolucao.map((e, i) => {
                      const est = e.delta == null ? null : (e.unidade === "nivel" ? Math.round(e.delta) : e.delta);
                      const cor = est == null ? C.muted : est > 0 ? C.green : est < 0 ? C.red : C.muted;
                      const txt = est == null ? "—"
                        : e.unidade === "nivel"
                          ? (est === 0 ? "Estável" : `${sinal(est)}${Math.abs(est)} ${Math.abs(est) === 1 ? "nível" : "níveis"}`)
                          : (est === 0 ? "Estável" : `${sinal(est)}${Math.abs(est)}%`);
                      return (
                        <div className="rp-evoitem" key={i}>
                          <span className="l">{e.dim}</span>
                          <span className="d" style={{ color: cor }}>{txt}</span>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Principais pontos para a consulta */}
              {foco.length > 0 && (
                <section className="rp-block plain">
                  <h3><CalendarCheck size={14} style={{ color: C.water }} /> Principais pontos para a consulta {focoAtiva && <span className="tag">IA</span>}</h3>
                  <ul className="rp-list">{foco.slice(0, 5).map((t, i) => <li key={i}>{t}</li>)}</ul>
                </section>
              )}

              {/* Metas para o próximo ciclo */}
              {rel.metas.length > 0 && (
                <section className="rp-block plain">
                  <h3><Target size={14} style={{ color: C.green }} /> Metas para o próximo ciclo</h3>
                  <ul className="rp-list">{rel.metas.map((t, i) => <li key={i}>{t}</li>)}</ul>
                </section>
              )}
            </section>

            {/* ───────── PÁGINA 2 — LINHA DO TEMPO (só se houver registros) ───────── */}
            {rel.resumo.diasRegistrados > 0 && (
            <section className="rp-page">
              <p className="rp-page-tag">Linha do tempo do mês</p>
              {stCounts && (
                <div className="rp-sumline">
                  <span className="rp-sumcell"><span className="dot" style={{ background: C.green }} />Dias excelentes <b>{stCounts.green}</b></span>
                  <span className="rp-sumcell"><span className="dot" style={{ background: C.water }} />Dias bons <b>{stCounts.blue}</b></span>
                  <span className="rp-sumcell"><span className="dot" style={{ background: C.amber }} />Atenção <b>{stCounts.amber}</b></span>
                  <span className="rp-sumcell"><span className="dot" style={{ background: C.muted }} />Sem registro <b>{stCounts.muted}</b></span>
                  <span className="rp-sumcell">Maior sequência <b>{rel.maiorSequenciaPeriodo} {rel.maiorSequenciaPeriodo === 1 ? "dia" : "dias"}</b></span>
                </div>
              )}
              <table className="rp-tbl">
                <thead>
                  <tr>
                    <th>Data</th><th>Alimentação</th><th>Água<small>Meta {litros(rel.agua.meta)}</small></th>
                    <th>Sono<small>Meta ≥{rel.sono.meta}h</small></th><th>Treino</th><th>Humor</th><th>Check-in</th><th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rel.dias.map((d) => {
                    const alCor = d.alimentacao === "seguiu" ? C.green : d.alimentacao === "adaptou" ? C.amber : C.red;
                    const alTxt = d.alimentacao === "seguiu" ? "Seguiu" : d.alimentacao === "adaptou" ? "Adaptou" : d.alimentacao === "pulou" ? "Pulou" : null;
                    const aguaCor = d.aguaMl == null ? C.muted : d.aguaMl >= rel.agua.meta ? C.green : d.aguaMl >= rel.agua.meta * 0.72 ? C.amber : C.red;
                    const sonoCor = d.sonoHoras == null ? C.muted : d.sonoHoras >= rel.sono.meta ? C.green : d.sonoHoras >= rel.sono.meta - 1 ? C.amber : C.red;
                    const st = statusDia(d, metaAgua, metaSono);
                    const stc = TONE_COR[st.tone];
                    return (
                      <tr key={d.data}>
                        <td className="cd">{diaMes(d.data)}</td>
                        <td>{alTxt ? <span className="rp-badge" style={{ color: alCor }}>{alTxt}</span> : <span className="rp-mut">—</span>}</td>
                        <td>{d.aguaMl == null ? <span className="rp-mut">—</span> : <span className="rp-cell" style={{ color: aguaCor }}>{litros(d.aguaMl)}</span>}</td>
                        <td>{d.sonoHoras == null ? <span className="rp-mut">—</span> : <span className="rp-cell" style={{ color: sonoCor }}>{fmtSono(d.sonoHoras)}</span>}</td>
                        <td>{d.treino == null ? <span className="rp-mut">—</span> : d.treino === "sim" ? <span className="rp-badge" style={{ color: C.green }}>Treinou</span> : <span className="rp-badge" style={{ color: C.muted }}>Não treinou</span>}</td>
                        <td>{d.humor ? <span style={{ color: C.sub }}>{HUMOR_LABEL[d.humor] ?? "—"}</span> : <span className="rp-mut">—</span>}</td>
                        <td>{d.checkin ? <CheckCircle2 size={15} style={{ color: C.green }} /> : <AlertCircle size={15} style={{ color: "#D1D5DB" }} />}</td>
                        <td><span className="rp-st" style={{ color: stc.cor, background: stc.bg }}>{st.label}</span></td>
                      </tr>
                    );
                  })}
                  <tr className="rp-legrow">
                    <td colSpan={8}>
                      <div className="rp-leg">
                        <span><span className="rp-st" style={{ color: C.green, background: C.greenSoft }}>Excelente</span> nenhum problema no dia</span>
                        <span><span className="rp-st" style={{ color: C.water, background: C.waterSoft }}>Bom</span> 1 ponto de atenção</span>
                        <span><span className="rp-st" style={{ color: C.amber, background: C.amberSoft }}>Atenção</span> 2+ pontos</span>
                        <span><span className="rp-st" style={{ color: C.muted, background: C.soft }}>Sem registro</span> dia sem check-in</span>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </section>
            )}

            {/* ───────── PÁGINA 3 — EVOLUÇÃO FÍSICA ───────── */}
            {fis.temAlgo && (
              <section className="rp-page">
                <p className="rp-page-tag">Evolução física</p>

                {/* Peso + medidas */}
                {(fis.ev.peso || fis.medidas.length > 0) && (
                  <section className="rp-block plain">
                    <h3><TrendingUp size={14} style={{ color: C.green }} /> Peso e medidas <span className="tag">início → fim</span></h3>
                    <div className="rp-med">
                      {fis.ev.peso && (
                        <div className="rp-medcard">
                          <div className="t">Peso</div>
                          <div className="row">
                            <span className="val">{fis.ev.peso.final}<span style={{ fontSize: 12, color: C.muted, marginLeft: 2 }}>kg</span></span>
                            <span className="arw">← {fis.ev.peso.inicial}kg</span>
                            <span className="dl" style={{ color: fis.ev.peso.delta === 0 ? C.muted : fis.ev.peso.delta < 0 ? C.green : C.amber }}>{sinal(fis.ev.peso.delta)}{Math.abs(fis.ev.peso.delta)}kg</span>
                          </div>
                        </div>
                      )}
                      {fis.medidas.map(({ k, m }) => (
                        <div className="rp-medcard" key={k}>
                          <div className="t">{MEDIDA_LABEL[k]}</div>
                          <div className="row">
                            <span className="val">{m.final}<span style={{ fontSize: 12, color: C.muted, marginLeft: 2 }}>{MEDIDA_UNIDADE[k]}</span></span>
                            <span className="arw">← {m.inicial}{MEDIDA_UNIDADE[k]}</span>
                            <span className="dl" style={{ color: m.delta === 0 ? C.muted : C.sub }}>{sinal(m.delta)}{Math.abs(m.delta)}{MEDIDA_UNIDADE[k]}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Fotos */}
                {fis.ev.fotos.length > 0 && (
                  <section className="rp-block plain">
                    <h3><Star size={14} style={{ color: "#B08D57" }} /> Fotos de evolução</h3>
                    <div className="rp-fotos">
                      {fis.ev.fotos.slice(0, 8).map((f, i) => (
                        <div className="rp-foto" key={i}>
                          <img src={f.imagem} alt={`Foto ${brData(f.data)}`} />
                          <div className="cap">{brData(f.data)}{f.tipo ? ` · ${f.tipo}` : ""}</div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Humor (distribuição) */}
                {fis.humorTot > 0 && (
                  <section className="rp-block plain">
                    <h3><Smile size={14} style={{ color: "#A16207" }} /> Humor no período</h3>
                    <div className="rp-humor">
                      {Object.entries(rel.humor).sort((a, b) => b[1] - a[1]).map(([k, n]) => (
                        <span className="rp-humorchip" key={k}>{HUMOR_LABEL[k] ?? k}: <b>{n} {n === 1 ? "dia" : "dias"}</b></span>
                      ))}
                    </div>
                  </section>
                )}

                {/* Laudo / Observações */}
                {(fis.ev.laudo || fis.ev.observacoes) && (
                  <section className="rp-block plain">
                    <h3><StickyNote size={14} style={{ color: C.muted }} /> Observações clínicas</h3>
                    {fis.ev.laudo && <p className="rp-obs" style={{ marginBottom: fis.ev.observacoes ? 10 : 0 }}><b style={{ color: C.ink }}>Laudo:</b> {fis.ev.laudo}</p>}
                    {fis.ev.observacoes && <p className="rp-obs">{fis.ev.observacoes}</p>}
                  </section>
                )}
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
