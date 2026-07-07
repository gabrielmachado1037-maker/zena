import GlassPanel from "./GlassPanel";

const pad2 = (n: number) => (n < 10 ? `0${n}` : `${n}`);

// Bloco "Resumo do Dia" — Registros (evo) e Alertas (streak).
export default function DaySummary({ registros, alertas }: { registros: number; alertas: number }) {
  return (
    <GlassPanel className="rounded-2xl p-6 relative overflow-hidden">
      <h3 className="text-label-md uppercase tracking-wider text-nx-on-surface-variant mb-4 relative z-10">
        Resumo do Dia
      </h3>
      <div className="grid grid-cols-2 gap-4 relative z-10">
        <div className="bg-nx-container-high p-3 rounded-xl">
          <p className="text-label-sm text-nx-on-surface-variant">Registros</p>
          <p className="text-headline-md font-bold text-nx-evo">{pad2(registros)}</p>
        </div>
        <div className="bg-nx-container-high p-3 rounded-xl">
          <p className="text-label-sm text-nx-on-surface-variant">Alertas</p>
          <p className="text-headline-md font-bold text-nx-streak">{pad2(alertas)}</p>
        </div>
      </div>
    </GlassPanel>
  );
}
