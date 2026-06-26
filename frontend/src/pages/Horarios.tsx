import { useEffect, useState } from "react";
import { Clock, Check } from "lucide-react";
import api from "../lib/api";
import { Toast, useToast } from "../components/Toast";

interface Horario {
  id: string;
  diaSemana: number;
  hora: string;
  ativo: boolean;
  duracaoMinutos: number;
}

const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const DIAS_FULL = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];

const HORAS: string[] = [];
for (let h = 7; h <= 20; h++) {
  HORAS.push(`${String(h).padStart(2, "0")}:00`);
  if (h < 20) HORAS.push(`${String(h).padStart(2, "0")}:30`);
}

export default function Horarios() {
  const [horarios, setHorarios] = useState<Horario[]>([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState<string | null>(null);
  const [duracao, setDuracao] = useState(60);
  const { toast, show, hide } = useToast();

  useEffect(() => {
    api.get("/horarios").then((res) => {
      setHorarios(res.data);
      setLoading(false);
    });
  }, []);

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
    <div className="p-8">
      {toast && <Toast message={toast.message} type={toast.type} onClose={hide} />}

      <div className="mb-8">
        <h1 className="text-zena-text-dark text-3xl font-bold">Agenda de disponibilidade</h1>
        <p className="text-zena-text-light mt-1">Configure os horários em que você atende. Suas pacientes poderão agendar dentro desses slots.</p>
      </div>

      {/* Config bar */}
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
        <div className="bg-white rounded-2xl p-8 border border-zena-mint/30 animate-pulse">
          <div className="h-6 bg-zena-mint/30 rounded w-48 mb-4" />
          <div className="grid grid-cols-8 gap-2">
            {Array.from({ length: 56 }).map((_, i) => (
              <div key={i} className="h-9 bg-zena-mint/20 rounded-lg" />
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-zena-mint/30 shadow-sm overflow-hidden">
          {/* Days header */}
          <div className="grid grid-cols-8 border-b border-zena-cream">
            <div className="p-4 text-zena-text-light text-xs font-medium text-center">Horário</div>
            {DIAS.map((d, i) => (
              <div key={i} className="p-4 text-center">
                <p className="text-zena-text-dark font-semibold text-sm">{d}</p>
                <p className="text-zena-text-light text-xs">{i === 0 || i === 6 ? "fim de sem." : ""}</p>
              </div>
            ))}
          </div>

          {/* Slots grid */}
          <div className="max-h-[60vh] overflow-y-auto">
            {HORAS.map((hora) => (
              <div key={hora} className="grid grid-cols-8 border-b border-zena-cream/60 hover:bg-zena-cream/30 transition-colors">
                <div className="px-4 py-2 text-zena-text-light text-xs font-mono-data flex items-center justify-center">
                  {hora}
                </div>
                {DIAS.map((_, diaIdx) => {
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
      )}

      {/* Legend */}
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
    </div>
  );
}
