import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { TrendingDown, TrendingUp, LineChart as LineChartIcon, Image as ImageIcon } from "lucide-react";
import { GLASS, dataCurta, type MedicaoItem, type FotoEvolucaoItem } from "../../lib/diario";

interface Props {
  medicoes: MedicaoItem[];
  fotos: FotoEvolucaoItem[];
  pesoMeta: number | null;
  objetivo: string;
}

const CAMPOS: { key: keyof MedicaoItem; label: string; un: string }[] = [
  { key: "peso", label: "Peso", un: "kg" },
  { key: "gordura", label: "Gordura", un: "%" },
  { key: "musculo", label: "Músculo", un: "%" },
  { key: "cintura", label: "Cintura", un: "cm" },
  { key: "quadril", label: "Quadril", un: "cm" },
  { key: "braco", label: "Braço", un: "cm" },
  { key: "coxa", label: "Coxa", un: "cm" },
];

export default function EvolucaoTab({ medicoes, fotos, pesoMeta, objetivo }: Props) {
  const temMedicoes = medicoes.length > 0;
  const primeira = medicoes[0];
  const ultima = medicoes[medicoes.length - 1];
  const serie = medicoes.map((m) => ({ data: dataCurta(m.data), peso: m.peso }));
  const deltaPeso = temMedicoes ? ultima.peso - primeira.peso : 0;

  if (!temMedicoes && fotos.length === 0) {
    return (
      <div className={`${GLASS} p-12 flex flex-col items-center justify-center text-center gap-2 max-w-2xl mx-auto`}>
        <LineChartIcon size={28} className="text-nx-primary" />
        <p className="text-body-lg">Sem medições ou fotos de evolução ainda.</p>
        <p className="text-body-sm text-nx-on-surface-variant">Os dados aparecem aqui conforme o paciente registra medidas e fotos.</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      {/* Gráfico de peso */}
      <div className={`${GLASS} p-6`}>
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-headline-md">Evolução de Peso</h3>
          {temMedicoes && (
            <span className={`flex items-center gap-1 text-body-sm font-bold ${deltaPeso <= 0 ? "text-nx-tertiary" : "text-nx-secondary"}`}>
              {deltaPeso <= 0 ? <TrendingDown size={16} /> : <TrendingUp size={16} />}
              {deltaPeso > 0 ? "+" : ""}{deltaPeso.toFixed(1)} kg
            </span>
          )}
        </div>
        <p className="text-body-sm text-nx-on-surface-variant mb-4">Objetivo: {objetivo}{pesoMeta ? ` · meta ${pesoMeta} kg` : ""}</p>
        {temMedicoes ? (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={serie} margin={{ top: 8, right: 12, bottom: 4, left: -12 }}>
                <XAxis dataKey="data" tick={{ fill: "#ccc3d8", fontSize: 11 }} axisLine={{ stroke: "#4a4455" }} tickLine={false} />
                <YAxis tick={{ fill: "#ccc3d8", fontSize: 11 }} axisLine={false} tickLine={false} domain={["dataMin - 2", "dataMax + 2"]} />
                <Tooltip
                  contentStyle={{ background: "#1a1a28", border: "1px solid #4a4455", borderRadius: 12, color: "#e3e0f4" }}
                  labelStyle={{ color: "#ccc3d8" }}
                  formatter={(v) => [`${v} kg`, "Peso"]}
                />
                {pesoMeta && <ReferenceLine y={pesoMeta} stroke="#4edea3" strokeDasharray="4 4" label={{ value: "meta", fill: "#4edea3", fontSize: 10, position: "insideTopRight" }} />}
                <Line type="monotone" dataKey="peso" stroke="#d2bbff" strokeWidth={2.5} dot={{ fill: "#d2bbff", r: 3 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-body-sm text-nx-on-surface-variant py-8 text-center">Sem medições de peso registradas.</p>
        )}
      </div>

      {/* Medidas atuais */}
      {temMedicoes && (
        <div className={`${GLASS} p-6`}>
          <h4 className="text-label-md font-bold uppercase tracking-wider text-nx-on-surface-variant mb-4">
            Medidas atuais · {dataCurta(ultima.data)}
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {CAMPOS.map((c) => {
              const val = ultima[c.key] as number | null;
              if (val == null) return null;
              const ini = primeira[c.key] as number | null;
              const delta = ini != null ? val - ini : null;
              return (
                <div key={String(c.key)} className="p-3 bg-nx-container-low rounded-xl">
                  <span className="text-label-sm text-nx-on-surface-variant block">{c.label}</span>
                  <span className="text-headline-md font-bold">{val}<span className="text-body-sm font-normal text-nx-on-surface-variant"> {c.un}</span></span>
                  {delta != null && delta !== 0 && (
                    <span className={`block text-label-sm ${delta < 0 ? "text-nx-tertiary" : "text-nx-secondary"}`}>
                      {delta > 0 ? "+" : ""}{delta.toFixed(1)} {c.un}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          {ultima.observacoes && <p className="text-body-sm text-nx-on-surface-variant mt-4 italic">"{ultima.observacoes}"</p>}
        </div>
      )}

      {/* Fotos de evolução */}
      <div className={`${GLASS} p-6`}>
        <div className="flex items-center gap-2 mb-4">
          <ImageIcon size={18} className="text-nx-primary" />
          <h4 className="text-label-md font-bold uppercase tracking-wider text-nx-on-surface-variant">Fotos de Evolução</h4>
        </div>
        {fotos.length === 0 ? (
          <p className="text-body-sm text-nx-on-surface-variant">Nenhuma foto de evolução enviada.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {fotos.map((f) => (
              <div key={f.id} className="rounded-xl overflow-hidden border border-nx-outline-variant bg-nx-container-low">
                <img src={f.imagem} alt={f.tipo} className="w-full h-40 object-cover" />
                <div className="px-3 py-2 flex justify-between items-center">
                  <span className="text-label-sm text-nx-on-surface-variant capitalize">{f.tipo}</span>
                  <span className="text-label-sm text-nx-on-surface-variant">{dataCurta(f.data)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
