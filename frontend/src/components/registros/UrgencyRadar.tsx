import type { AlertaRadar } from "../../lib/registros";
import GlassPanel from "./GlassPanel";

// Cor por severidade (strings literais para o JIT do Tailwind).
const CFG: Record<AlertaRadar["cor"], { wrap: string; dot: string }> = {
  error: { wrap: "bg-nx-error/5 border border-nx-error/20", dot: "bg-nx-error" },
  secondary: { wrap: "bg-nx-secondary/5 border border-nx-secondary/20", dot: "bg-nx-secondary" },
};

interface Props {
  alertas: AlertaRadar[];
  onNudge: (pacienteId: string) => void;
}

// "Radar de Urgência" — alertas reais com dot pulsante + botão de incentivo.
export default function UrgencyRadar({ alertas, onNudge }: Props) {
  return (
    <GlassPanel className="rounded-2xl p-6">
      <h3 className="text-label-md uppercase tracking-wider text-nx-on-surface-variant mb-4">Radar de Urgência</h3>
      {alertas.length === 0 ? (
        <p className="text-label-sm text-nx-on-surface-variant">Nenhum alerta no momento. 🎉</p>
      ) : (
        <div className="space-y-4">
          {alertas.map((a) => {
            const c = CFG[a.cor];
            return (
              <div
                key={a.id}
                className={`flex items-center gap-3 p-3 rounded-xl ${c.wrap} ${a.glow ? "active-glow" : ""}`}
              >
                <div className={`w-2 h-2 rounded-full ${c.dot} ${a.cor === "error" ? "animate-pulse" : ""}`} />
                <div className="flex-1">
                  <p className="text-label-md font-bold">{a.nome}</p>
                  <p className="text-label-sm text-nx-on-surface-variant">{a.motivo}</p>
                </div>
                <button
                  onClick={() => onNudge(a.pacienteId)}
                  title="Enviar incentivo"
                  className="p-1.5 rounded-lg bg-nx-container hover:bg-[#343342]"
                >
                  <span className="material-symbols-outlined text-sm" data-icon="send">send</span>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </GlassPanel>
  );
}
