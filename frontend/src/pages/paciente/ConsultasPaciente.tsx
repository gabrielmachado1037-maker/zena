import { useEffect, useState } from "react";
import { Calendar, Clock, CheckCircle, XCircle } from "lucide-react";
import api from "../../lib/api";
import { usePacienteAuth } from "../../contexts/PacienteAuthContext";

interface Consulta {
  id: string; data: string; status: string; tipo: string; notas?: string;
}

interface ConsultasData {
  proximas: Consulta[];
  historico: Consulta[];
}

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  agendada:    { label: "Agendada",    color: "#A855F7", icon: Clock },
  confirmada:  { label: "Confirmada",  color: "#7C3AED", icon: CheckCircle },
  cancelada:   { label: "Cancelada",   color: "#999",    icon: XCircle },
  realizada:   { label: "Realizada",   color: "#A855F7", icon: CheckCircle },
};

function ConsultaCard({ consulta, passada = false }: { consulta: Consulta; passada?: boolean }) {
  const d = new Date(consulta.data);
  const cfg = statusConfig[consulta.status] ?? statusConfig.agendada;
  const Icon = cfg.icon;

  return (
    <div className={`bg-white rounded-2xl p-4 border ${passada ? "border-[#F0F0EE] opacity-70" : "border-[#E0F2E9]"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex flex-col items-center justify-center flex-shrink-0" style={{ background: passada ? "#F5F5F3" : "#E0F2E9" }}>
            <span className="text-[14px] font-bold leading-none" style={{ color: passada ? "#999" : "#7C3AED" }}>
              {d.getDate().toString().padStart(2, "0")}
            </span>
            <span className="text-[9px] font-medium uppercase" style={{ color: passada ? "#bbb" : "#A855F7" }}>
              {d.toLocaleDateString("pt-BR", { month: "short" })}
            </span>
          </div>
          <div>
            <p className="text-[14px] font-semibold text-[#111]">
              {d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
            </p>
            <p className="text-[12px] text-[#999] capitalize">{consulta.tipo}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <Icon size={13} style={{ color: cfg.color }} />
          <span className="text-[12px] font-medium" style={{ color: cfg.color }}>{cfg.label}</span>
        </div>
      </div>
      {consulta.notas && (
        <p className="text-[12px] text-[#999] mt-3 pt-3 border-t border-[#F5F5F3]">{consulta.notas}</p>
      )}
    </div>
  );
}

export default function ConsultasPaciente() {
  const { token } = usePacienteAuth();
  const [data, setData]     = useState<ConsultasData | null>(null);
  const [loading, setLoading] = useState(true);
  const [aba, setAba]       = useState<"proximas" | "historico">("proximas");

  useEffect(() => {
    api.get<ConsultasData>("/paciente-app/consultas", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => setData(r.data))
      .finally(() => setLoading(false));
  }, []);

  const lista = aba === "proximas" ? data?.proximas : data?.historico;

  return (
    <div className="px-5 pt-10 pb-4">
      <div className="flex items-center gap-3 mb-1">
        <Calendar size={20} style={{ color: "#7C3AED" }} />
        <h1 className="text-[24px] font-bold text-[#111]">Consultas</h1>
      </div>
      <p className="text-[13px] text-[#999] mb-6">Suas consultas com a nutricionista</p>

      <div className="flex gap-2 mb-5">
        {(["proximas", "historico"] as const).map((a) => (
          <button
            key={a}
            onClick={() => setAba(a)}
            className={`flex-1 py-2 rounded-xl text-[13px] font-semibold transition-all ${
              aba === a ? "text-white" : "text-[#999] bg-[#F5F5F3]"
            }`}
            style={aba === a ? { background: "#7C3AED" } : {}}
          >
            {a === "proximas" ? "Próximas" : "Histórico"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => <div key={i} className="bg-white rounded-2xl p-4 animate-pulse h-20" />)}
        </div>
      ) : !lista?.length ? (
        <div className="text-center py-12">
          <p className="text-[#bbb] text-[14px]">
            {aba === "proximas" ? "Nenhuma consulta agendada." : "Sem histórico de consultas."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {lista.map((c) => <ConsultaCard key={c.id} consulta={c} passada={aba === "historico"} />)}
        </div>
      )}
    </div>
  );
}
