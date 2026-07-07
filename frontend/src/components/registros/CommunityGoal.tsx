import GlassPanel from "./GlassPanel";

// "Meta da Comunidade" — % de pacientes ativos que registraram hoje + variação semanal.
export default function CommunityGoal({ pct, deltaSemana }: { pct: number; deltaSemana: number }) {
  const legenda =
    deltaSemana > 0
      ? `Subiu ${deltaSemana}% em relação à semana passada. Seus pacientes estão engajados!`
      : deltaSemana < 0
        ? `Caiu ${Math.abs(deltaSemana)}% em relação à semana passada. Vale um incentivo.`
        : "Registros estáveis em relação à semana passada.";
  return (
    <GlassPanel className="rounded-2xl p-6">
      <h3 className="text-label-md uppercase tracking-wider text-nx-on-surface-variant mb-4">Meta da Comunidade</h3>
      <div className="space-y-2">
        <div className="flex justify-between text-label-sm">
          <span>Check-ins de hoje</span>
          <span className="text-nx-evo font-bold">{pct}%</span>
        </div>
        <div className="w-full h-2 bg-nx-container-high rounded-full overflow-hidden">
          <div className="h-full bg-nx-evo transition-all" style={{ width: `${pct}%` }} />
        </div>
        <p className="text-[11px] text-nx-on-surface-variant leading-tight mt-3">{legenda}</p>
      </div>
    </GlassPanel>
  );
}
