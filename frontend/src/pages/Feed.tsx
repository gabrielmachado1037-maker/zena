import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search, RefreshCw, MessageCircle, Flame, Clock, CheckCircle2,
  Utensils, Droplet, Moon, Dumbbell, Smile, CircleSlash,
} from "lucide-react";
import { getRegistrosFeed, type FeedData, type Registro, type SemRegistro } from "../lib/registros";
import { LeagueEmblem, BottomSheetNx } from "../components/ui-nx";
import { CORES_LIGA } from "../lib/ligas";

// Tela "Registros Diários" — central rápida do nutri: em <3s dá pra ver quem está bem
// e quem precisa de atenção. Só reorganiza dados já calculados; nada de validar/aprovar.

type FiltroId = "todos" | "hoje" | "ontem" | "sem" | "atencao";
const FILTROS: { id: FiltroId; label: string }[] = [
  { id: "todos", label: "Todos" },
  { id: "hoje", label: "Hoje" },
  { id: "ontem", label: "Ontem" },
  { id: "sem", label: "Sem registro" },
  { id: "atencao", label: "Precisam de atenção" },
];

const HUMOR_EMOJI: Record<string, string> = { otimo: "😄", bom: "🙂", neutro: "😐", dificil: "😕", pessimo: "😣" };
const HUMOR_LABEL: Record<string, string> = { otimo: "Excelente", bom: "Bom", neutro: "Neutro", dificil: "Ruim", pessimo: "Ruim" };
const SONO_FAIXA: Record<string, string> = { menos5: "< 5h", "5a7": "5–7h", "7a9": "7–9h", mais9: "9h+" };
const HUMOR_SCORE: Record<string, number> = { otimo: 100, bom: 80, neutro: 60, dificil: 35, pessimo: 20 };

/* ───────── Score do dia (0–100) ─────────
   Apenas apresentação: combina os dados que o registro JÁ possui. Sem novo dado,
   sem tocar em serviço/API/banco. Cada dimensão vira 0–100 e o final é a média das 6. */
function subScores(r: Registro) {
  const alimentacao = r.alimentacaoPct ?? 0;
  const metaAgua = r.aguaMetaMl && r.aguaMetaMl > 0 ? r.aguaMetaMl : 2000;
  const agua = r.aguaMl == null ? 0 : Math.min(100, Math.round((r.aguaMl / metaAgua) * 100));
  let sono = 0;
  if (r.sonoHoras != null) sono = r.sonoHoras >= 7 ? 100 : r.sonoHoras >= 6 ? 78 : r.sonoHoras >= 5 ? 55 : 30;
  else if (r.sonoFaixa) sono = ({ menos5: 30, "5a7": 65, "7a9": 100, mais9: 88 } as Record<string, number>)[r.sonoFaixa] ?? 0;
  const treino = r.treino === "feito" ? 100 : 0;
  const humor = r.humor ? HUMOR_SCORE[r.humor] ?? 0 : 0;
  const checkin = r.habitosTotal > 0 ? Math.round((r.habitosOk / r.habitosTotal) * 100) : 0;
  const final = Math.round((alimentacao + agua + sono + treino + humor + checkin) / 6);
  return { alimentacao, agua, sono, treino, humor, checkin, final };
}

// ≥85 verde · 60–84 amarelo · <60 vermelho
function scoreCor(s: number) {
  if (s >= 85) return { dot: "bg-nx-evo", text: "text-nx-evo", ring: "border-nx-evo/30", bg: "bg-nx-evo/10", hex: "#7CFF5B" };
  if (s >= 60) return { dot: "bg-nx-warn", text: "text-nx-warn", ring: "border-nx-warn/30", bg: "bg-nx-warn/10", hex: "#FFD34D" };
  return { dot: "bg-nx-danger", text: "text-nx-danger", ring: "border-nx-danger/30", bg: "bg-nx-danger/10", hex: "#FF5D5D" };
}

function iniciais(nome: string) {
  return nome.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
}
function litros(ml: number) { return `${(ml / 1000).toFixed(1).replace(".", ",")}L`; }
function fmtSono(h: number) { const hh = Math.floor(h); const mm = Math.round((h - hh) * 60); return mm ? `${hh}h${pad(mm)}` : `${hh}h`; }
function pad(n: number) { return n < 10 ? `0${n}` : `${n}`; }

/* ───────── métrica compacta (ícone + valor) ───────── */
function Metric({ icon: Icon, value, cor }: { icon: typeof Utensils; value: string; cor: string }) {
  const vazio = value === "—";
  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <Icon size={15} className="shrink-0" style={{ color: vazio ? "#5B616B" : cor }} />
      <span className="text-body-sm font-semibold truncate" style={{ color: vazio ? "#5B616B" : "#E7E9EC" }}>{value}</span>
    </div>
  );
}

/* ───────── card de registro ───────── */
function RegistroCard({ r, onChat, onScore }: { r: Registro; onChat: (id: string) => void; onScore: (r: Registro) => void }) {
  const score = subScores(r).final;
  const sc = scoreCor(score);
  const ligaCor = (r.ligaNome && CORES_LIGA[r.ligaNome]) || "#7CFF5B";
  const alimCor = r.alimentacaoPct == null ? "#5B616B" : r.alimentacaoPct >= 75 ? "#7CFF5B" : r.alimentacaoPct >= 50 ? "#FFD34D" : "#FF5D5D";
  const aguaCor = r.aguaMl != null && r.aguaMetaMl != null && r.aguaMl >= r.aguaMetaMl ? "#7CFF5B" : "#49A8FF";
  const treinoCor = r.treino === "feito" ? "#7CFF5B" : r.treino === "nao" ? "#FF5D5D" : "#5B616B";

  return (
    <article className="rounded-2xl border border-nx-border bg-nx-surface p-4 sm:p-5 shadow-nx-card transition-colors hover:border-nx-outline/40">
      {/* Cabeçalho: paciente + status */}
      <div className="flex items-start gap-3">
        <div className="relative shrink-0">
          {r.avatar ? (
            <img src={r.avatar} alt={r.paciente} className="w-12 h-12 rounded-full object-cover border border-nx-border" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-nx-container-high grid place-items-center text-label-md font-bold text-nx-on-surface-variant border border-nx-border">
              {iniciais(r.paciente)}
            </div>
          )}
          <LeagueEmblem liga={r.ligaNome ?? r.liga} size={22} className="absolute -bottom-1.5 -right-1.5 drop-shadow" />
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-body-md text-nx-on-surface truncate">{r.paciente}</h3>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-label-sm text-nx-on-surface-variant">
            <span className="font-semibold" style={{ color: ligaCor }}>
              {r.ligaNome ?? r.ligaLabel}{r.ligaNivel ? ` ${r.ligaNivel}` : ""}
            </span>
            <span>· {r.xp.toLocaleString("pt-BR")} XP</span>
            {r.streak > 0 && (
              <span className="flex items-center gap-1"><Flame size={12} className="text-nx-streak" />{r.streak} dias</span>
            )}
            <span className="flex items-center gap-1"><Clock size={12} />{r.horario}</span>
          </div>
        </div>

        <button
          onClick={() => onScore(r)}
          aria-label={`Score ${score} de 100 — ver detalhes`}
          className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition-all hover:brightness-110 active:scale-95 ${sc.ring} ${sc.bg}`}
        >
          <span className={`w-2 h-2 rounded-full ${sc.dot}`} />
          <span className={`text-label-sm font-bold ${sc.text}`}>Score {score}</span>
        </button>
      </div>

      {/* Resumo: indicadores */}
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-5 gap-x-4 gap-y-2.5 border-t border-nx-border pt-3.5">
        <Metric icon={Utensils} cor={alimCor} value={r.alimentacaoPct != null ? `${r.alimentacaoPct}%` : "—"} />
        <Metric icon={Droplet} cor={aguaCor} value={r.aguaMl != null ? litros(r.aguaMl) : "—"} />
        <Metric icon={Moon} cor="#A855F7" value={r.sonoHoras != null ? fmtSono(r.sonoHoras) : r.sonoFaixa ? (SONO_FAIXA[r.sonoFaixa] ?? "—") : "—"} />
        <Metric icon={Dumbbell} cor={treinoCor} value={r.treino === "feito" ? "Feito" : r.treino === "nao" ? "Não fez" : "—"} />
        <Metric icon={Smile} cor="#F8C84B" value={r.humor ? `${HUMOR_EMOJI[r.humor] ?? ""} ${HUMOR_LABEL[r.humor] ?? ""}`.trim() : "—"} />
      </div>

      {/* Rodapé: hábitos + conversar */}
      <div className="mt-3.5 flex items-center justify-between border-t border-nx-border pt-3.5">
        <div className="flex items-center gap-2 text-label-md">
          <CheckCircle2 size={16} className={r.habitosOk >= r.habitosTotal ? "text-nx-evo" : "text-nx-on-surface-variant"} />
          <span className="text-nx-on-surface-variant">
            {r.habitosOk >= r.habitosTotal ? "Check-in completo" : "Check-in"} ·{" "}
            <span className="font-semibold text-nx-on-surface">{r.habitosOk}/{r.habitosTotal} hábitos</span>
          </span>
        </div>
        <button
          onClick={() => onChat(r.pacienteId)}
          className="flex items-center gap-2 rounded-xl bg-nx-evo text-nx-on-evo font-bold px-4 py-2 text-body-sm transition-all hover:bg-nx-evo-2 active:scale-95"
        >
          <MessageCircle size={16} /> Conversar
        </button>
      </div>
    </article>
  );
}

/* ───────── card "sem registro" ───────── */
function SemRegistroCard({ p, onChat }: { p: SemRegistro; onChat: (id: string) => void }) {
  const ligaCor = (p.ligaNome && CORES_LIGA[p.ligaNome]) || "#9CA3AF";
  const txt = p.dias == null ? "Nunca registrou" : p.dias <= 0 ? "Sem check-in hoje" : `Sem registro há ${p.dias} ${p.dias === 1 ? "dia" : "dias"}`;
  return (
    <article className="rounded-2xl border border-nx-border bg-nx-surface p-4 sm:p-5 shadow-nx-card flex items-center gap-3">
      <div className="relative shrink-0">
        {p.avatar ? (
          <img src={p.avatar} alt={p.paciente} className="w-12 h-12 rounded-full object-cover border border-nx-border grayscale opacity-80" />
        ) : (
          <div className="w-12 h-12 rounded-full bg-nx-container-high grid place-items-center text-label-md font-bold text-nx-on-surface-variant border border-nx-border">
            {iniciais(p.paciente)}
          </div>
        )}
        <LeagueEmblem liga={p.ligaNome ?? p.liga} size={22} className="absolute -bottom-1.5 -right-1.5 opacity-70 drop-shadow" />
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="font-bold text-body-md text-nx-on-surface truncate">{p.paciente}</h3>
        <div className="mt-0.5 flex items-center gap-2 text-label-sm text-nx-on-surface-variant">
          <span className="font-semibold" style={{ color: ligaCor }}>{p.ligaNome ?? p.ligaLabel}</span>
          <span className="flex items-center gap-1 text-nx-danger"><CircleSlash size={12} /> {txt}</span>
        </div>
      </div>
      <button
        onClick={() => onChat(p.pacienteId)}
        className="shrink-0 flex items-center gap-2 rounded-xl border border-nx-border text-nx-on-surface font-bold px-4 py-2 text-body-sm transition-all hover:bg-nx-surface-hover active:scale-95"
      >
        <MessageCircle size={16} /> Conversar
      </button>
    </article>
  );
}

/* ───────── bottom sheet do Score ───────── */
function SheetRow({ icon: Icon, label, value, pct }: { icon: typeof Utensils; label: string; value: string; pct: number | null }) {
  const cor = pct == null ? "#E7E9EC" : scoreCor(pct).hex;
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Icon size={17} className="shrink-0 text-nx-on-surface-variant" />
      <span className="text-body-sm text-nx-on-surface w-24 shrink-0">{label}</span>
      {pct != null && (
        <div className="flex-1 h-1.5 rounded-full bg-nx-container-high overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: cor }} />
        </div>
      )}
      <span className="ml-auto text-body-sm font-bold shrink-0" style={{ color: cor }}>{value}</span>
    </div>
  );
}

function ScoreSheet({ reg, onClose }: { reg: Registro | null; onClose: () => void }) {
  const b = reg ? subScores(reg) : null;
  const sc = b ? scoreCor(b.final) : null;
  return (
    <BottomSheetNx open={!!reg} onClose={onClose} title="Score do dia" ariaLabel="Detalhes do score do dia">
      {reg && b && sc && (
        <div className="pb-1">
          {/* Cabeçalho: score grande + paciente */}
          <div className="flex items-center gap-3 pb-4">
            <div className={`grid place-items-center w-14 h-14 rounded-2xl border ${sc.ring} ${sc.bg}`}>
              <span className="text-headline-md font-extrabold leading-none" style={{ color: sc.hex }}>{b.final}</span>
            </div>
            <div className="min-w-0">
              <p className="font-bold text-body-md text-nx-on-surface truncate">{reg.paciente}</p>
              <p className="text-label-sm text-nx-on-surface-variant">
                {reg.ligaNome ?? reg.ligaLabel}{reg.ligaNivel ? ` ${reg.ligaNivel}` : ""} · check-in {reg.horario}
              </p>
            </div>
          </div>

          {/* Dimensões */}
          <div className="divide-y divide-nx-border rounded-xl border border-nx-border overflow-hidden">
            <SheetRow icon={Utensils} label="Alimentação" value={`${b.alimentacao}%`} pct={b.alimentacao} />
            <SheetRow icon={Droplet} label="Água" value={`${b.agua}%`} pct={b.agua} />
            <SheetRow icon={Moon} label="Sono" value={`${b.sono}%`} pct={b.sono} />
            <SheetRow icon={Dumbbell} label="Treino" value={reg.treino === "feito" ? "Feito" : "Não Feito"} pct={null} />
            <SheetRow icon={Smile} label="Humor" value={reg.humor ? (HUMOR_LABEL[reg.humor] ?? "—") : "—"} pct={null} />
            <SheetRow icon={CheckCircle2} label="Check-in" value={reg.habitosOk >= reg.habitosTotal ? "Completo" : "Incompleto"} pct={null} />
          </div>

          {/* Score Final */}
          <div className={`mt-4 flex items-center justify-between rounded-xl border px-4 py-3.5 ${sc.ring} ${sc.bg}`}>
            <span className="text-body-md font-bold text-nx-on-surface">Score Final</span>
            <span className="text-headline-md font-extrabold leading-none" style={{ color: sc.hex }}>{b.final}<span className="text-body-md text-nx-on-surface-variant font-semibold">/100</span></span>
          </div>
        </div>
      )}
    </BottomSheetNx>
  );
}

export default function Feed() {
  const navigate = useNavigate();
  const [sheetReg, setSheetReg] = useState<Registro | null>(null);
  const [data, setData] = useState<FeedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<FiltroId>("todos");

  const carregar = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    try {
      setData(await getRegistrosFeed());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void carregar(); }, [carregar]);

  /* ── pull-to-refresh (mobile) ── */
  const rootRef = useRef<HTMLDivElement>(null);
  const [pull, setPull] = useState(0);
  const startY = useRef(0);
  const pulling = useRef(false);
  const scroller = () => rootRef.current?.closest("main") ?? null;

  function onTouchStart(e: React.TouchEvent) {
    if ((scroller()?.scrollTop ?? 0) <= 0 && !refreshing) {
      startY.current = e.touches[0].clientY;
      pulling.current = true;
    }
  }
  function onTouchMove(e: React.TouchEvent) {
    if (!pulling.current) return;
    const dy = e.touches[0].clientY - startY.current;
    if (dy > 0 && (scroller()?.scrollTop ?? 0) <= 0) setPull(Math.min(80, dy * 0.5));
    else pulling.current = false;
  }
  function onTouchEnd() {
    if (pulling.current && pull > 55) void carregar(true);
    setPull(0);
    pulling.current = false;
  }

  /* ── filtros + busca ── */
  const registros = useMemo(() => {
    const list = data?.registros ?? [];
    const q = busca.trim().toLowerCase();
    return list.filter((r) => {
      if (filtro === "hoje" && !r.hoje) return false;
      if (filtro === "ontem" && !r.ontem) return false;
      if (filtro === "atencao" && subScores(r).final >= 85) return false;
      if (q && ![r.paciente, r.ligaNome ?? "", r.tipoTexto].some((s) => s.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [data, busca, filtro]);

  const semRegistro = useMemo(() => {
    const list = data?.semRegistro ?? [];
    const q = busca.trim().toLowerCase();
    return q ? list.filter((p) => p.paciente.toLowerCase().includes(q)) : list;
  }, [data, busca]);

  const counts = useMemo(() => {
    const rs = data?.registros ?? [];
    return {
      todos: rs.length,
      hoje: rs.filter((r) => r.hoje).length,
      ontem: rs.filter((r) => r.ontem).length,
      sem: data?.semRegistro.length ?? 0,
      atencao: rs.filter((r) => subScores(r).final < 85).length,
    } as Record<FiltroId, number>;
  }, [data]);

  const mostrarSem = filtro === "sem";
  const onChat = (pacienteId: string) => navigate(`/app/mensagens?paciente=${pacienteId}`);

  const vazio = mostrarSem ? semRegistro.length === 0 : registros.length === 0;

  return (
    <div
      ref={rootRef}
      className="min-h-screen bg-nx-bg-lowest text-nx-on-surface font-sans px-4 md:px-8 py-6"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Indicador de pull-to-refresh */}
      <div
        className="flex items-center justify-center overflow-hidden transition-[height] duration-150"
        style={{ height: refreshing ? 44 : pull }}
      >
        <RefreshCw
          size={20}
          className={`text-nx-evo ${refreshing ? "animate-spin" : ""}`}
          style={{ transform: refreshing ? undefined : `rotate(${pull * 4}deg)`, opacity: refreshing ? 1 : Math.min(1, pull / 40) }}
        />
      </div>

      <div className="mx-auto w-full max-w-7xl">
        {/* Header */}
        <header className="mb-4">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h1 className="text-headline-md font-bold text-nx-on-surface">Registros Diários</h1>
            <button
              onClick={() => carregar(true)}
              disabled={refreshing}
              aria-label="Atualizar"
              className="shrink-0 grid place-items-center w-9 h-9 rounded-xl border border-nx-border text-nx-on-surface-variant hover:bg-nx-surface-hover transition-colors disabled:opacity-50"
            >
              <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
            </button>
          </div>

          {/* Busca */}
          <div className="flex items-center gap-2 bg-nx-container-high px-3.5 py-2 rounded-xl border border-nx-border focus-within:ring-1 focus-within:ring-nx-evo transition-all">
            <Search size={16} className="text-nx-on-surface-variant shrink-0" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar paciente…"
              className="bg-transparent border-none focus:ring-0 text-body-sm w-full placeholder:text-nx-on-surface-variant/50 outline-none"
            />
          </div>

          {/* Filtros */}
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 no-scrollbar">
            {FILTROS.map((f) => {
              const ativo = filtro === f.id;
              return (
                <button
                  key={f.id}
                  onClick={() => setFiltro(f.id)}
                  className={`shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-label-md font-semibold transition-colors border ${
                    ativo
                      ? "bg-nx-evo text-nx-on-evo border-nx-evo"
                      : "bg-nx-surface text-nx-on-surface-variant border-nx-border hover:bg-nx-surface-hover"
                  }`}
                >
                  {f.label}
                  <span className={`text-label-sm ${ativo ? "text-nx-on-evo/70" : "text-nx-on-surface-variant/60"}`}>
                    {counts[f.id]}
                  </span>
                </button>
              );
            })}
          </div>
        </header>

        {/* Lista */}
        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => <div key={i} className="h-36 rounded-2xl bg-nx-surface border border-nx-border animate-pulse" />)}
          </div>
        ) : vazio ? (
          <div className="text-center text-body-sm text-nx-on-surface-variant py-16">
            {mostrarSem
              ? "Todos os seus pacientes registraram no período. 🎉"
              : busca || filtro !== "todos"
                ? "Nenhum registro corresponde ao filtro."
                : "Nenhum registro dos seus pacientes nos últimos 7 dias."}
          </div>
        ) : (
          <div className="space-y-3">
            {mostrarSem
              ? semRegistro.map((p) => <SemRegistroCard key={p.pacienteId} p={p} onChat={onChat} />)
              : registros.map((r) => <RegistroCard key={r.id} r={r} onChat={onChat} onScore={setSheetReg} />)}
          </div>
        )}
      </div>

      <ScoreSheet reg={sheetReg} onClose={() => setSheetReg(null)} />
    </div>
  );
}
