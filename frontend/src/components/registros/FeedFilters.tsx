import { FILTROS } from "../../lib/registros";
import GlassPanel from "./GlassPanel";

interface Props {
  valores: Record<string, boolean>;
  onChange: (id: string, checked: boolean) => void;
}

// Bloco "Filtros de Feed" — checkboxes controlados que filtram o feed (OR por tipo).
export default function FeedFilters({ valores, onChange }: Props) {
  return (
    <GlassPanel className="rounded-2xl p-6">
      <h3 className="text-label-md uppercase tracking-wider text-nx-on-surface-variant mb-4">Filtros de Feed</h3>
      <div className="space-y-3">
        {FILTROS.map((f) => (
          <label
            key={f.id}
            className="flex items-center justify-between p-3 rounded-xl bg-nx-container hover:bg-[#343342]/30 cursor-pointer transition-colors border border-transparent hover:border-nx-outline-variant"
          >
            <div className="flex items-center gap-3">
              <span className={`material-symbols-outlined ${f.cor}`} data-icon={f.icon}>
                {f.icon}
              </span>
              <span className="text-body-sm font-medium">{f.label}</span>
            </div>
            <input
              type="checkbox"
              checked={!!valores[f.id]}
              onChange={(e) => onChange(f.id, e.target.checked)}
              className="rounded border-nx-outline-variant bg-transparent text-nx-primary focus:ring-nx-primary"
            />
          </label>
        ))}
      </div>
    </GlassPanel>
  );
}
