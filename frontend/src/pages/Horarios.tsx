import { useEffect, useRef, useState } from "react";
import { Clock, Check, ChevronLeft, ChevronRight, X, Search } from "lucide-react";
import { format, addDays, isSameDay, startOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import api from "../lib/api";
import { Toast, useToast } from "../components/Toast";

// ─── Shared types & constants ─────────────────────────────────────────────────

interface Horario {
  id: string;
  diaSemana: number;
  hora: string;
  ativo: boolean;
  duracaoMinutos: number;
}

interface Consulta {
  id: string;
  pacienteId: string;
  paciente: { id: string; nome: string };
  data: string;
  status: string;
  tipo: string;
  notas?: string;
}

interface Paciente {
  id: string;
  nome: string;
}

const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const DIAS_FULL = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];

const HORAS: string[] = [];
for (let h = 7; h <= 20; h++) {
  HORAS.push(`${String(h).padStart(2, "0")}:00`);
  if (h < 20) HORAS.push(`${String(h).padStart(2, "0")}:30`);
}

const TIPOS = [
  { value: "primeira_consulta", label: "Primeira consulta" },
  { value: "retorno", label: "Retorno" },
  { value: "online", label: "Online" },
];

const TIPO_CFG: Record<string, { label: string; bg: string; border: string; text: string }> = {
  primeira_consulta: { label: "1ª Consulta", bg: "bg-blue-500",    border: "border-blue-600",   text: "text-white" },
  retorno:           { label: "Retorno",     bg: "bg-zena-green-mid", border: "border-zena-green-dark", text: "text-white" },
  online:            { label: "Online",      bg: "bg-purple-500",  border: "border-purple-600", text: "text-white" },
  consulta:          { label: "Consulta",    bg: "bg-teal-500",    border: "border-teal-600",   text: "text-white" },
};

const ROW_H = 48; // px per 30-min slot

// ─── Root component ───────────────────────────────────────────────────────────

export default function Horarios() {
  const [aba, setAba] = useState<"disponibilidade" | "calendario">("disponibilidade");
  const [horarios, setHorarios] = useState<Horario[]>([]);
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [loadingHorarios, setLoadingHorarios] = useState(true);
  const { toast, show, hide } = useToast();

  useEffect(() => {
    api.get("/horarios").then((r) => { setHorarios(r.data); setLoadingHorarios(false); });
    api.get("/pacientes?limit=1000").then((r) => setPacientes(r.data.data));
  }, []);

  return (
    <div className="p-4 sm:p-8">
      {toast && <Toast message={toast.message} type={toast.type} onClose={hide} />}

      <div className="mb-6">
        <h1 className="text-zena-text-dark text-3xl font-bold">Agenda</h1>
        <p className="text-zena-text-light text-sm mt-1">Gerencie sua disponibilidade e consultas agendadas.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-zena-cream rounded-xl p-1 w-fit mb-6">
        {(["disponibilidade", "calendario"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setAba(t)}
            className={`px-5 py-2 rounded-lg text-sm font-medium capitalize transition-all ${
              aba === t ? "bg-white text-zena-text-dark shadow-sm" : "text-zena-text-light hover:text-zena-text-mid"
            }`}
          >
            {t === "disponibilidade" ? "Disponibilidade" : "Calendário"}
          </button>
        ))}
      </div>

      {aba === "disponibilidade" ? (
        <AbaDisponibilidade
          horarios={horarios}
          setHorarios={setHorarios}
          loading={loadingHorarios}
          show={show}
        />
      ) : (
        <AbaCalendario
          horarios={horarios}
          pacientes={pacientes}
          show={show}
        />
      )}
    </div>
  );
}

// ─── Aba Disponibilidade ──────────────────────────────────────────────────────

function AbaDisponibilidade({
  horarios, setHorarios, loading, show,
}: {
  horarios: Horario[];
  setHorarios: React.Dispatch<React.SetStateAction<Horario[]>>;
  loading: boolean;
  show: (msg: string, type?: "error") => void;
}) {
  const [salvando, setSalvando] = useState<string | null>(null);
  const [duracao, setDuracao] = useState(60);

  function isAtivo(dia: number, hora: string) {
    return horarios.some((h) => h.diaSemana === dia && h.hora === hora && h.ativo);
  }

  function getHorario(dia: number, hora: string) {
    return horarios.find((h) => h.diaSemana === dia && h.hora === hora);
  }

  async function toggleSlot(dia: number, hora: string) {
    const key = `${dia}-${hora}`;
    setSalvando(key);
    const existente = getHorario(dia, hora);
    try {
      if (existente) {
        await api.delete(`/horarios/${existente.id}`);
        setHorarios((prev) => prev.filter((h) => h.id !== existente.id));
      } else {
        const res = await api.post("/horarios", { diaSemana: dia, hora, duracaoMinutos: duracao });
        setHorarios((prev) => [...prev, res.data]);
      }
    } catch {
      show("Erro ao atualizar horário.", "error");
    } finally {
      setSalvando(null);
    }
  }

  const totalAtivos = horarios.filter((h) => h.ativo).length;

  return (
    <>
      <div className="bg-white rounded-2xl p-5 border border-zena-mint/30 shadow-sm mb-6 flex items-center gap-6 flex-wrap">
        <div className="flex items-center gap-3">
          <Clock size={18} className="text-zena-green-mid" />
          <span className="text-zena-text-dark font-medium text-sm">Duração da consulta:</span>
          <div className="flex gap-2">
            {[30, 45, 60, 90].map((min) => (
              <button
                key={min}
                onClick={() => setDuracao(min)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  duracao === min ? "bg-zena-green-mid text-white" : "bg-zena-cream text-zena-text-mid hover:bg-zena-mint/30"
                }`}
              >
                {min}min
              </button>
            ))}
          </div>
        </div>
        <div className="ml-auto text-zena-text-light text-sm">
          <span className="font-semibold text-zena-green-mid">{totalAtivos}</span> slots ativos
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl p-4 sm:p-8 border border-zena-mint/30 animate-pulse overflow-x-auto">
          <div className="grid grid-cols-8 gap-2 min-w-[480px]">
            {Array.from({ length: 56 }).map((_, i) => <div key={i} className="h-9 bg-zena-mint/20 rounded-lg" />)}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-zena-mint/30 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
          <div className="grid grid-cols-8 border-b border-zena-cream min-w-[480px]">
            <div className="p-4 text-zena-text-light text-xs font-medium text-center">Horário</div>
            {DIAS_SEMANA.map((d, i) => (
              <div key={i} className="p-4 text-center">
                <p className="text-zena-text-dark font-semibold text-sm">{d}</p>
                <p className="text-zena-text-light text-xs">{i === 0 || i === 6 ? "fim de sem." : ""}</p>
              </div>
            ))}
          </div>
          <div className="max-h-[60vh] overflow-y-auto">
            {HORAS.map((hora) => (
              <div key={hora} className="grid grid-cols-8 border-b border-zena-cream/60 hover:bg-zena-cream/30 transition-colors min-w-[480px]">
                <div className="px-4 py-2 text-zena-text-light text-xs font-mono-data flex items-center justify-center">{hora}</div>
                {DIAS_SEMANA.map((_, diaIdx) => {
                  const ativo = isAtivo(diaIdx, hora);
                  const key = `${diaIdx}-${hora}`;
                  const carregando = salvando === key;
                  const fimDeSemana = diaIdx === 0 || diaIdx === 6;
                  return (
                    <div key={diaIdx} className="px-2 py-1.5 flex items-center justify-center">
                      <button
                        onClick={() => toggleSlot(diaIdx, hora)}
                        disabled={carregando}
                        className={`w-full h-8 rounded-lg text-xs font-medium transition-all ${
                          ativo
                            ? "bg-zena-green-mid text-white shadow-sm hover:bg-zena-green-dark"
                            : fimDeSemana
                            ? "bg-zena-sand text-zena-text-light hover:bg-zena-mint/30"
                            : "bg-zena-cream text-zena-text-light hover:bg-zena-mint/30 hover:text-zena-green-mid"
                        } ${carregando ? "opacity-50 cursor-wait" : ""}`}
                      >
                        {ativo && <Check size={12} className="mx-auto" />}
                      </button>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
          </div>
        </div>
      )}

      <div className="mt-4 flex items-center gap-6 text-xs text-zena-text-light">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-zena-green-mid" />
          <span>Disponível</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-zena-cream border border-zena-mint/30" />
          <span>Indisponível (clique para ativar)</span>
        </div>
      </div>
    </>
  );
}

// ─── Aba Calendário ───────────────────────────────────────────────────────────

function getWeekStart(offset: number): Date {
  const base = startOfWeek(new Date(), { weekStartsOn: 1 }); // Monday
  return addDays(base, offset * 7);
}

function timeToSlotIdx(date: Date): number {
  return (date.getHours() - 7) * 2 + (date.getMinutes() >= 30 ? 1 : 0);
}

function AbaCalendario({
  horarios, pacientes, show,
}: {
  horarios: Horario[];
  pacientes: Paciente[];
  show: (msg: string, type?: "error") => void;
}) {
  const [offset, setOffset] = useState(0);
  const [consultas, setConsultas] = useState<Consulta[]>([]);
  const [loadingCal, setLoadingCal] = useState(true);
  const [modalAgendar, setModalAgendar] = useState<{ data: Date } | null>(null);
  const [modalConsulta, setModalConsulta] = useState<Consulta | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const hScrollRef = useRef<HTMLDivElement>(null);

  const weekStart = getWeekStart(offset);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const today = new Date();

  const inicioStr = format(weekStart, "yyyy-MM-dd");
  const fimStr = format(weekDays[6], "yyyy-MM-dd");

  async function carregarConsultas() {
    setLoadingCal(true);
    try {
      const res = await api.get(`/consultas?inicio=${inicioStr}&fim=${fimStr}`);
      setConsultas(res.data);
    } catch {
      show("Erro ao carregar consultas.", "error");
    } finally {
      setLoadingCal(false);
    }
  }

  useEffect(() => {
    carregarConsultas();
    setTimeout(() => {
      // Scroll vertical para 07:30
      scrollRef.current?.scrollTo({ top: ROW_H * 1, behavior: "smooth" });
      // Scroll horizontal para mostrar o dia de hoje (Mon=0 … Sun=6)
      if (offset === 0) {
        const dayIdx = (today.getDay() + 6) % 7; // domingo=6, segunda=0
        if (dayIdx > 2 && hScrollRef.current) {
          const colW = 90;
          hScrollRef.current.scrollTo({ left: (dayIdx - 2) * colW, behavior: "smooth" });
        }
      }
    }, 120);
  }, [offset]);

  function isSlotAvailable(dayDate: Date, hora: string): boolean {
    return horarios.some((h) => h.diaSemana === dayDate.getDay() && h.hora === hora && h.ativo);
  }

  function consultasNoDia(dayDate: Date): Consulta[] {
    return consultas.filter(
      (c) => c.status !== "cancelada" && isSameDay(new Date(c.data), dayDate)
    );
  }

  function handleCellClick(dayDate: Date, hora: string) {
    const [h, m] = hora.split(":").map(Number);
    const dt = new Date(dayDate);
    dt.setHours(h, m, 0, 0);
    setModalAgendar({ data: dt });
  }

  async function agendarConsulta(pacienteId: string, data: Date, tipo: string) {
    try {
      const res = await api.post("/consultas", {
        pacienteId,
        data: data.toISOString(),
        tipo,
      });
      setConsultas((prev) => [...prev, res.data]);
      show("Consulta agendada!");
      setModalAgendar(null);
    } catch {
      show("Erro ao agendar consulta.", "error");
    }
  }

  async function cancelarConsulta(id: string) {
    try {
      await api.patch(`/consultas/${id}`, { status: "cancelada" });
      setConsultas((prev) => prev.map((c) => c.id === id ? { ...c, status: "cancelada" } : c));
      show("Consulta cancelada.");
      setModalConsulta(null);
    } catch {
      show("Erro ao cancelar.", "error");
    }
  }

  async function remarcarConsulta(id: string, novaData: Date) {
    try {
      const res = await api.patch(`/consultas/${id}`, { data: novaData.toISOString() });
      setConsultas((prev) => prev.map((c) => c.id === id ? res.data : c));
      show("Consulta remarcada!");
      setModalConsulta(null);
    } catch {
      show("Erro ao remarcar.", "error");
    }
  }

  const mesesLabel = () => {
    const s = format(weekStart, "MMM", { locale: ptBR });
    const e = format(weekDays[6], "MMM", { locale: ptBR });
    const ano = format(weekStart, "yyyy");
    return s === e ? `${s.charAt(0).toUpperCase() + s.slice(1)} ${ano}` : `${s}–${e} ${ano}`;
  };

  return (
    <>
      {/* Navegação */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setOffset((o) => o - 1)}
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-zena-mint/40 bg-white hover:bg-zena-cream text-zena-text-mid transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="text-zena-text-dark font-semibold text-base min-w-[160px] text-center">{mesesLabel()}</span>
          <button
            onClick={() => setOffset((o) => o + 1)}
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-zena-mint/40 bg-white hover:bg-zena-cream text-zena-text-mid transition-colors"
          >
            <ChevronRight size={18} />
          </button>
        </div>
        {offset !== 0 && (
          <button
            onClick={() => setOffset(0)}
            className="text-xs text-zena-green-mid font-medium hover:underline"
          >
            Hoje
          </button>
        )}
      </div>

      {/* Grid do calendário */}
      <div className="bg-white rounded-2xl border border-zena-mint/30 shadow-sm overflow-hidden">
        <div ref={hScrollRef} className="overflow-x-auto">
        {/* Header de dias */}
        <div className="grid border-b border-zena-cream" style={{ gridTemplateColumns: "64px repeat(7, minmax(80px, 1fr))" }}>
          <div className="p-3" />
          {weekDays.map((day, i) => {
            const isToday = isSameDay(day, today);
            return (
              <div
                key={i}
                className={`p-3 text-center border-l border-zena-cream/60 ${isToday ? "bg-zena-green-dark/8" : ""}`}
              >
                <p className={`text-xs font-semibold ${isToday ? "text-zena-green-dark" : "text-zena-text-light"}`}>
                  {format(day, "EEE", { locale: ptBR }).toUpperCase()}
                </p>
                <div className={`w-8 h-8 mx-auto flex items-center justify-center rounded-full mt-1 ${
                  isToday ? "bg-zena-green-dark" : ""
                }`}>
                  <p className={`text-base font-bold leading-none ${isToday ? "text-white" : "text-zena-text-dark"}`}>
                    {format(day, "d")}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Corpo com scroll */}
        <div
          ref={scrollRef}
          className="overflow-y-auto"
          style={{ maxHeight: "calc(100vh - 320px)", minHeight: "400px" }}
        >
          {loadingCal ? (
            <div className="flex items-center justify-center h-64 text-zena-text-light text-sm">
              Carregando consultas...
            </div>
          ) : (
            <div className="relative" style={{ display: "grid", gridTemplateColumns: "64px repeat(7, minmax(80px, 1fr))" }}>
              {/* Coluna de horas */}
              <div className="sticky left-0 bg-white z-10">
                {HORAS.map((hora) => (
                  <div
                    key={hora}
                    className="flex items-start justify-end pr-3 text-[10px] text-zena-text-light font-mono-data"
                    style={{ height: `${ROW_H}px`, paddingTop: "4px" }}
                  >
                    {hora.endsWith(":00") ? hora : ""}
                  </div>
                ))}
              </div>

              {/* Colunas de dia */}
              {weekDays.map((day, dayIdx) => {
                const isToday = isSameDay(day, today);
                const consultasDia = consultasNoDia(day);

                return (
                  <div
                    key={dayIdx}
                    className={`relative border-l border-zena-cream/60 ${isToday ? "bg-zena-green-light/5" : ""}`}
                    style={{ height: `${HORAS.length * ROW_H}px` }}
                  >
                    {/* Linhas de hora e backgrounds de disponibilidade */}
                    {HORAS.map((hora, slotIdx) => {
                      const disponivel = isSlotAvailable(day, hora);
                      const isOnHour = hora.endsWith(":00");
                      return (
                        <div
                          key={hora}
                          onClick={() => handleCellClick(day, hora)}
                          title={disponivel ? `Agendar ${hora}` : undefined}
                          className={`absolute left-0 right-0 cursor-pointer transition-colors ${
                            disponivel
                              ? "bg-zena-green-light/15 hover:bg-zena-green-light/30"
                              : "hover:bg-zena-cream/40"
                          }`}
                          style={{
                            top: `${slotIdx * ROW_H}px`,
                            height: `${ROW_H}px`,
                            borderTop: isOnHour ? "1px solid rgb(var(--color-zena-cream) / 0.8)" : "1px solid rgb(var(--color-zena-cream) / 0.3)",
                          }}
                        />
                      );
                    })}

                    {/* Blocos de consulta */}
                    {consultasDia.map((c) => {
                      const dt = new Date(c.data);
                      const slotIdx = timeToSlotIdx(dt);
                      if (slotIdx < 0 || slotIdx >= HORAS.length) return null;
                      const cfg = TIPO_CFG[c.tipo] || TIPO_CFG.consulta;
                      const duracaoSlots = 2; // 60min = 2 slots de 30min
                      return (
                        <div
                          key={c.id}
                          onClick={(e) => { e.stopPropagation(); setModalConsulta(c); }}
                          className={`absolute left-1 right-1 rounded-lg px-2 py-1 cursor-pointer z-10 ${cfg.bg} ${cfg.text} shadow-sm hover:opacity-90 transition-opacity overflow-hidden border-l-2 ${cfg.border}`}
                          style={{
                            top: `${slotIdx * ROW_H + 2}px`,
                            height: `${duracaoSlots * ROW_H - 4}px`,
                          }}
                        >
                          <p className="text-[11px] font-bold truncate leading-tight">{c.paciente.nome}</p>
                          <p className="text-[10px] opacity-80 truncate">{cfg.label} · {format(dt, "HH:mm")}</p>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </div>
        </div>
      </div>

      {/* Legenda */}
      <div className="mt-4 flex items-center gap-5 flex-wrap text-xs text-zena-text-light">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-zena-green-light/30 border border-zena-green-light/50" />
          <span>Slot disponível</span>
        </div>
        {Object.entries(TIPO_CFG).map(([k, v]) => (
          <div key={k} className="flex items-center gap-1.5">
            <div className={`w-4 h-4 rounded ${v.bg}`} />
            <span>{v.label}</span>
          </div>
        ))}
      </div>

      {/* Modal agendar */}
      {modalAgendar && (
        <ModalAgendar
          data={modalAgendar.data}
          pacientes={pacientes}
          onClose={() => setModalAgendar(null)}
          onConfirm={agendarConsulta}
        />
      )}

      {/* Modal consulta existente */}
      {modalConsulta && (
        <ModalConsulta
          consulta={modalConsulta}
          onClose={() => setModalConsulta(null)}
          onCancelar={cancelarConsulta}
          onRemarcar={remarcarConsulta}
        />
      )}
    </>
  );
}

// ─── Modal Agendar ────────────────────────────────────────────────────────────

function ModalAgendar({
  data, pacientes, onClose, onConfirm,
}: {
  data: Date;
  pacientes: Paciente[];
  onClose: () => void;
  onConfirm: (pacienteId: string, data: Date, tipo: string) => void;
}) {
  const [busca, setBusca] = useState("");
  const [pacienteId, setPacienteId] = useState("");
  const [tipo, setTipo] = useState("retorno");
  const [hora, setHora] = useState(format(data, "HH:mm"));
  const [saving, setSaving] = useState(false);

  const filtrados = pacientes.filter((p) => p.nome.toLowerCase().includes(busca.toLowerCase()));

  async function confirmar() {
    if (!pacienteId) return;
    setSaving(true);
    const [h, m] = hora.split(":").map(Number);
    const dt = new Date(data);
    dt.setHours(h, m, 0, 0);
    await onConfirm(pacienteId, dt, tipo);
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl">
        <div className="flex items-center justify-between px-6 py-5 border-b border-zena-cream">
          <div>
            <h2 className="text-zena-text-dark font-semibold text-lg">Agendar consulta</h2>
            <p className="text-zena-text-light text-xs mt-0.5">
              {format(data, "EEEE, d 'de' MMMM", { locale: ptBR })}
            </p>
          </div>
          <button onClick={onClose} className="text-zena-text-light hover:text-zena-text-dark"><X size={20} /></button>
        </div>
        <div className="p-6 space-y-4">
          {/* Hora */}
          <div>
            <label className="block text-zena-text-dark text-sm font-medium mb-1.5">Horário</label>
            <select
              value={hora}
              onChange={(e) => setHora(e.target.value)}
              className="w-full px-3 py-2.5 border border-zena-mint/40 rounded-xl text-sm text-zena-text-dark focus:outline-none focus:ring-2 focus:ring-zena-green-light"
            >
              {HORAS.map((h) => <option key={h} value={h}>{h}</option>)}
            </select>
          </div>

          {/* Paciente */}
          <div>
            <label className="block text-zena-text-dark text-sm font-medium mb-1.5">Paciente</label>
            <div className="relative mb-2">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zena-text-light" />
              <input
                type="text"
                placeholder="Buscar paciente..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                autoFocus
                className="w-full pl-9 pr-3 py-2 border border-zena-mint/40 rounded-xl text-sm text-zena-text-dark focus:outline-none focus:ring-2 focus:ring-zena-green-light"
              />
            </div>
            <div className="max-h-40 overflow-y-auto border border-zena-mint/30 rounded-xl divide-y divide-zena-cream">
              {filtrados.length === 0 ? (
                <p className="text-center text-zena-text-light text-xs py-3">Nenhuma encontrada</p>
              ) : filtrados.map((p) => (
                <button
                  key={p.id}
                  onClick={() => { setPacienteId(p.id); setBusca(p.nome); }}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                    pacienteId === p.id
                      ? "bg-zena-green-light/20 text-zena-green-dark font-medium"
                      : "hover:bg-zena-cream text-zena-text-dark"
                  }`}
                >
                  {p.nome}
                </button>
              ))}
            </div>
          </div>

          {/* Tipo */}
          <div>
            <label className="block text-zena-text-dark text-sm font-medium mb-1.5">Tipo</label>
            <div className="flex gap-2 flex-wrap">
              {TIPOS.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setTipo(t.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                    tipo === t.value
                      ? `${TIPO_CFG[t.value].bg} ${TIPO_CFG[t.value].text} border-transparent`
                      : "border-zena-mint/40 text-zena-text-mid hover:bg-zena-cream"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-3 px-6 py-5 border-t border-zena-cream">
          <button onClick={onClose} className="flex-1 py-2.5 border border-zena-mint/40 text-zena-text-mid rounded-xl text-sm hover:bg-zena-cream">
            Cancelar
          </button>
          <button
            onClick={confirmar}
            disabled={!pacienteId || saving}
            className="flex-1 py-2.5 bg-zena-green-mid text-white rounded-xl text-sm font-semibold hover:bg-zena-green-dark disabled:opacity-50"
          >
            {saving ? "Agendando..." : "Confirmar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal Consulta existente ─────────────────────────────────────────────────

function ModalConsulta({
  consulta, onClose, onCancelar, onRemarcar,
}: {
  consulta: Consulta;
  onClose: () => void;
  onCancelar: (id: string) => void;
  onRemarcar: (id: string, novaData: Date) => void;
}) {
  const [remarcar, setRemarcar] = useState(false);
  const [novaData, setNovaData] = useState(format(new Date(consulta.data), "yyyy-MM-dd"));
  const [novaHora, setNovaHora] = useState(format(new Date(consulta.data), "HH:mm"));
  const [confirmCancel, setConfirmCancel] = useState(false);
  const cfg = TIPO_CFG[consulta.tipo] || TIPO_CFG.consulta;
  const dt = new Date(consulta.data);

  function confirmarReagendar() {
    const [h, m] = novaHora.split(":").map(Number);
    const d = new Date(novaData + "T00:00:00");
    d.setHours(h, m, 0, 0);
    onRemarcar(consulta.id, d);
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl">
        <div className="flex items-center justify-between px-6 py-5 border-b border-zena-cream">
          <h2 className="text-zena-text-dark font-semibold text-lg">Consulta agendada</h2>
          <button onClick={onClose} className="text-zena-text-light hover:text-zena-text-dark"><X size={20} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${cfg.bg} flex items-center justify-center flex-shrink-0`}>
              <span className="text-white font-bold text-sm">{consulta.paciente.nome[0]}</span>
            </div>
            <div>
              <p className="text-zena-text-dark font-semibold">{consulta.paciente.nome}</p>
              <p className="text-zena-text-light text-xs">{cfg.label}</p>
            </div>
          </div>
          <div className="bg-zena-cream rounded-xl p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-zena-text-light">Data</span>
              <span className="text-zena-text-dark font-medium">
                {format(dt, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zena-text-light">Horário</span>
              <span className="text-zena-text-dark font-medium">{format(dt, "HH:mm")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zena-text-light">Status</span>
              <span className={`font-medium ${consulta.status === "cancelada" ? "text-red-500" : "text-zena-green-mid"}`}>
                {consulta.status.charAt(0).toUpperCase() + consulta.status.slice(1)}
              </span>
            </div>
          </div>

          {remarcar && (
            <div className="space-y-3 border border-zena-mint/40 rounded-xl p-4">
              <p className="text-zena-text-dark text-sm font-medium">Nova data e hora</p>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={novaData}
                  onChange={(e) => setNovaData(e.target.value)}
                  className="flex-1 px-3 py-2 border border-zena-mint/40 rounded-lg text-sm text-zena-text-dark focus:outline-none focus:ring-2 focus:ring-zena-green-light"
                />
                <select
                  value={novaHora}
                  onChange={(e) => setNovaHora(e.target.value)}
                  className="px-3 py-2 border border-zena-mint/40 rounded-lg text-sm text-zena-text-dark focus:outline-none focus:ring-2 focus:ring-zena-green-light"
                >
                  {HORAS.map((h) => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setRemarcar(false)} className="flex-1 py-2 border border-zena-mint/40 text-zena-text-mid rounded-lg text-sm hover:bg-zena-cream">
                  Voltar
                </button>
                <button onClick={confirmarReagendar} className="flex-1 py-2 bg-zena-green-mid text-white rounded-lg text-sm font-semibold hover:bg-zena-green-dark">
                  Salvar
                </button>
              </div>
            </div>
          )}

          {confirmCancel && (
            <div className="border border-red-200 rounded-xl p-4 bg-red-50 space-y-3">
              <p className="text-red-700 text-sm font-medium">Confirmar cancelamento?</p>
              <p className="text-red-600 text-xs">Esta ação não pode ser desfeita.</p>
              <div className="flex gap-2">
                <button onClick={() => setConfirmCancel(false)} className="flex-1 py-2 border border-red-200 text-red-500 rounded-lg text-sm hover:bg-red-100">
                  Não
                </button>
                <button onClick={() => onCancelar(consulta.id)} className="flex-1 py-2 bg-red-500 text-white rounded-lg text-sm font-semibold hover:bg-red-600">
                  Sim, cancelar
                </button>
              </div>
            </div>
          )}
        </div>

        {!remarcar && !confirmCancel && consulta.status !== "cancelada" && (
          <div className="flex gap-3 px-6 py-5 border-t border-zena-cream">
            <button
              onClick={() => setConfirmCancel(true)}
              className="flex-1 py-2.5 border border-red-200 text-red-500 rounded-xl text-sm font-medium hover:bg-red-50"
            >
              Cancelar consulta
            </button>
            <button
              onClick={() => setRemarcar(true)}
              className="flex-1 py-2.5 bg-zena-green-mid text-white rounded-xl text-sm font-semibold hover:bg-zena-green-dark"
            >
              Remarcar
            </button>
          </div>
        )}
        {(remarcar || confirmCancel || consulta.status === "cancelada") && !remarcar && !confirmCancel && (
          <div className="px-6 py-5 border-t border-zena-cream">
            <button onClick={onClose} className="w-full py-2.5 bg-zena-cream text-zena-text-mid rounded-xl text-sm hover:bg-zena-mint/30">
              Fechar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
