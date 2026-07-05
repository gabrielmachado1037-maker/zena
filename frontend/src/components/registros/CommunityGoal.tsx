import GlassPanel from "./GlassPanel";

// "Meta da Comunidade" — barra de progresso de check-ins globais.
export default function CommunityGoal() {
  return (
    <GlassPanel className="rounded-2xl p-6">
      <h3 className="text-label-md uppercase tracking-wider text-nx-on-surface-variant mb-4">Meta da Comunidade</h3>
      <div className="space-y-2">
        <div className="flex justify-between text-label-sm">
          <span>Check-ins globais</span>
          <span className="text-nx-primary font-bold">78%</span>
        </div>
        <div className="w-full h-2 bg-nx-container-high rounded-full overflow-hidden">
          <div className="h-full bg-nx-primary" style={{ width: "78%" }} />
        </div>
        <p className="text-[11px] text-nx-on-surface-variant leading-tight mt-3">
          Aumentamos 12% em relação à semana passada. Seus pacientes estão engajados!
        </p>
      </div>
    </GlassPanel>
  );
}
