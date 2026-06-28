import { useEffect, useState, useCallback } from "react";
import { RefreshCw, Trophy, Target, Flame, CheckCircle, Settings, ChevronLeft, ChevronRight } from "lucide-react";
import api from "../lib/api";
import { Toast, useToast } from "../components/Toast";

// ─── Types ────────────────────────────────────────────────────────────────────

interface RankingItem {
  pacienteId: string;
  nome: string;
  pctObjetivoPeso: number;
  diasConsecutivosHabitos: number;
  metasSemanaisBatidas: number;
  pontuacaoTotal: number;
  posicaoRanking: number;
}

interface RankingConfig {
  pesoPesoMeta: number;
  pesoHabitosConsecutivos: number;
  pesoMetasSemanais: number;
  diasConsecutivosAlvo: number;
  metasSemanaisAlvo: number;
}

interface RankingResponse {
  periodo: string;
  semana: number | null;
  mes: number | null;
  ano: number;
  config: RankingConfig;
  ranking: RankingItem[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getISOWeek(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const jan1 = new Date(d.getFullYear(), 0, 1);
  return Math.ceil(((d.getTime() - jan1.getTime()) / 86400000 + 1) / 7);
}

const MESES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

function scoreColor(pts: number) {
  if (pts >= 80) return "#1C4A2E";
  if (pts >= 60) return "#4CAF82";
  if (pts >= 40) return "#F59E0B";
  return "#D1D5DB";
}

function medalEmoji(pos: number) {
  if (pos === 1) return "🥇";
  if (pos === 2) return "🥈";
  if (pos === 3) return "🥉";
  return null;
}

function getInitials(nome: string) {
  return nome.split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase();
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function Ranking() {
  const now = new Date();
  const [periodo, setPeriodo] = useState<"semanal" | "mensal">("semanal");
  const [semanaOffset, setSemanaOffset] = useState(0);
  const [mesOffset, setMesOffset]       = useState(0);
  const [data, setData]       = useState<RankingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [recalc, setRecalc]   = useState(false);
  const { toast, show, hide } = useToast();

  const semanaAtual = getISOWeek(now) + semanaOffset;
  const ano = now.getFullYear();
  const mesAtual = ((now.getMonth() + mesOffset % 12) + 12) % 12 + 1;

  const fetchRanking = useCallback(async () => {
    setLoading(true);
    try {
      const params = periodo === "semanal"
        ? `periodo=semanal&semana=${semanaAtual}&ano=${ano}`
        : `periodo=mensal&mes=${mesAtual}&ano=${ano}`;
      const res = await api.get<RankingResponse>(`/ranking?${params}`);
      setData(res.data);
    } catch {
      show("Erro ao carregar ranking.", "error");
    } finally {
      setLoading(false);
    }
  }, [periodo, semanaAtual, mesAtual, ano]);

  useEffect(() => { fetchRanking(); }, [fetchRanking]);

  async function handleRecalc() {
    setRecalc(true);
    try {
      const body = periodo === "semanal"
        ? { periodo, semana: semanaAtual, ano }
        : { periodo, mes: mesAtual, ano };
      await api.post("/ranking/atualizar", body);
      await fetchRanking();
      show("Ranking atualizado!");
    } catch {
      show("Erro ao recalcular.", "error");
    } finally {
      setRecalc(false);
    }
  }

  const periodoLabel = periodo === "semanal"
    ? `Semana ${semanaAtual}, ${ano}`
    : `${MESES[mesAtual - 1]} ${ano}`;

  return (
    <>
      {toast && <Toast message={toast.message} type={toast.type} onClose={hide} />}

      {/* ── MOBILE ── */}
      <div className="md:hidden min-h-screen bg-white pb-24">
        <MobileRanking
          data={data}
          loading={loading}
          periodo={periodo}
          periodoLabel={periodoLabel}
          setPeriodo={setPeriodo}
          onPrev={() => periodo === "semanal" ? setSemanaOffset(o => o - 1) : setMesOffset(o => o - 1)}
          onNext={() => periodo === "semanal" ? setSemanaOffset(o => o + 1) : setMesOffset(o => o + 1)}
          onRecalc={handleRecalc}
          recalc={recalc}
        />
      </div>

      {/* ── DESKTOP ── */}
      <div className="hidden md:block bg-[#F8F8F6] min-h-screen p-8">
        <DesktopRanking
          data={data}
          loading={loading}
          periodo={periodo}
          periodoLabel={periodoLabel}
          setPeriodo={setPeriodo}
          onPrev={() => periodo === "semanal" ? setSemanaOffset(o => o - 1) : setMesOffset(o => o - 1)}
          onNext={() => periodo === "semanal" ? setSemanaOffset(o => o + 1) : setMesOffset(o => o + 1)}
          onRecalc={handleRecalc}
          recalc={recalc}
          onConfigSaved={fetchRanking}
          show={show}
        />
      </div>
    </>
  );
}

// ─── Podium ───────────────────────────────────────────────────────────────────

function Podium({ top3 }: { top3: RankingItem[] }) {
  const order = [top3[1], top3[0], top3[2]].filter(Boolean);
  const heights = [top3[1] ? 64 : 0, 88, top3[2] ? 48 : 0];
  const colors  = ["#A0A0A0", "#D4A017", "#B87333"];
  const positions = [2, 1, 3];

  return (
    <div className="flex items-end justify-center gap-2 px-4 mb-6">
      {order.map((p, i) => {
        if (!p) return null;
        const h   = heights[i];
        const col = colors[i];
        const pos = positions[i];
        return (
          <div key={p.pacienteId} className="flex flex-col items-center gap-1.5 flex-1 max-w-[100px]">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-[15px] shadow-md border-2 border-white"
              style={{ backgroundColor: col }}
            >
              {getInitials(p.nome)}
            </div>
            <p className="text-[11px] font-semibold text-[#333] text-center leading-tight truncate w-full px-1">
              {p.nome.split(" ")[0]}
            </p>
            <p className="text-[13px] font-bold tabular-nums" style={{ color: col }}>
              {p.pontuacaoTotal}pts
            </p>
            <div
              className="w-full rounded-t-xl flex items-start justify-center pt-2"
              style={{ height: h, backgroundColor: col + "22", borderTop: `3px solid ${col}` }}
            >
              <span className="text-[18px]">{medalEmoji(pos)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Score bar ────────────────────────────────────────────────────────────────

function ScoreBar({ value, max = 100 }: { value: number; max?: number }) {
  const pct = Math.min((value / max) * 100, 100);
  const color = scoreColor(value);
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-[#F0F0EE] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-[11px] font-semibold tabular-nums w-7 text-right" style={{ color }}>
        {value}
      </span>
    </div>
  );
}

// ─── Ranking row ──────────────────────────────────────────────────────────────

function RankingRow({ item, showMetrics = false }: { item: RankingItem; showMetrics?: boolean }) {
  const medal = medalEmoji(item.posicaoRanking);
  const color = scoreColor(item.pontuacaoTotal);

  return (
    <div className="flex items-center gap-3 py-3 px-0">
      <div className="w-6 flex-shrink-0 text-center">
        {medal
          ? <span className="text-[16px]">{medal}</span>
          : <span className="text-[12px] font-bold text-[#bbb]">{item.posicaoRanking}</span>}
      </div>
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[12px] font-bold flex-shrink-0"
        style={{ backgroundColor: color }}
      >
        {getInitials(item.nome)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-medium text-[#111] truncate">{item.nome}</p>
        {showMetrics && (
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-[10px] text-[#999] flex items-center gap-0.5">
              <Target size={9} /> {item.pctObjetivoPeso}%
            </span>
            <span className="text-[10px] text-[#999] flex items-center gap-0.5">
              <Flame size={9} /> {item.diasConsecutivosHabitos}d
            </span>
            <span className="text-[10px] text-[#999] flex items-center gap-0.5">
              <CheckCircle size={9} /> {item.metasSemanaisBatidas}
            </span>
          </div>
        )}
      </div>
      <div className="w-24 flex-shrink-0">
        <ScoreBar value={item.pontuacaoTotal} />
      </div>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Trophy className="text-[#E0E0DE] mb-3" size={40} />
      <p className="text-[14px] font-medium text-[#999]">Nenhum paciente ainda</p>
      <p className="text-[12px] text-[#bbb] mt-1">O ranking aparece quando você tiver pacientes ativos com check-ins.</p>
    </div>
  );
}

// ─── Period nav ───────────────────────────────────────────────────────────────

function PeriodNav({
  periodo, periodoLabel, setPeriodo, onPrev, onNext,
}: {
  periodo: string;
  periodoLabel: string;
  setPeriodo: (p: "semanal" | "mensal") => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex gap-0.5 bg-[#F5F5F3] rounded-xl p-1 flex-shrink-0">
        {(["semanal", "mensal"] as const).map(p => (
          <button
            key={p}
            onClick={() => setPeriodo(p)}
            className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all ${
              periodo === p ? "bg-white text-[#111] shadow-sm" : "text-[#999]"
            }`}
          >
            {p === "semanal" ? "Semana" : "Mês"}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-1.5">
        <button onClick={onPrev} className="w-7 h-7 flex items-center justify-center rounded-full bg-[#F5F5F3] text-[#666]">
          <ChevronLeft size={14} />
        </button>
        <span className="text-[11px] text-[#999] min-w-[96px] text-center">{periodoLabel}</span>
        <button onClick={onNext} className="w-7 h-7 flex items-center justify-center rounded-full bg-[#F5F5F3] text-[#666]">
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

// ─── Mobile layout ────────────────────────────────────────────────────────────

function MobileRanking({
  data, loading, periodo, periodoLabel, setPeriodo,
  onPrev, onNext, onRecalc, recalc,
}: {
  data: RankingResponse | null;
  loading: boolean;
  periodo: string;
  periodoLabel: string;
  setPeriodo: (p: "semanal" | "mensal") => void;
  onPrev: () => void;
  onNext: () => void;
  onRecalc: () => void;
  recalc: boolean;
}) {
  const ranking = data?.ranking ?? [];

  return (
    <div>
      <div className="px-5 pt-10 pb-4 flex items-center justify-between">
        <h1 className="text-[26px] font-semibold text-[#111] tracking-tight">Ranking</h1>
        <button
          onClick={onRecalc}
          disabled={recalc}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-[#F5F5F3] text-[#666] disabled:opacity-40"
        >
          <RefreshCw size={15} className={recalc ? "animate-spin" : ""} />
        </button>
      </div>

      <div className="px-5 mb-5">
        <PeriodNav periodo={periodo} periodoLabel={periodoLabel} setPeriodo={setPeriodo} onPrev={onPrev} onNext={onNext} />
      </div>

      {loading ? (
        <div className="px-5 space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-14 bg-[#F5F5F3] rounded-2xl animate-pulse" />)}
        </div>
      ) : ranking.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {ranking.length >= 2 && <Podium top3={ranking.slice(0, 3)} />}
          <div className="px-5 divide-y divide-[#F5F5F3]">
            {ranking.map(item => <RankingRow key={item.pacienteId} item={item} />)}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Config panel ─────────────────────────────────────────────────────────────

function ConfigPanel({
  config: initial, onSaved, show,
}: {
  config: RankingConfig;
  onSaved: () => void;
  show: (msg: string, type?: "success" | "error") => void;
}) {
  const [cfg, setCfg]     = useState(initial);
  const [saving, setSaving] = useState(false);

  useEffect(() => setCfg(initial), [initial]);

  const total = cfg.pesoPesoMeta + cfg.pesoHabitosConsecutivos + cfg.pesoMetasSemanais;

  async function salvar() {
    if (total !== 100) { show("Os pesos devem somar 100.", "error"); return; }
    setSaving(true);
    try {
      await api.put("/ranking/config", cfg);
      show("Configuração salva!");
      onSaved();
    } catch {
      show("Erro ao salvar.", "error");
    } finally {
      setSaving(false);
    }
  }

  function setWeight(key: keyof RankingConfig, val: number) {
    setCfg(c => ({ ...c, [key]: val }));
  }

  return (
    <div className="bg-white rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-5">
      <div className="flex items-center gap-2 mb-5">
        <Settings size={14} className="text-[#bbb]" />
        <p className="text-[13px] font-semibold text-[#111]">Configuração dos pesos</p>
      </div>

      <div className="space-y-4">
        {[
          { key: "pesoPesoMeta",            label: "% Objetivo de peso",    icon: <Target size={12} /> },
          { key: "pesoHabitosConsecutivos",  label: "Hábitos consecutivos",  icon: <Flame size={12} /> },
          { key: "pesoMetasSemanais",        label: "Metas semanais",        icon: <CheckCircle size={12} /> },
        ].map(({ key, label, icon }) => (
          <div key={key}>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5 text-[#666]">
                {icon}
                <span className="text-[12px]">{label}</span>
              </div>
              <span className="text-[13px] font-semibold text-[#111] tabular-nums w-8 text-right">
                {cfg[key as keyof RankingConfig]}%
              </span>
            </div>
            <input
              type="range"
              min={0} max={100} step={5}
              value={cfg[key as keyof RankingConfig] as number}
              onChange={e => setWeight(key as keyof RankingConfig, parseInt(e.target.value))}
              className="w-full accent-[#1C4A2E] h-1"
            />
          </div>
        ))}

        <div className={`text-[11px] font-medium text-right ${total === 100 ? "text-[#1C4A2E]" : "text-red-400"}`}>
          Total: {total}% {total !== 100 ? "(deve ser 100)" : "✓"}
        </div>

        <div className="pt-1 border-t border-[#F5F5F3] space-y-3">
          <p className="text-[11px] text-[#bbb] font-medium pt-1">Thresholds</p>
          <div className="flex items-center justify-between">
            <span className="text-[12px] text-[#666]">Dias consecutivos alvo</span>
            <input
              type="number" min={1} max={90}
              value={cfg.diasConsecutivosAlvo}
              onChange={e => setCfg(c => ({ ...c, diasConsecutivosAlvo: parseInt(e.target.value) || 1 }))}
              className="w-14 text-center px-2 py-1 border border-[#E8E8E8] rounded-lg text-[13px] text-[#111] focus:outline-none"
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[12px] text-[#666]">Metas semanais alvo/mês</span>
            <input
              type="number" min={1} max={8}
              value={cfg.metasSemanaisAlvo}
              onChange={e => setCfg(c => ({ ...c, metasSemanaisAlvo: parseInt(e.target.value) || 1 }))}
              className="w-14 text-center px-2 py-1 border border-[#E8E8E8] rounded-lg text-[13px] text-[#111] focus:outline-none"
            />
          </div>
        </div>
      </div>

      <button
        onClick={salvar}
        disabled={saving || total !== 100}
        className="mt-5 w-full py-2.5 bg-[#1C4A2E] text-white text-[13px] font-semibold rounded-xl hover:bg-[#2D6A4F] disabled:opacity-40 transition-colors"
      >
        {saving ? "Salvando..." : "Salvar configuração"}
      </button>
    </div>
  );
}

// ─── Desktop layout ───────────────────────────────────────────────────────────

function DesktopRanking({
  data, loading, periodo, periodoLabel,
  setPeriodo, onPrev, onNext, onRecalc, recalc, onConfigSaved, show,
}: {
  data: RankingResponse | null;
  loading: boolean;
  periodo: string;
  periodoLabel: string;
  setPeriodo: (p: "semanal" | "mensal") => void;
  onPrev: () => void;
  onNext: () => void;
  onRecalc: () => void;
  recalc: boolean;
  onConfigSaved: () => void;
  show: (msg: string, type?: "success" | "error") => void;
}) {
  const ranking = data?.ranking ?? [];
  const defaultConfig: RankingConfig = { pesoPesoMeta: 40, pesoHabitosConsecutivos: 30, pesoMetasSemanais: 30, diasConsecutivosAlvo: 7, metasSemanaisAlvo: 4 };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-[22px] font-semibold text-[#111] tracking-tight">Ranking de pacientes</h1>
        <div className="flex items-center gap-3">
          <PeriodNav periodo={periodo} periodoLabel={periodoLabel} setPeriodo={setPeriodo} onPrev={onPrev} onNext={onNext} />
          <button
            onClick={onRecalc}
            disabled={recalc}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#1C4A2E] text-white text-[13px] font-medium rounded-xl hover:bg-[#2D6A4F] disabled:opacity-50 transition-colors"
          >
            <RefreshCw size={13} className={recalc ? "animate-spin" : ""} />
            Recalcular
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-5">

        {/* Left — ranking list (2/3) */}
        <div className="col-span-2 bg-white rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-6">
          {loading ? (
            <div className="space-y-4">
              {[1,2,3,4,5].map(i => <div key={i} className="h-12 bg-[#F8F8F6] rounded-xl animate-pulse" />)}
            </div>
          ) : ranking.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              {ranking.length >= 2 && <Podium top3={ranking.slice(0, 3)} />}

              {/* Legend */}
              <div className="flex items-center gap-5 mb-4 text-[11px] text-[#bbb]">
                <div className="flex items-center gap-1.5"><Target size={11} /> % meta de peso</div>
                <div className="flex items-center gap-1.5"><Flame size={11} /> dias consecutivos</div>
                <div className="flex items-center gap-1.5"><CheckCircle size={11} /> metas semanais</div>
              </div>

              <div className="divide-y divide-[#F8F8F6]">
                {ranking.map(item => (
                  <RankingRow key={item.pacienteId} item={item} showMetrics />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Right — config (1/3) */}
        <div className="flex flex-col gap-4">
          <ConfigPanel
            config={data?.config ?? defaultConfig}
            onSaved={onConfigSaved}
            show={show}
          />

          {/* Legenda de pontuação */}
          <div className="bg-white rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-5">
            <p className="text-[13px] font-semibold text-[#111] mb-4">Legenda de pontuação</p>
            <div className="space-y-2.5">
              {[
                { label: "Elite",    range: "80–100", color: "#1C4A2E" },
                { label: "Ótimo",    range: "60–79",  color: "#4CAF82" },
                { label: "Regular",  range: "40–59",  color: "#F59E0B" },
                { label: "Iniciando",range: "0–39",   color: "#D1D5DB" },
              ].map(({ label, range, color }) => (
                <div key={label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                    <span className="text-[12px] text-[#666]">{label}</span>
                  </div>
                  <span className="text-[11px] text-[#bbb] tabular-nums">{range} pts</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
