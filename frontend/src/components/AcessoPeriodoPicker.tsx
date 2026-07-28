import { useState } from "react";

/** Seletor do prazo de acesso do paciente: presets (1/3/6/12 meses), "sem prazo"
 *  ou data personalizada. `value` = ISO yyyy-mm-dd do vencimento, ou null = sem prazo. */
export function isoHoje(): string {
  return new Date().toISOString().slice(0, 10);
}
function isoDaquiAMeses(n: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() + n);
  return d.toISOString().slice(0, 10);
}

const PRESETS = [
  { label: "1 mês", meses: 1 },
  { label: "3 meses", meses: 3 },
  { label: "6 meses", meses: 6 },
  { label: "1 ano", meses: 12 },
];

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "rounded-full px-3.5 py-1.5 text-body-sm font-semibold transition-colors " +
        (active
          ? "bg-nx-evo text-nx-on-evo"
          : "border border-nx-border bg-nx-container text-nx-on-surface-variant hover:text-nx-on-surface")
      }
    >
      {children}
    </button>
  );
}

export default function AcessoPeriodoPicker({
  value, onChange,
}: { value: string | null; onChange: (v: string | null) => void }) {
  const presetAtivo = value === null ? null : PRESETS.find((p) => isoDaquiAMeses(p.meses) === value)?.meses;
  const [custom, setCustom] = useState(value !== null && presetAtivo === undefined);

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <Chip active={!custom && value === null} onClick={() => { setCustom(false); onChange(null); }}>Sem prazo</Chip>
        {PRESETS.map((p) => (
          <Chip
            key={p.meses}
            active={!custom && presetAtivo === p.meses}
            onClick={() => { setCustom(false); onChange(isoDaquiAMeses(p.meses)); }}
          >
            {p.label}
          </Chip>
        ))}
        <Chip active={custom} onClick={() => setCustom(true)}>Data exata</Chip>
      </div>

      {custom && (
        <div className="mt-3">
          <label className="mb-1 block text-body-sm text-nx-on-surface-variant">Vence em</label>
          <input
            type="date"
            min={isoHoje()}
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value || null)}
            className="bg-nx-container border border-nx-border rounded-xl px-3 py-2 text-body-sm text-nx-on-surface focus:outline-none focus:ring-1 focus:ring-nx-evo"
          />
        </div>
      )}
    </div>
  );
}
