import { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ChevronLeft, FileDown, Sparkles, Utensils, Droplet, Moon, Dumbbell, Smile,
  Shield, Flame, CalendarCheck, Target, User, AlertTriangle, AlertCircle,
  CheckCircle2, TrendingUp, Star, StickyNote,
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
  dias: DiaRel[];
  mesAnterior: { aderenciaPct: number } | null;
  insightsRegras: string[];
  insightsIA: string[] | null;
}

const HUMOR_EMOJI: Record<string, string> = { otimo: "😄", bom: "🙂", neutro: "😐", dificil: "😕", pessimo: "😣" };
const HUMOR_LABEL: Record<string, string> = { otimo: "Ótimo", bom: "Bom", neutro: "Neutro", dificil: "Difícil", pessimo: "Péssimo" };
const HUMOR_SCORE: Record<string, number> = { otimo: 5, bom: 4, neutro: 3, dificil: 2, pessimo: 1 };
const LIGA_COR: Record<string, string> = { Bronze: "#C77B3C", Prata: "#9CA3AF", Ouro: "#E8A419", Diamante: "#3B9EDB", Mestre: "#8B5CF6", "Lendário": "#E8A419" };

/* cores dos hábitos (documento claro) */
const C = { green: "#16A34A", greenSoft: "#DCFCE7", amber: "#D97706", amberSoft: "#FEF3C7", red: "#DC2626", redSoft: "#FEE2E2", water: "#2563EB", waterSoft: "#DBEAFE", sleep: "#7C3AED", sleepSoft: "#EDE9FE", ink: "#111827", muted: "#6B7280", line: "#E5E7EB", soft: "#F7F7F5" };

function isoHoje() { return new Date().toISOString().slice(0, 10); }
function isoHa(dias: number) { return new Date(Date.now() - dias * 86_400_000).toISOString().slice(0, 10); }
function brData(iso: string) { const [a, m, d] = iso.split("-"); return `${d}/${m}/${a}`; }
function diaMes(iso: string) { const [, m, d] = iso.split("-"); return `${d}/${m}`; }
function nf(n: number) { return n.toLocaleString("pt-BR"); }
function litros(ml: number) { return `${(ml / 1000).toFixed(1).replace(".", ",")}L`; }
function fmtSono(h: number) { const hh = Math.floor(h); const mm = Math.round((h - hh) * 60); return `${hh}h ${String(mm).padStart(2, "0")}min`; }
function classeIndicador(p: number) { return p >= 85 ? "Excelente" : p >= 75 ? "Muito boa" : p >= 55 ? "Regular" : "Baixa"; }

/* ───────── CSS do documento (A4, claro, premium) ───────── */
const CSS = `
.rp{ --ink:${C.ink}; --muted:${C.muted}; --line:${C.line}; --soft:${C.soft};
  --green:${C.green}; --amber:${C.amber}; --red:${C.red}; --water:${C.water}; --sleep:${C.sleep};
  font-family:Inter,ui-sans-serif,system-ui,sans-serif; }
.rp-doc{ width:820px; max-width:100%; margin:0 auto; background:#fff; color:var(--ink);
  border-radius:18px; box-shadow:0 12px 44px rgba(0,0,0,.30); overflow:hidden; }
.rp-pad{ padding:30px 34px; }
/* header */
.rp-top{ display:flex; justify-content:space-between; align-items:flex-start; padding-bottom:18px; border-bottom:1px solid var(--line); }
.rp-logo{ display:flex; align-items:center; gap:11px; }
.rp-logo .mark{ width:34px; height:34px; border-radius:9px; background:#0F1115; display:grid; place-items:center; }
.rp-logo .mark svg{ color:#7CFF5B; }
.rp-logo b{ font-size:19px; font-weight:800; letter-spacing:.04em; }
.rp-logo small{ display:block; font-size:11px; color:var(--muted); font-weight:500; margin-top:1px; }
.rp-gen{ text-align:right; font-size:11px; color:var(--muted); line-height:1.5; }
.rp-gen b{ color:var(--ink); font-weight:600; }
/* patient block */
.rp-pac{ display:flex; gap:20px; padding:20px 0; align-items:center; border-bottom:1px solid var(--line); }
.rp-avatar{ width:88px; height:88px; border-radius:50%; object-fit:cover; flex:none; border:1px solid var(--line); }
.rp-avatar.ph{ display:grid; place-items:center; background:var(--soft); font-size:32px; font-weight:700; color:var(--muted); }
.rp-pinfo{ min-width:0; }
.rp-pinfo h1{ font-size:26px; font-weight:800; margin:0 0 8px; line-height:1; }
.rp-pline{ display:flex; align-items:center; gap:7px; font-size:13px; color:var(--muted); margin:4px 0; }
.rp-pline b{ color:var(--ink); font-weight:600; }
.rp-stats{ display:flex; gap:14px; margin-left:auto; flex:none; }
.rp-stat{ background:var(--soft); border:1px solid var(--line); border-radius:14px; padding:13px 16px; min-width:118px; }
.rp-stat .lbl{ display:flex; align-items:center; gap:6px; font-size:10.5px; text-transform:uppercase; letter-spacing:.05em; color:var(--muted); margin-bottom:5px; }
.rp-stat .val{ font-size:19px; font-weight:800; line-height:1.05; }
.rp-stat .sub{ font-size:10.5px; color:var(--muted); margin-top:4px; }
.rp-xpbar{ height:6px; border-radius:99px; background:#EDEDEA; margin:7px 0 4px; overflow:hidden; }
.rp-xpbar i{ display:block; height:100%; background:#E8A419; border-radius:99px; }
/* indicadores */
.rp-inds{ display:grid; grid-template-columns:repeat(5,1fr); gap:11px; margin:22px 0 6px; }
.rp-ind{ border:1px solid var(--line); border-radius:14px; padding:14px 12px; text-align:center; }
.rp-ind .ic{ width:34px; height:34px; border-radius:10px; display:grid; place-items:center; margin:0 auto 8px; }
.rp-ind .t{ font-size:10.5px; text-transform:uppercase; letter-spacing:.04em; color:var(--muted); }
.rp-ind .v{ font-size:27px; font-weight:800; line-height:1.1; margin-top:2px; }
.rp-ind .d{ font-size:10px; color:var(--muted); margin-top:3px; }
/* seções e colunas */
.rp-cols{ display:grid; grid-template-columns:1fr 1fr 1fr; gap:16px; margin-top:24px; }
.rp-card{ border:1px solid var(--line); border-radius:14px; padding:16px; }
.rp-h{ font-size:11px; text-transform:uppercase; letter-spacing:.07em; color:var(--ink); font-weight:700; margin:0 0 12px; }
.rp-h.mt{ margin-top:16px; }
.rp-donut{ display:flex; align-items:center; gap:14px; }
.rp-dleg{ display:flex; flex-direction:column; gap:8px; font-size:11.5px; }
.rp-dleg .r{ display:flex; align-items:center; gap:7px; }
.rp-dleg .dot{ width:9px; height:9px; border-radius:3px; flex:none; }
.rp-dleg .p{ margin-left:auto; font-weight:700; padding-left:10px; }
.rp-puladas{ list-style:none; margin:0; padding:0; }
.rp-puladas li{ display:flex; align-items:center; gap:8px; font-size:12px; padding:5px 0; }
.rp-puladas .dot{ width:8px; height:8px; border-radius:50%; flex:none; }
.rp-puladas .n{ margin-left:auto; font-weight:700; color:var(--muted); }
.rp-alert{ display:flex; gap:10px; padding:9px 0; }
.rp-alert .ai{ width:26px; height:26px; border-radius:50%; display:grid; place-items:center; flex:none; }
.rp-alert .at{ font-size:12px; line-height:1.4; }
.rp-alert + .rp-alert{ border-top:1px solid var(--line); }
.rp-evo{ font-size:11px; color:var(--muted); }
.rp-evo b{ font-size:22px; font-weight:800; }
.rp-evobox{ margin-top:12px; background:${C.greenSoft}; border-radius:12px; padding:12px 14px; display:flex; align-items:center; justify-content:space-between; }
.rp-evobox .l{ font-size:11px; color:#166534; }
.rp-evobox .l b{ display:block; font-size:12px; color:#166534; font-weight:600; }
.rp-evobox .d{ font-size:22px; font-weight:800; color:var(--green); display:flex; align-items:center; gap:4px; }
/* tabela */
.rp-tblwrap{ margin-top:26px; }
.rp-tbl{ width:100%; border-collapse:separate; border-spacing:0; font-size:11.5px; }
.rp-tbl th{ background:#0F1115; color:#fff; font-weight:600; padding:11px 10px; text-align:left; font-size:11px; }
.rp-tbl th small{ display:block; font-weight:400; color:#9CA3AF; font-size:9.5px; }
.rp-tbl th:first-child{ border-top-left-radius:11px; } .rp-tbl th:last-child{ border-top-right-radius:11px; }
.rp-tbl td{ padding:9px 10px; border-bottom:1px solid var(--line); vertical-align:middle; }
.rp-tbl tr:nth-child(even) td{ background:#FAFAF9; }
.rp-tbl .cd{ font-weight:600; white-space:nowrap; }
.rp-cell{ display:inline-flex; align-items:center; gap:6px; white-space:nowrap; }
.rp-badge{ display:inline-flex; align-items:center; gap:5px; font-weight:600; }
.rp-mut{ color:#C4C7CD; }
.rp-tbl tr{ break-inside:avoid; page-break-inside:avoid; }
.rp-tbl thead{ display:table-header-group; }
.rp-legrow td{ background:#fff !important; border-bottom:none; padding-top:12px; }
.rp-leg{ display:flex; flex-wrap:wrap; gap:6px 14px; font-size:9.5px; color:var(--muted); }
.rp-leg span{ display:inline-flex; align-items:center; gap:4px; }
/* rodapé */
.rp-foot{ display:grid; grid-template-columns:1fr 1fr auto; gap:16px; margin-top:26px; align-items:stretch; }
.rp-foot .rp-card h4{ display:flex; align-items:center; gap:7px; font-size:11px; text-transform:uppercase; letter-spacing:.06em; color:var(--ink); font-weight:700; margin:0 0 10px; }
.rp-foot ul{ list-style:none; margin:0; padding:0; }
.rp-foot li{ display:flex; gap:8px; font-size:11.5px; line-height:1.5; margin:6px 0; }
.rp-foot li::before{ content:""; width:5px; height:5px; border-radius:50%; background:var(--green); margin-top:6px; flex:none; }
.rp-qr{ display:flex; flex-direction:column; align-items:center; justify-content:center; gap:8px; padding:8px; }
.rp-qrbox{ width:92px; height:92px; border-radius:12px; border:1px dashed var(--line); background:repeating-conic-gradient(#EDEDEA 0% 25%, #fff 0% 50%) 50% / 12px 12px; display:grid; place-items:center; }
.rp-qr small{ font-size:9.5px; color:var(--muted); text-align:center; line-height:1.4; }
.rp-brand{ display:flex; align-items:center; justify-content:space-between; padding:14px 34px; border-top:1px solid var(--line); font-size:11px; color:var(--muted); }
.rp-brand .l{ display:flex; align-items:center; gap:9px; }
.rp-empty{ font-size:11.5px; color:var(--muted); }
.rp-iaslot{ min-height:52px; display:flex; align-items:center; font-size:11.5px; color:#9AA0A6; font-style:italic; }
@media print{
  @page{ size:A4; margin:9mm; }
  html,body{ background:#fff !important; }
  /* isola o documento: nada do app-shell (sidebar, cards de instalação, controles) sai no PDF */
  body *{ visibility:hidden !important; }
  .rp, .rp *{ visibility:visible !important; }
  .no-print, .no-print *{ visibility:hidden !important; display:none !important; }
  main{ overflow:visible !important; display:block !important; }
  .rp{ position:absolute !important; left:0 !important; top:0 !important; width:100% !important;
    margin:0 !important; padding:0 !important; background:#fff !important; }
  .rp main{ padding:0 !important; max-width:none !important; margin:0 !important; }
  .rp-doc{ box-shadow:none !important; border-radius:0 !important; width:auto !important; max-width:none !important; }
  .rp *{ -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important; }
  .rp-cols, .rp-foot, .rp-pac, .rp-inds{ break-inside:avoid; }
}
`;

/* ───────── donut SVG ───────── */
function Donut({ seg }: { seg: Array<{ pct: number; cor: string }> }) {
  const r = 34, cx = 44, cy = 44, sw = 15, Cc = 2 * Math.PI * r;
  let off = 0;
  return (
    <svg width="88" height="88" viewBox="0 0 88 88">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#EDEDEA" strokeWidth={sw} />
      {seg.map((s, i) => {
        const len = (s.pct / 100) * Cc;
        const el = <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={s.cor} strokeWidth={sw}
          strokeDasharray={`${len} ${Cc - len}`} strokeDashoffset={-off} transform={`rotate(-90 ${cx} ${cy})`} />;
        off += len;
        return el;
      })}
    </svg>
  );
}

/* ───────── mini gráfico de linha (evolução semanal) ───────── */
function LineChart({ pts }: { pts: number[] }) {
  const W = 236, H = 100, pl = 24, pr = 24, pt = 20, pb = 22;
  const iw = W - pl - pr, ih = H - pt - pb;
  const x = (i: number) => pl + (pts.length === 1 ? iw / 2 : (i / (pts.length - 1)) * iw);
  const y = (v: number) => pt + ih - (Math.max(0, Math.min(100, v)) / 100) * ih;
  const anchor = (i: number) => (i === 0 ? "start" : i === pts.length - 1 ? "end" : "middle");
  const line = pts.map((v, i) => `${x(i)},${y(v)}`).join(" ");
  const area = `${x(0)},${pt + ih} ${line} ${x(pts.length - 1)},${pt + ih}`;
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      {[0, 50, 100].map((g) => <line key={g} x1={pl} x2={pl + iw} y1={y(g)} y2={y(g)} stroke="#F0F0EE" strokeWidth="1" />)}
      <polygon points={area} fill={C.greenSoft} opacity="0.7" />
      <polyline points={line} fill="none" stroke={C.green} strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" />
      {pts.map((v, i) => (
        <g key={i}>
          <circle cx={x(i)} cy={y(v)} r="3.4" fill="#fff" stroke={C.green} strokeWidth="2" />
          <text x={x(i)} y={y(v) - 8} textAnchor={anchor(i)} fontSize="10" fontWeight="700" fill={C.ink}>{v}%</text>
          <text x={x(i)} y={H - 5} textAnchor={anchor(i)} fontSize="9.5" fill={C.muted}>Sem {i + 1}</text>
        </g>
      ))}
    </svg>
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

  const iaAtiva = !!(rel?.insightsIA && rel.insightsIA.length);
  const insights = rel ? (iaAtiva ? rel.insightsIA! : rel.insightsRegras) : [];

  /* ── derivações (100% dos dados já existentes) ── */
  const view = useMemo(() => {
    if (!rel) return null;
    const R = rel.refeicoes;
    const totRef = R.reduce((s, m) => s + m.total, 0);
    const seguiu = R.reduce((s, m) => s + m.seguiu, 0);
    const adaptou = R.reduce((s, m) => s + m.adaptou, 0);
    const pulouRuim = R.reduce((s, m) => s + m.comeuMal + m.pulou, 0);
    const p = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);

    // 5 indicadores (— quando não há dado no período)
    const treinoDen = rel.treino.conforme + rel.treino.parcial + rel.treino.nao;
    const alimentacaoPct = totRef > 0 ? p(seguiu + adaptou, totRef) : null;
    const hidratacaoPct = rel.agua.diasComDado > 0 ? p(rel.agua.diasComDado - rel.agua.diasAbaixoMeta, rel.agua.diasComDado) : null;
    const sonoPct = rel.sono.diasComDado > 0 ? p(rel.sono.diasComDado - rel.sono.diasAbaixoMeta, rel.sono.diasComDado) : null;
    const treinoPct = treinoDen > 0 ? p(rel.treino.conforme + rel.treino.parcial, treinoDen) : null;
    const humorTot = Object.values(rel.humor).reduce((s, n) => s + n, 0);
    const humorAvg = humorTot ? Object.entries(rel.humor).reduce((s, [k, n]) => s + (HUMOR_SCORE[k] ?? 3) * n, 0) / humorTot : 0;
    const humorKey = humorAvg >= 4.5 ? "otimo" : humorAvg >= 3.5 ? "bom" : humorAvg >= 2.5 ? "neutro" : humorAvg >= 1.5 ? "dificil" : humorTot ? "pessimo" : null;
    const humorDesc = humorAvg >= 3.5 ? "Predominantemente positivo" : humorAvg >= 2.5 ? "Equilibrado" : humorTot ? "Requer atenção" : "Sem registros";

    // donut + refeições puladas
    const donut = [
      { pct: p(seguiu, totRef), cor: C.green }, { pct: p(adaptou, totRef), cor: "#EAB308" }, { pct: p(pulouRuim, totRef), cor: C.red },
    ];
    const puladas = [...R].filter((m) => m.pulou + m.comeuMal > 0).sort((a, b) => (b.pulou + b.comeuMal) - (a.pulou + a.comeuMal)).slice(0, 4);

    // alertas
    type Al = { tone: "red" | "amber" | "green"; text: string };
    const alertas: Al[] = [];
    // treino consecutivo
    let maxSem = 0, cur = 0;
    for (const d of rel.dias) { if (d.treino === "nao") { cur++; maxSem = Math.max(maxSem, cur); } else if (d.treino === "sim") cur = 0; }
    if (maxSem >= 3) alertas.push({ tone: "red", text: `Ficou ${maxSem} dias consecutivos sem treino` });
    if (rel.sono.diasAbaixoMeta > 0) alertas.push({ tone: rel.sono.diasAbaixoMeta >= 7 ? "red" : "amber", text: `Dormiu menos de ${rel.sono.meta}h em ${rel.sono.diasAbaixoMeta} dias` });
    const pior = [...R].filter((m) => m.total >= 3).sort((a, b) => b.problemaPct - a.problemaPct)[0];
    if (pior && pior.problemaPct >= 30) alertas.push({ tone: "amber", text: `Maior dificuldade: ${pior.label.toLowerCase()} (${pior.problemaPct}% de falha)` });
    if (rel.finaisDeSemana.totalFds > 0 && rel.finaisDeSemana.aderenciaFdsPct <= 50) alertas.push({ tone: "amber", text: `Menor adesão nos fins de semana (${rel.finaisDeSemana.aderenciaFdsPct}%)` });
    const aguaOkDias = rel.agua.diasComDado - rel.agua.diasAbaixoMeta;
    if (aguaOkDias > 0) alertas.push({ tone: "green", text: `Cumpriu a meta de água em ${aguaOkDias} dias` });
    if (rel.resumo.diasRegistrados > 0) alertas.push({ tone: "green", text: `Check-in realizado em ${rel.resumo.diasRegistrados} dias` });
    const alertasOrd = alertas.sort((a, b) => ({ red: 0, amber: 1, green: 2 }[a.tone] - { red: 0, amber: 1, green: 2 }[b.tone])).slice(0, 6);

    // evolução semanal (buckets de dias)
    const n = rel.dias.length;
    const bk = Math.max(1, Math.ceil(n / 4));
    const semanas: number[] = [];
    for (let i = 0; i < n; i += bk) {
      const slice = rel.dias.slice(i, i + bk);
      semanas.push(p(slice.filter((d) => d.checkin).length, slice.length));
    }
    const deltaMes = rel.mesAnterior ? rel.resumo.aderenciaPct - rel.mesAnterior.aderenciaPct : null;

    return { alimentacaoPct, hidratacaoPct, sonoPct, treinoPct, humorKey, humorDesc, donut, puladas, alertas: alertasOrd, semanas: semanas.slice(0, 4), deltaMes };
  }, [rel]);

  const geradoEm = useMemo(() => {
    const d = new Date();
    const p2 = (x: number) => String(x).padStart(2, "0");
    return `${p2(d.getDate())}/${p2(d.getMonth() + 1)}/${d.getFullYear()} às ${p2(d.getHours())}:${p2(d.getMinutes())}`;
  }, [rel]);

  const textoWhatsApp = useMemo(() => {
    if (!rel) return "";
    return [
      `*Nexvel · Relatório de ${rel.paciente.nome}*`,
      `${brData(rel.periodo.inicio)} a ${brData(rel.periodo.fim)} · adesão ${rel.resumo.aderenciaPct}% (${rel.resumo.diasRegistrados}/${rel.periodo.dias} dias)`,
      "", ...insights.map((i) => `• ${i}`),
    ].join("\n");
  }, [rel, insights]);

  function abrirWhatsApp() {
    if (!rel) return;
    const tel = (rel.paciente.telefone ?? "").replace(/\D/g, "");
    const link = tel ? gerarUrlWhatsApp(rel.paciente.telefone as string, textoWhatsApp) : `https://wa.me/?text=${encodeURIComponent(textoWhatsApp)}`;
    window.open(link, "_blank", "noopener");
  }
  function exportarPdf() {
    const original = document.title;
    document.title = `Nexvel - Relatório - ${rel?.paciente.nome ?? "paciente"}`;
    const restaurar = () => { document.title = original; window.removeEventListener("afterprint", restaurar); };
    window.addEventListener("afterprint", restaurar);
    window.print();
  }

  const ligaCor = rel ? (LIGA_COR[rel.resumo.ligaAtual] ?? "#E8A419") : "#E8A419";
  const xpPct = rel && rel.resumo.xpParaProxima > 0 ? Math.round((rel.resumo.pontosTotal / (rel.resumo.pontosTotal + rel.resumo.xpParaProxima)) * 100) : 100;

  return (
    <div className="rp min-h-screen bg-nx-bg-lowest text-nx-on-surface font-sans">
      <style>{CSS}</style>

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
              <button onClick={exportarPdf} className="flex items-center gap-2 rounded-xl bg-nx-evo text-nx-on-evo px-4 py-2.5 text-body-sm font-semibold hover:bg-nx-evo-2 transition-colors"><FileDown size={16} /> Exportar PDF</button>
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
        ) : !rel || !view ? null : (
          /* ═══════════ DOCUMENTO A4 ═══════════ */
          <article className="rp-doc">
            <div className="rp-pad">
              {/* HEADER */}
              <header className="rp-top">
                <div className="rp-logo">
                  <span className="mark"><Sparkles size={18} /></span>
                  <div><b>NEXVEL</b><small>Relatório Mensal do Paciente</small></div>
                </div>
                <div className="rp-gen">Relatório gerado em:<br /><b>{geradoEm}</b><br />Período: {brData(rel.periodo.inicio)} — {brData(rel.periodo.fim)}</div>
              </header>

              {/* PACIENTE + GAMIFICAÇÃO */}
              <section className="rp-pac">
                {rel.paciente.foto
                  ? <img src={rel.paciente.foto} alt={rel.paciente.nome} className="rp-avatar" />
                  : <div className="rp-avatar ph">{rel.paciente.nome.charAt(0).toUpperCase()}</div>}
                <div className="rp-pinfo">
                  <h1>{rel.paciente.nome}</h1>
                  {rel.paciente.objetivo && <div className="rp-pline"><Target size={14} /> Objetivo: <b>{rel.paciente.objetivo}</b></div>}
                  {rel.paciente.nutricionista && <div className="rp-pline"><User size={14} /> Nutricionista: <b>{rel.paciente.nutricionista}</b></div>}
                </div>
                <div className="rp-stats">
                  <div className="rp-stat">
                    <div className="lbl"><Shield size={13} style={{ color: ligaCor }} /> Liga atual</div>
                    <div className="val" style={{ color: ligaCor }}>{rel.resumo.ligaAtual} {rel.resumo.ligaNivel}</div>
                    <div className="rp-xpbar"><i style={{ width: `${xpPct}%`, background: ligaCor }} /></div>
                    <div className="sub">{nf(rel.resumo.pontosTotal)} XP{rel.resumo.proximaLiga ? ` · faltam ${nf(rel.resumo.xpParaProxima)}` : ""}</div>
                  </div>
                  <div className="rp-stat">
                    <div className="lbl"><Flame size={13} style={{ color: "#F97316" }} /> Sequência</div>
                    <div className="val" style={{ color: "#16A34A" }}>{rel.resumo.streakAtual} dias</div>
                    <div className="sub">recorde {rel.resumo.streakMaximo} dias</div>
                  </div>
                  <div className="rp-stat">
                    <div className="lbl"><CalendarCheck size={13} style={{ color: C.water }} /> Check-ins</div>
                    <div className="val">{rel.resumo.diasRegistrados} de {rel.periodo.dias}</div>
                    <div className="sub">{rel.resumo.aderenciaPct}% de adesão</div>
                  </div>
                </div>
              </section>

              {/* 5 INDICADORES */}
              <section className="rp-inds">
                {[
                  { ic: Utensils, cor: C.green, bg: C.greenSoft, t: "Alimentação", pct: view.alimentacaoPct },
                  { ic: Droplet, cor: C.water, bg: C.waterSoft, t: "Hidratação", pct: view.hidratacaoPct },
                  { ic: Moon, cor: C.sleep, bg: C.sleepSoft, t: "Sono", pct: view.sonoPct },
                  { ic: Dumbbell, cor: "#EA580C", bg: "#FFEDD5", t: "Treino", pct: view.treinoPct },
                  { ic: Smile, cor: "#CA8A04", bg: "#FEF9C3", t: "Humor médio", pct: null as number | null, v: view.humorKey ? HUMOR_LABEL[view.humorKey] : "—", d: view.humorDesc },
                ].map((k, i) => {
                  const semDado = k.t !== "Humor médio" && k.pct == null;
                  const v = "v" in k ? (k as { v: string }).v : semDado ? "—" : `${k.pct}%`;
                  const d = "d" in k ? (k as { d: string }).d : semDado ? "Sem registros" : classeIndicador(k.pct as number);
                  return (
                    <div className="rp-ind" key={i}>
                      <div className="ic" style={{ background: k.bg }}><k.ic size={19} style={{ color: k.cor }} /></div>
                      <div className="t">{k.t}</div>
                      <div className="v" style={{ color: semDado ? C.muted : k.cor, fontSize: k.t === "Humor médio" ? 20 : undefined }}>{v}</div>
                      <div className="d">{d}</div>
                    </div>
                  );
                })}
              </section>

              {/* 3 COLUNAS */}
              <section className="rp-cols">
                {/* col 1 */}
                <div className="rp-card">
                  <h3 className="rp-h">Resumo do mês</h3>
                  <div className="rp-donut">
                    <Donut seg={view.donut} />
                    <div className="rp-dleg">
                      <div className="r"><span className="dot" style={{ background: C.green }} /> Seguiu o plano <span className="p">{view.donut[0].pct}%</span></div>
                      <div className="r"><span className="dot" style={{ background: "#EAB308" }} /> Adaptou <span className="p">{view.donut[1].pct}%</span></div>
                      <div className="r"><span className="dot" style={{ background: C.red }} /> Pulou refeições <span className="p">{view.donut[2].pct}%</span></div>
                    </div>
                  </div>
                  <h3 className="rp-h mt">Refeições mais puladas</h3>
                  {view.puladas.length === 0 ? <p className="rp-empty">Nenhuma refeição pulada. 🎉</p> : (
                    <ul className="rp-puladas">
                      {view.puladas.map((m) => (
                        <li key={m.key}><span className="dot" style={{ background: C.red }} />{m.label}<span className="n">{m.pulou + m.comeuMal} {m.pulou + m.comeuMal === 1 ? "vez" : "vezes"}</span></li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* col 2 */}
                <div className="rp-card">
                  <h3 className="rp-h">Principais alertas</h3>
                  {view.alertas.length === 0 ? <p className="rp-empty">Sem alertas relevantes no período.</p> : view.alertas.map((a, i) => {
                    const Ico = a.tone === "green" ? CheckCircle2 : a.tone === "red" ? AlertCircle : AlertTriangle;
                    const cor = a.tone === "green" ? C.green : a.tone === "red" ? C.red : C.amber;
                    const bg = a.tone === "green" ? C.greenSoft : a.tone === "red" ? C.redSoft : C.amberSoft;
                    return (<div className="rp-alert" key={i}><span className="ai" style={{ background: bg }}><Ico size={15} style={{ color: cor }} /></span><span className="at">{a.text}</span></div>);
                  })}
                </div>

                {/* col 3 */}
                <div className="rp-card">
                  <h3 className="rp-h">Evolução da aderência</h3>
                  <LineChart pts={view.semanas} />
                  <div className="rp-evobox">
                    <span className="l">Evolução no mês<b>comparado ao mês anterior</b></span>
                    {view.deltaMes == null
                      ? <span className="d" style={{ color: C.muted, fontSize: 15 }}>—</span>
                      : <span className="d" style={{ color: view.deltaMes >= 0 ? C.green : C.red }}>{view.deltaMes >= 0 ? "+" : ""}{view.deltaMes}%<TrendingUp size={16} style={{ transform: view.deltaMes >= 0 ? "none" : "scaleY(-1)" }} /></span>}
                  </div>
                </div>
              </section>

              {/* TABELA DIA-A-DIA */}
              <section className="rp-tblwrap">
                <h3 className="rp-h" style={{ fontSize: 12, marginBottom: 12 }}>Visão diária do mês</h3>
                <table className="rp-tbl">
                  <thead>
                    <tr>
                      <th>Dia</th><th>Alimentação</th><th>Hidratação<small>Meta {litros(rel.agua.meta)}</small></th>
                      <th>Sono<small>Meta ≥{rel.sono.meta}h</small></th><th>Treino</th><th>Humor</th><th>Check-in</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rel.dias.map((d) => {
                      const alCor = d.alimentacao === "seguiu" ? C.green : d.alimentacao === "adaptou" ? C.amber : C.red;
                      const alTxt = d.alimentacao === "seguiu" ? "Seguiu" : d.alimentacao === "adaptou" ? "Adaptou" : d.alimentacao === "pulou" ? "Pulou" : null;
                      const AlIco = d.alimentacao === "seguiu" ? CheckCircle2 : d.alimentacao === "adaptou" ? AlertTriangle : AlertCircle;
                      const aguaCor = d.aguaMl == null ? C.muted : d.aguaMl >= rel.agua.meta ? C.green : d.aguaMl >= rel.agua.meta * 0.72 ? C.amber : C.red;
                      const sonoCor = d.sonoHoras == null ? C.muted : d.sonoHoras >= rel.sono.meta ? C.green : d.sonoHoras >= rel.sono.meta - 1 ? C.amber : C.red;
                      return (
                        <tr key={d.data}>
                          <td className="cd">{diaMes(d.data)}</td>
                          <td>{alTxt ? <span className="rp-badge" style={{ color: alCor }}><AlIco size={14} />{alTxt}</span> : <span className="rp-mut">—</span>}</td>
                          <td>{d.aguaMl == null ? <span className="rp-mut">—</span> : <span className="rp-cell" style={{ color: aguaCor, fontWeight: 600 }}><Droplet size={13} />{litros(d.aguaMl)}</span>}</td>
                          <td>{d.sonoHoras == null ? <span className="rp-mut">—</span> : <span className="rp-cell" style={{ color: sonoCor, fontWeight: 600 }}><Moon size={13} />{fmtSono(d.sonoHoras)}</span>}</td>
                          <td>{d.treino == null ? <span className="rp-mut">—</span> : d.treino === "sim" ? <span className="rp-badge" style={{ color: C.green }}><Dumbbell size={14} />Treinou</span> : <span className="rp-badge" style={{ color: C.muted }}><Dumbbell size={14} />Não treinou</span>}</td>
                          <td>{d.humor ? <span style={{ fontSize: 16 }}>{HUMOR_EMOJI[d.humor] ?? "•"}</span> : <span className="rp-mut">—</span>}</td>
                          <td>{d.checkin ? <CheckCircle2 size={16} style={{ color: C.green }} /> : <AlertCircle size={16} style={{ color: "#D1D5DB" }} />}</td>
                        </tr>
                      );
                    })}
                    <tr className="rp-legrow">
                      <td colSpan={7}>
                        <div className="rp-leg">
                          <span><CheckCircle2 size={12} style={{ color: C.green }} /> Seguiu</span>
                          <span><AlertTriangle size={12} style={{ color: C.amber }} /> Adaptou</span>
                          <span><AlertCircle size={12} style={{ color: C.red }} /> Pulou</span>
                          <span style={{ color: C.green }}>💧 ≥ {litros(rel.agua.meta)}</span>
                          <span style={{ color: C.amber }}>quase</span>
                          <span style={{ color: C.red }}>{"<"} meta</span>
                          <span style={{ color: C.green }}>🌙 ≥ {rel.sono.meta}h</span>
                          <span style={{ color: C.red }}>{"<"} {rel.sono.meta - 1}h</span>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </section>

              {/* RODAPÉ */}
              <section className="rp-foot">
                <div className="rp-card">
                  <h4><StickyNote size={14} /> Anotações rápidas</h4>
                  {insights.length === 0 ? <p className="rp-empty">Sem dados suficientes no período.</p> : (
                    <ul>{insights.slice(0, 4).map((i, idx) => <li key={idx}>{i}</li>)}</ul>
                  )}
                </div>
                <div className="rp-card">
                  <h4><Star size={14} /> Resumo inteligente <span style={{ marginLeft: "auto", fontSize: 9, fontWeight: 500, color: C.muted, background: C.soft, borderRadius: 99, padding: "2px 8px" }}>{iaAtiva ? "IA" : "Em breve"}</span></h4>
                  {iaAtiva
                    ? <ul>{rel.insightsIA!.slice(0, 4).map((i, idx) => <li key={idx}>{i}</li>)}</ul>
                    : <div className="rp-iaslot">Espaço reservado para a leitura inteligente do mês, gerada por IA.</div>}
                </div>
                <div className="rp-qr">
                  <div className="rp-qrbox"><Sparkles size={20} style={{ color: "#C4C7CD" }} /></div>
                  <small>Escaneie para<br />ver no app</small>
                </div>
              </section>
            </div>

            {/* BRAND BAR */}
            <div className="rp-brand">
              <span className="l"><span style={{ width: 20, height: 20, borderRadius: 6, background: "#0F1115", display: "grid", placeItems: "center" }}><Sparkles size={11} style={{ color: "#7CFF5B" }} /></span> <b style={{ color: C.ink }}>NEXVEL</b> · Transformando hábitos em conquistas.</span>
              <span>www.nexvel.app</span>
            </div>
          </article>
        )}
      </main>
    </div>
  );
}
