import { useEffect, useState } from "react";
import { Check, ChevronLeft, ChevronRight, X, Search, Plus, Calendar } from "lucide-react";
import { format, addDays, isSameDay, isSameMonth, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import api from "../lib/api";
import { Toast, useToast } from "../components/Toast";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Horario {
  id: string; diaSemana: number; hora: string; ativo: boolean; duracaoMinutos: number;
}
interface Consulta {
  id: string; pacienteId: string; paciente: { id: string; nome: string };
  data: string; status: string; tipo: string; notas?: string;
}
interface Paciente { id: string; nome: string; }

// ─── Constants ────────────────────────────────────────────────────────────────

const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const DIAS_FULL = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];

const HORAS: string[] = [];
for (let h = 7; h <= 20; h++) {
  HORAS.push(`${String(h).padStart(2, "0")}:00`);
  if (h < 20) HORAS.push(`${String(h).padStart(2, "0")}:30`);
}

const TIPOS = [
  { value: "primeira_consulta", label: "Primeira consulta" },
  { value: "retorno",           label: "Retorno" },
  { value: "online",            label: "Online" },
];

const TIPO_CFG: Record<string, { label: string; color: string }> = {
  primeira_consulta: { label: "1ª Consulta", color: "#3B82F6" },
  retorno:           { label: "Retorno",     color: "#1C4A2E" },
  online:            { label: "Online",      color: "#8B5CF6" },
  consulta:          { label: "Consulta",    color: "#14B8A6" },
};

function cfg(tipo: string) { return TIPO_CFG[tipo] ?? TIPO_CFG.consulta; }
function getInitials(nome: string) {
  return nome.split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase();
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function Horarios() {
  const [horarios, setHorarios]     = useState<Horario[]>([]);
  const [pacientes, setPacientes]   = useState<Paciente[]>([]);
  const [consultas, setConsultas]   = useState<Consulta[]>([]);
  const [monthOffset, setMonthOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loadingCal, setLoadingCal] = useState(true);
  const [modalAgendar, setModalAgendar] = useState<{ data: Date } | null>(null);
  const [modalConsulta, setModalConsulta] = useState<Consulta | null>(null);
  const { toast, show, hide } = useToast();

  const today = new Date();

  useEffect(() => {
    api.get("/horarios").then(r => setHorarios(r.data));
    api.get("/pacientes?limit=1000").then(r => setPacientes(r.data.data));
  }, []);

  useEffect(() => {
    const base     = addMonths(today, monthOffset);
    const mStart   = startOfMonth(base);
    const mEnd     = endOfMonth(base);
    const gStart   = startOfWeek(mStart, { weekStartsOn: 0 });
    const gEnd     = endOfWeek(mEnd,     { weekStartsOn: 0 });
    setLoadingCal(true);
    api.get(`/consultas?inicio=${format(gStart, "yyyy-MM-dd")}&fim=${format(gEnd, "yyyy-MM-dd")}`)
      .then(r => setConsultas(r.data))
      .catch(() => show("Erro ao carregar consultas.", "error"))
      .finally(() => setLoadingCal(false));
  }, [monthOffset]);

  function consultasNoDia(day: Date): Consulta[] {
    return consultas.filter(c => c.status !== "cancelada" && isSameDay(new Date(c.data), day));
  }

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays  = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  async function agendarConsulta(pacienteId: string, data: Date, tipo: string) {
    const res = await api.post("/consultas", { pacienteId, data: data.toISOString(), tipo });
    setConsultas(prev => [...prev, res.data]);
    show("Consulta agendada!");
    setModalAgendar(null);
  }

  async function cancelarConsulta(id: string) {
    await api.patch(`/consultas/${id}`, { status: "cancelada" });
    setConsultas(prev => prev.map(c => c.id === id ? { ...c, status: "cancelada" } : c));
    show("Consulta cancelada.");
    setModalConsulta(null);
  }

  async function remarcarConsulta(id: string, novaData: Date) {
    const res = await api.patch(`/consultas/${id}`, { data: novaData.toISOString() });
    setConsultas(prev => prev.map(c => c.id === id ? res.data : c));
    show("Consulta remarcada!");
    setModalConsulta(null);
  }

  function openAgendar(data: Date) { setModalAgendar({ data }); }

  return (
    <>
      {toast && <Toast message={toast.message} type={toast.type} onClose={hide} />}

      {/* ── MOBILE ── */}
      <div className="md:hidden min-h-screen bg-white pb-24">
        <MobileAgenda
          horarios={horarios}
          setHorarios={setHorarios}
          weekDays={weekDays}
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          onPrevWeek={() => setSelectedDate(d => addDays(d, -7))}
          onNextWeek={() => setSelectedDate(d => addDays(d, 7))}
          consultasNoDia={consultasNoDia}
          onAgendar={openAgendar}
          onSelectConsulta={setModalConsulta}
          show={show}
        />
      </div>

      {/* ── DESKTOP ── */}
      <div className="hidden md:block bg-[#F8F8F6] min-h-screen p-8">
        <DesktopAgenda
          horarios={horarios}
          setHorarios={setHorarios}
          consultas={consultas}
          monthOffset={monthOffset}
          setMonthOffset={setMonthOffset}
          loadingCal={loadingCal}
          today={today}
          consultasNoDia={consultasNoDia}
          onAgendar={openAgendar}
          onSelectConsulta={setModalConsulta}
          show={show}
        />
      </div>

      {modalAgendar && (
        <ModalAgendar
          data={modalAgendar.data}
          pacientes={pacientes}
          onClose={() => setModalAgendar(null)}
          onConfirm={agendarConsulta}
        />
      )}
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

// ─── Mobile: Agenda ───────────────────────────────────────────────────────────

function MobileAgenda({
  horarios, setHorarios, weekDays, selectedDate, setSelectedDate,
  onPrevWeek, onNextWeek, consultasNoDia, onAgendar, onSelectConsulta, show,
}: {
  horarios: Horario[];
  setHorarios: React.Dispatch<React.SetStateAction<Horario[]>>;
  weekDays: Date[];
  selectedDate: Date;
  setSelectedDate: (d: Date) => void;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  consultasNoDia: (d: Date) => Consulta[];
  onAgendar: (d: Date) => void;
  onSelectConsulta: (c: Consulta) => void;
  show: (msg: string, type?: "error") => void;
}) {
  const [tab, setTab] = useState<"agenda" | "horarios">("agenda");
  const today = new Date();
  const dayConsultas = consultasNoDia(selectedDate)
    .sort((a, b) => a.data.localeCompare(b.data));

  function openAgendarDay() {
    const dt = new Date(selectedDate);
    dt.setHours(9, 0, 0, 0);
    onAgendar(dt);
  }

  return (
    <div>
      {/* Header */}
      <div className="px-5 pt-10 pb-4 flex items-center justify-between">
        <h1 className="text-[26px] font-semibold text-[#111] tracking-tight">Agenda</h1>
        <div className="flex gap-0.5 bg-[#F5F5F3] rounded-xl p-1">
          {(["agenda", "horarios"] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all ${
                tab === t ? "bg-white text-[#111] shadow-sm" : "text-[#999]"
              }`}
            >
              {t === "agenda" ? "Agenda" : "Horários"}
            </button>
          ))}
        </div>
      </div>

      {tab === "agenda" ? (
        <>
          {/* Week strip */}
          <div className="px-5 pb-2">
            <div className="flex items-center justify-between mb-3">
              <button onClick={onPrevWeek} className="w-8 h-8 flex items-center justify-center rounded-full bg-[#F5F5F3]">
                <ChevronLeft size={15} className="text-[#666]" />
              </button>
              <p className="text-[12px] text-[#999] font-normal">
                {format(weekDays[0], "d MMM", { locale: ptBR })} — {format(weekDays[6], "d MMM yyyy", { locale: ptBR })}
              </p>
              <button onClick={onNextWeek} className="w-8 h-8 flex items-center justify-center rounded-full bg-[#F5F5F3]">
                <ChevronRight size={15} className="text-[#666]" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1">
              {weekDays.map((day, i) => {
                const isToday    = isSameDay(day, today);
                const isSelected = isSameDay(day, selectedDate);
                const hasCons    = consultasNoDia(day).length > 0;
                return (
                  <button
                    key={i}
                    onClick={() => setSelectedDate(day)}
                    className={`flex flex-col items-center py-2.5 rounded-2xl transition-all ${
                      isSelected ? "bg-[#1C4A2E]" : isToday ? "bg-[#1C4A2E]/10" : ""
                    }`}
                  >
                    <span className={`text-[10px] font-medium ${isSelected ? "text-white/70" : "text-[#bbb]"}`}>
                      {DIAS_SEMANA[day.getDay()]}
                    </span>
                    <span className={`text-[16px] font-semibold leading-tight ${
                      isSelected ? "text-white" : isToday ? "text-[#1C4A2E]" : "text-[#333]"
                    }`}>
                      {format(day, "d")}
                    </span>
                    <div className={`w-1 h-1 rounded-full mt-0.5 ${
                      hasCons ? (isSelected ? "bg-white/60" : "bg-[#1C4A2E]") : "bg-transparent"
                    }`} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Day label */}
          <div className="px-5 pt-4 pb-2">
            <p className="text-[12px] text-[#bbb] font-normal capitalize">
              {isSameDay(selectedDate, today) ? "Hoje" : format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
            </p>
          </div>

          {/* Appointment list */}
          <div className="px-5 space-y-2">
            {dayConsultas.length === 0 ? (
              <div className="bg-[#F5F5F3] rounded-2xl px-5 py-10 text-center">
                <Calendar className="mx-auto text-[#ddd] mb-3" size={32} />
                <p className="text-[14px] text-[#999] font-normal">Nenhuma consulta neste dia</p>
                <button onClick={openAgendarDay} className="mt-3 text-[13px] text-[#1C4A2E] font-medium">
                  + Agendar consulta
                </button>
              </div>
            ) : (
              dayConsultas.map(c => {
                const t = cfg(c.tipo);
                return (
                  <button
                    key={c.id}
                    onClick={() => onSelectConsulta(c)}
                    className="w-full bg-[#F5F5F3] rounded-2xl px-4 py-4 flex items-center gap-3 text-left active:scale-[0.98] transition-transform"
                  >
                    <div className="text-right w-12 flex-shrink-0">
                      <p className="text-[15px] font-semibold text-[#111] tabular-nums">
                        {format(new Date(c.data), "HH:mm")}
                      </p>
                    </div>
                    <div className="w-0.5 h-10 rounded-full flex-shrink-0" style={{ backgroundColor: t.color }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[15px] font-medium text-[#111] truncate">{c.paciente.nome}</p>
                      <p className="text-[12px] mt-0.5" style={{ color: t.color }}>{t.label}</p>
                    </div>
                    <ChevronRight size={16} className="text-[#ccc] flex-shrink-0" />
                  </button>
                );
              })
            )}
          </div>

          {/* FAB */}
          <button
            onClick={openAgendarDay}
            className="fixed bottom-6 right-6 w-14 h-14 bg-[#1C4A2E] rounded-full flex items-center justify-center shadow-xl z-40 active:scale-95 transition-transform"
          >
            <Plus size={22} className="text-white" />
          </button>
        </>
      ) : (
        <div className="px-5 pt-2">
          <MobileDisponibilidade horarios={horarios} setHorarios={setHorarios} show={show} />
        </div>
      )}
    </div>
  );
}

// ─── Mobile: Disponibilidade ──────────────────────────────────────────────────

function MobileDisponibilidade({
  horarios, setHorarios, show,
}: {
  horarios: Horario[];
  setHorarios: React.Dispatch<React.SetStateAction<Horario[]>>;
  show: (msg: string, type?: "error") => void;
}) {
  const [diaSelecionado, setDiaSelecionado] = useState(() => {
    const d = new Date().getDay();
    return d === 0 || d === 6 ? 1 : d;
  });
  const [duracao, setDuracao]   = useState(60);
  const [salvando, setSalvando] = useState<string | null>(null);

  function isAtivo(dia: number, hora: string) {
    return horarios.some(h => h.diaSemana === dia && h.hora === hora && h.ativo);
  }

  async function toggleSlot(dia: number, hora: string) {
    const key = `${dia}-${hora}`;
    setSalvando(key);
    const existente = horarios.find(h => h.diaSemana === dia && h.hora === hora);
    try {
      if (existente) {
        await api.delete(`/horarios/${existente.id}`);
        setHorarios(prev => prev.filter(h => h.id !== existente.id));
      } else {
        const res = await api.post("/horarios", { diaSemana: dia, hora, duracaoMinutos: duracao });
        setHorarios(prev => [...prev, res.data]);
      }
    } catch {
      show("Erro ao atualizar horário.", "error");
    } finally {
      setSalvando(null);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <p className="text-[15px] font-semibold text-[#111]">Duração da consulta</p>
        <div className="flex gap-1.5">
          {[30, 45, 60, 90].map(m => (
            <button
              key={m}
              onClick={() => setDuracao(m)}
              className={`px-3 py-1.5 rounded-xl text-[12px] font-medium transition-all ${
                duracao === m ? "bg-[#1C4A2E] text-white" : "bg-[#F5F5F3] text-[#999]"
              }`}
            >
              {m}min
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-4">
        {DIAS_SEMANA.map((d, i) => {
          const count = horarios.filter(h => h.diaSemana === i && h.ativo).length;
          const sel   = diaSelecionado === i;
          return (
            <button
              key={i}
              onClick={() => setDiaSelecionado(i)}
              className={`flex flex-col items-center py-2 rounded-xl text-[11px] font-semibold transition-all ${
                sel ? "bg-[#1C4A2E] text-white" : "text-[#999]"
              }`}
            >
              {d}
              <div className={`mt-1 w-1 h-1 rounded-full ${count > 0 ? (sel ? "bg-white/60" : "bg-[#1C4A2E]") : "bg-transparent"}`} />
            </button>
          );
        })}
      </div>

      <p className="text-[12px] text-[#bbb] mb-3">{DIAS_FULL[diaSelecionado]}</p>

      <div className="grid grid-cols-3 gap-2">
        {HORAS.map(hora => {
          const ativo     = isAtivo(diaSelecionado, hora);
          const key       = `${diaSelecionado}-${hora}`;
          const carregando = salvando === key;
          return (
            <button
              key={hora}
              onClick={() => toggleSlot(diaSelecionado, hora)}
              disabled={carregando}
              className={`h-12 rounded-2xl text-[13px] font-medium flex flex-col items-center justify-center gap-0.5 transition-all ${
                ativo ? "bg-[#1C4A2E] text-white" : "bg-[#F5F5F3] text-[#999]"
              } ${carregando ? "opacity-40" : ""}`}
            >
              {ativo && <Check size={11} />}
              {hora}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Desktop ──────────────────────────────────────────────────────────────────

function DesktopAgenda({
  horarios, setHorarios, consultas, monthOffset, setMonthOffset,
  loadingCal, today, consultasNoDia, onAgendar, onSelectConsulta, show,
}: {
  horarios: Horario[];
  setHorarios: React.Dispatch<React.SetStateAction<Horario[]>>;
  consultas: Consulta[];
  monthOffset: number;
  setMonthOffset: React.Dispatch<React.SetStateAction<number>>;
  loadingCal: boolean;
  today: Date;
  consultasNoDia: (d: Date) => Consulta[];
  onAgendar: (d: Date) => void;
  onSelectConsulta: (c: Consulta) => void;
  show: (msg: string, type?: "error") => void;
}) {
  const [diaSelecionado, setDiaSelecionado] = useState(() => {
    const d = today.getDay();
    return d === 0 || d === 6 ? 1 : d;
  });
  const [duracao, setDuracao]   = useState(60);
  const [salvando, setSalvando] = useState<string | null>(null);

  const viewDate  = addMonths(today, monthOffset);
  const mStart    = startOfMonth(viewDate);
  const mEnd      = endOfMonth(viewDate);
  const gStart    = startOfWeek(mStart, { weekStartsOn: 0 });
  const gEnd      = endOfWeek(mEnd,     { weekStartsOn: 0 });

  const gridDays: Date[] = [];
  let cur = new Date(gStart);
  while (cur <= gEnd) { gridDays.push(new Date(cur)); cur = addDays(cur, 1); }

  // Próximas consultas (next 7 days from today, from loaded consultas)
  const upcoming = Array.from({ length: 14 }, (_, i) => addDays(today, i))
    .flatMap(day => consultasNoDia(day))
    .sort((a, b) => a.data.localeCompare(b.data))
    .slice(0, 5);

  function isAtivo(dia: number, hora: string) {
    return horarios.some(h => h.diaSemana === dia && h.hora === hora && h.ativo);
  }

  async function toggleSlot(dia: number, hora: string) {
    const key = `${dia}-${hora}`;
    setSalvando(key);
    const existente = horarios.find(h => h.diaSemana === dia && h.hora === hora);
    try {
      if (existente) {
        await api.delete(`/horarios/${existente.id}`);
        setHorarios(prev => prev.filter(h => h.id !== existente.id));
      } else {
        const res = await api.post("/horarios", { diaSemana: dia, hora, duracaoMinutos: duracao });
        setHorarios(prev => [...prev, res.data]);
      }
    } catch {
      show("Erro ao atualizar horário.", "error");
    } finally {
      setSalvando(null);
    }
  }

  const DIAS_HEADER = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-[22px] font-semibold text-[#111] tracking-tight">Agenda</h1>
        <button
          onClick={() => { const dt = new Date(today); dt.setHours(9, 0, 0, 0); onAgendar(dt); }}
          className="flex items-center gap-2 bg-[#1C4A2E] text-white text-[13px] font-medium px-4 py-2.5 rounded-xl hover:bg-[#2D6A4F] transition-colors"
        >
          <Plus size={15} />
          Agendar consulta
        </button>
      </div>

      <div className="grid grid-cols-3 gap-5">

        {/* ── Calendário (col-span-2) ── */}
        <div className="col-span-2 bg-white rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">

          {/* Month nav */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#F5F5F3]">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setMonthOffset(o => o - 1)}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#F8F8F6] hover:bg-[#EEEEED] text-[#666] transition-colors"
              >
                <ChevronLeft size={15} />
              </button>
              <span className="text-[14px] font-semibold text-[#111] capitalize min-w-[140px] text-center">
                {format(viewDate, "MMMM yyyy", { locale: ptBR })}
              </span>
              <button
                onClick={() => setMonthOffset(o => o + 1)}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#F8F8F6] hover:bg-[#EEEEED] text-[#666] transition-colors"
              >
                <ChevronRight size={15} />
              </button>
            </div>
            {monthOffset !== 0 && (
              <button onClick={() => setMonthOffset(0)} className="text-[12px] text-[#1C4A2E] font-medium">
                Hoje
              </button>
            )}
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-[#F8F8F6]">
            {DIAS_HEADER.map((d, i) => (
              <div
                key={d}
                className={`py-2.5 text-center text-[11px] font-semibold tracking-widest ${
                  i === 0 ? "text-red-400" : "text-[#ccc]"
                }`}
              >
                {d}
              </div>
            ))}
          </div>

          {/* Grid */}
          {loadingCal ? (
            <div className="grid grid-cols-7 animate-pulse">
              {Array.from({ length: 35 }).map((_, i) => (
                <div key={i} className="min-h-[90px] border-b border-r border-[#F8F8F6]" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-7">
              {gridDays.map((day, i) => {
                const isCurrentMonth = isSameMonth(day, viewDate);
                const isToday  = isSameDay(day, today);
                const isSun    = day.getDay() === 0;
                const dayItems = consultasNoDia(day);

                return (
                  <div
                    key={i}
                    onClick={() => { const dt = new Date(day); dt.setHours(9, 0, 0, 0); onAgendar(dt); }}
                    className={`min-h-[90px] p-2 border-b border-r border-[#F8F8F6] cursor-pointer transition-colors select-none
                      ${isToday ? "bg-[#1C4A2E]/[0.03]" : "hover:bg-[#F8F8F6]"}
                      ${!isCurrentMonth ? "opacity-25" : ""}
                    `}
                  >
                    <div className={`w-6 h-6 flex items-center justify-center rounded-full text-[12px] font-semibold mb-1.5 ${
                      isToday
                        ? "bg-[#1C4A2E] text-white"
                        : isSun && isCurrentMonth
                        ? "text-red-400"
                        : "text-[#333]"
                    }`}>
                      {format(day, "d")}
                    </div>
                    <div className="space-y-0.5">
                      {dayItems.slice(0, 2).map((c, idx) => {
                        const t = cfg(c.tipo);
                        return (
                          <div
                            key={idx}
                            onClick={e => { e.stopPropagation(); onSelectConsulta(c); }}
                            className="flex items-center gap-1 rounded-md px-1.5 py-0.5 hover:opacity-75 cursor-pointer"
                            style={{ backgroundColor: t.color + "18" }}
                          >
                            <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: t.color }} />
                            <span className="text-[10px] font-medium truncate" style={{ color: t.color }}>
                              {format(new Date(c.data), "HH:mm")} {c.paciente.nome.split(" ")[0]}
                            </span>
                          </div>
                        );
                      })}
                      {dayItems.length > 2 && (
                        <p className="text-[10px] text-[#bbb] pl-1">+{dayItems.length - 2}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Right panel ── */}
        <div className="flex flex-col gap-4">

          {/* Próximas consultas */}
          <div className="bg-white rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-5">
            <p className="text-[13px] font-semibold text-[#111] mb-4">Próximas consultas</p>
            {upcoming.length === 0 ? (
              <div className="py-6 text-center">
                <p className="text-[12px] text-[#bbb]">Nenhuma agendada</p>
              </div>
            ) : (
              <div className="space-y-1">
                {upcoming.map(c => {
                  const t  = cfg(c.tipo);
                  const dt = new Date(c.data);
                  const isToday = isSameDay(dt, today);
                  return (
                    <button
                      key={c.id}
                      onClick={() => onSelectConsulta(c)}
                      className="w-full flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-[#F8F8F6] transition-colors text-left"
                    >
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-semibold text-white flex-shrink-0"
                        style={{ backgroundColor: t.color }}
                      >
                        {getInitials(c.paciente.nome)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-[#111] truncate">{c.paciente.nome}</p>
                        <p className="text-[11px] text-[#bbb]">
                          {isToday ? "Hoje" : format(dt, "EEE d/MM", { locale: ptBR })} · {format(dt, "HH:mm")}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Disponibilidade */}
          <div className="bg-white rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-5 flex-1">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[13px] font-semibold text-[#111]">Disponibilidade</p>
              <div className="flex gap-1">
                {[30, 60].map(m => (
                  <button
                    key={m}
                    onClick={() => setDuracao(m)}
                    className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all ${
                      duracao === m ? "bg-[#1C4A2E] text-white" : "bg-[#F5F5F3] text-[#999]"
                    }`}
                  >
                    {m}min
                  </button>
                ))}
              </div>
            </div>

            {/* Day selector */}
            <div className="grid grid-cols-7 gap-0.5 mb-3">
              {DIAS_SEMANA.map((d, i) => {
                const count = horarios.filter(h => h.diaSemana === i && h.ativo).length;
                const sel   = diaSelecionado === i;
                return (
                  <button
                    key={i}
                    onClick={() => setDiaSelecionado(i)}
                    className={`py-1.5 rounded-lg text-[10px] font-semibold transition-all flex flex-col items-center gap-0.5 ${
                      sel ? "bg-[#1C4A2E] text-white" : "text-[#bbb] hover:bg-[#F5F5F3]"
                    }`}
                  >
                    {d}
                    <div className={`w-1 h-1 rounded-full ${count > 0 ? (sel ? "bg-white/50" : "bg-[#1C4A2E]") : "bg-transparent"}`} />
                  </button>
                );
              })}
            </div>

            {/* Time slots */}
            <div className="grid grid-cols-3 gap-1 max-h-[220px] overflow-y-auto pr-0.5">
              {HORAS.map(hora => {
                const ativo      = isAtivo(diaSelecionado, hora);
                const key        = `${diaSelecionado}-${hora}`;
                const carregando = salvando === key;
                return (
                  <button
                    key={hora}
                    onClick={() => toggleSlot(diaSelecionado, hora)}
                    disabled={carregando}
                    className={`h-8 rounded-lg text-[11px] font-medium transition-all ${
                      ativo ? "bg-[#1C4A2E] text-white" : "bg-[#F5F5F3] text-[#999] hover:bg-[#EAEAE8]"
                    } ${carregando ? "opacity-40" : ""}`}
                  >
                    {hora}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Modal: Agendar ───────────────────────────────────────────────────────────

function ModalAgendar({
  data, pacientes, onClose, onConfirm,
}: {
  data: Date;
  pacientes: Paciente[];
  onClose: () => void;
  onConfirm: (pacienteId: string, data: Date, tipo: string) => void;
}) {
  const [busca, setBusca]         = useState("");
  const [pacienteId, setPacienteId] = useState("");
  const [pacienteNome, setPacienteNome] = useState("");
  const [tipo, setTipo]           = useState("retorno");
  const [hora, setHora]           = useState(format(data, "HH:mm"));
  const [saving, setSaving]       = useState(false);
  const [showList, setShowList]   = useState(false);

  const filtrados = pacientes.filter(p => p.nome.toLowerCase().includes(busca.toLowerCase()));

  async function confirmar() {
    if (!pacienteId) return;
    setSaving(true);
    try {
      const [h, m] = hora.split(":").map(Number);
      const dt = new Date(data);
      dt.setHours(h, m, 0, 0);
      await onConfirm(pacienteId, dt, tipo);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#F5F5F3]">
          <div>
            <h2 className="text-[16px] font-semibold text-[#111]">Agendar consulta</h2>
            <p className="text-[12px] text-[#999] mt-0.5 capitalize">
              {format(data, "EEEE, d 'de' MMMM", { locale: ptBR })}
            </p>
          </div>
          <button onClick={onClose} className="text-[#ccc] hover:text-[#999]"><X size={20} /></button>
        </div>

        <div className="p-6 space-y-4">
          {/* Hora */}
          <div>
            <label className="block text-[12px] font-medium text-[#666] mb-1.5">Horário</label>
            <select
              value={hora}
              onChange={e => setHora(e.target.value)}
              className="w-full px-3 py-2.5 border border-[#E8E8E8] rounded-xl text-[14px] text-[#111] focus:outline-none focus:ring-2 focus:ring-[#1C4A2E]/30"
            >
              {HORAS.map(h => <option key={h} value={h}>{h}</option>)}
            </select>
          </div>

          {/* Paciente */}
          <div>
            <label className="block text-[12px] font-medium text-[#666] mb-1.5">Paciente</label>
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#bbb]" />
              <input
                type="text"
                placeholder="Buscar paciente..."
                value={busca || pacienteNome}
                onChange={e => { setBusca(e.target.value); setPacienteNome(""); setPacienteId(""); setShowList(true); }}
                onFocus={() => setShowList(true)}
                className="w-full pl-8 pr-3 py-2.5 border border-[#E8E8E8] rounded-xl text-[14px] text-[#111] focus:outline-none focus:ring-2 focus:ring-[#1C4A2E]/30"
              />
            </div>
            {showList && busca && (
              <div className="mt-1 max-h-36 overflow-y-auto border border-[#E8E8E8] rounded-xl divide-y divide-[#F8F8F6] shadow-sm">
                {filtrados.length === 0 ? (
                  <p className="text-center text-[12px] text-[#bbb] py-3">Nenhuma encontrada</p>
                ) : filtrados.slice(0, 8).map(p => (
                  <button
                    key={p.id}
                    onClick={() => { setPacienteId(p.id); setPacienteNome(p.nome); setBusca(""); setShowList(false); }}
                    className={`w-full text-left px-4 py-2.5 text-[13px] transition-colors ${
                      pacienteId === p.id ? "bg-[#1C4A2E]/8 text-[#1C4A2E] font-medium" : "hover:bg-[#F8F8F6] text-[#333]"
                    }`}
                  >
                    {p.nome}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Tipo */}
          <div>
            <label className="block text-[12px] font-medium text-[#666] mb-1.5">Tipo</label>
            <div className="flex gap-2">
              {TIPOS.map(t => {
                const c = cfg(t.value);
                const sel = tipo === t.value;
                return (
                  <button
                    key={t.value}
                    onClick={() => setTipo(t.value)}
                    className="flex-1 py-2 rounded-xl text-[12px] font-medium transition-all border"
                    style={sel ? { backgroundColor: c.color, color: "white", borderColor: c.color } : { borderColor: "#E8E8E8", color: "#999" }}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-[#F5F5F3]">
          <button onClick={onClose} className="flex-1 py-2.5 border border-[#E8E8E8] text-[#999] rounded-xl text-[13px] hover:bg-[#F8F8F6]">
            Cancelar
          </button>
          <button
            onClick={confirmar}
            disabled={!pacienteId || saving}
            className="flex-1 py-2.5 bg-[#1C4A2E] text-white rounded-xl text-[13px] font-semibold hover:bg-[#2D6A4F] disabled:opacity-40 transition-colors"
          >
            {saving ? "Agendando..." : "Confirmar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal: Consulta existente ────────────────────────────────────────────────

function ModalConsulta({
  consulta, onClose, onCancelar, onRemarcar,
}: {
  consulta: Consulta;
  onClose: () => void;
  onCancelar: (id: string) => void;
  onRemarcar: (id: string, novaData: Date) => void;
}) {
  const [remarcar, setRemarcar]       = useState(false);
  const [novaData, setNovaData]       = useState(format(new Date(consulta.data), "yyyy-MM-dd"));
  const [novaHora, setNovaHora]       = useState(format(new Date(consulta.data), "HH:mm"));
  const [confirmCancel, setConfirmCancel] = useState(false);
  const t  = cfg(consulta.tipo);
  const dt = new Date(consulta.data);

  function confirmarReagendar() {
    const [h, m] = novaHora.split(":").map(Number);
    const d = new Date(novaData + "T00:00:00");
    d.setHours(h, m, 0, 0);
    onRemarcar(consulta.id, d);
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#F5F5F3]">
          <h2 className="text-[16px] font-semibold text-[#111]">Detalhes da consulta</h2>
          <button onClick={onClose} className="text-[#ccc] hover:text-[#999]"><X size={20} /></button>
        </div>

        <div className="p-6 space-y-4">
          {/* Patient info */}
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-[12px] font-semibold text-white flex-shrink-0"
              style={{ backgroundColor: t.color }}
            >
              {getInitials(consulta.paciente.nome)}
            </div>
            <div>
              <p className="text-[15px] font-semibold text-[#111]">{consulta.paciente.nome}</p>
              <p className="text-[12px] mt-0.5" style={{ color: t.color }}>{t.label}</p>
            </div>
          </div>

          {/* Info block */}
          <div className="bg-[#F8F8F6] rounded-xl p-4 space-y-2.5 text-[13px]">
            <div className="flex justify-between">
              <span className="text-[#bbb]">Data</span>
              <span className="text-[#111] font-medium capitalize">
                {format(dt, "EEEE, d 'de' MMMM", { locale: ptBR })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#bbb]">Horário</span>
              <span className="text-[#111] font-medium">{format(dt, "HH:mm")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#bbb]">Status</span>
              <span className={`font-medium ${consulta.status === "cancelada" ? "text-red-500" : "text-[#1C4A2E]"}`}>
                {consulta.status.charAt(0).toUpperCase() + consulta.status.slice(1)}
              </span>
            </div>
          </div>

          {/* Remarcar form */}
          {remarcar && (
            <div className="border border-[#E8E8E8] rounded-xl p-4 space-y-3">
              <p className="text-[13px] font-medium text-[#111]">Nova data e hora</p>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={novaData}
                  onChange={e => setNovaData(e.target.value)}
                  className="flex-1 px-3 py-2 border border-[#E8E8E8] rounded-xl text-[13px] text-[#111] focus:outline-none focus:ring-2 focus:ring-[#1C4A2E]/30"
                />
                <select
                  value={novaHora}
                  onChange={e => setNovaHora(e.target.value)}
                  className="px-3 py-2 border border-[#E8E8E8] rounded-xl text-[13px] text-[#111] focus:outline-none focus:ring-2 focus:ring-[#1C4A2E]/30"
                >
                  {HORAS.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setRemarcar(false)} className="flex-1 py-2 border border-[#E8E8E8] text-[#999] rounded-xl text-[13px] hover:bg-[#F8F8F6]">
                  Voltar
                </button>
                <button onClick={confirmarReagendar} className="flex-1 py-2 bg-[#1C4A2E] text-white rounded-xl text-[13px] font-semibold hover:bg-[#2D6A4F]">
                  Salvar
                </button>
              </div>
            </div>
          )}

          {/* Cancel confirm */}
          {confirmCancel && (
            <div className="border border-red-100 rounded-xl p-4 bg-red-50 space-y-3">
              <p className="text-[13px] font-medium text-red-700">Confirmar cancelamento?</p>
              <div className="flex gap-2">
                <button onClick={() => setConfirmCancel(false)} className="flex-1 py-2 border border-red-200 text-red-500 rounded-xl text-[13px] hover:bg-red-100">
                  Não
                </button>
                <button onClick={() => onCancelar(consulta.id)} className="flex-1 py-2 bg-red-500 text-white rounded-xl text-[13px] font-semibold hover:bg-red-600">
                  Cancelar consulta
                </button>
              </div>
            </div>
          )}
        </div>

        {!remarcar && !confirmCancel && consulta.status !== "cancelada" && (
          <div className="flex gap-3 px-6 py-4 border-t border-[#F5F5F3]">
            <button
              onClick={() => setConfirmCancel(true)}
              className="flex-1 py-2.5 border border-red-100 text-red-400 rounded-xl text-[13px] font-medium hover:bg-red-50"
            >
              Cancelar
            </button>
            <button
              onClick={() => setRemarcar(true)}
              className="flex-1 py-2.5 bg-[#1C4A2E] text-white rounded-xl text-[13px] font-semibold hover:bg-[#2D6A4F]"
            >
              Remarcar
            </button>
          </div>
        )}

        {consulta.status === "cancelada" && !remarcar && !confirmCancel && (
          <div className="px-6 py-4 border-t border-[#F5F5F3]">
            <button onClick={onClose} className="w-full py-2.5 bg-[#F8F8F6] text-[#999] rounded-xl text-[13px]">
              Fechar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
