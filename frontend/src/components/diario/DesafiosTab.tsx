import { CheckCircle2, Trophy, Target } from "lucide-react";
import { GLASS, dataCurta, type DesafioProgressoItem } from "../../lib/diario";

function DesafioCard({ item }: { item: DesafioProgressoItem }) {
  const d = item.desafio;
  const pct = Math.max(0, Math.min(100, Math.round(item.progresso)));
  const cor = item.concluido ? "#4edea3" : "#d2bbff";
  return (
    <div className={`${GLASS} p-5`}>
      <div className="flex items-start gap-3 mb-3">
        <div className="text-2xl leading-none">{d.icone || "🎯"}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-body-md font-bold truncate">{d.titulo}</h4>
            {item.concluido ? (
              <span className="flex items-center gap-1 text-label-sm font-bold text-nx-tertiary shrink-0">
                <CheckCircle2 size={14} /> Concluído
              </span>
            ) : (
              <span className="text-label-sm font-bold text-nx-primary shrink-0">Em curso</span>
            )}
          </div>
          {d.descricao && <p className="text-body-sm text-nx-on-surface-variant mt-0.5 line-clamp-2">{d.descricao}</p>}
        </div>
      </div>

      <div className="mb-2 flex justify-between items-center text-label-sm">
        <span className="text-nx-on-surface-variant">Progresso</span>
        <span className="font-bold" style={{ color: cor }}>{pct}%</span>
      </div>
      <div className="w-full h-2 bg-nx-container-high rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: cor, boxShadow: `0 0 8px ${cor}80` }} />
      </div>

      <div className="flex items-center justify-between mt-4 text-label-sm text-nx-on-surface-variant">
        <span className="flex items-center gap-1">
          <Trophy size={14} className="text-league-gold" /> +{d.pontosBonus} XP
        </span>
        <span>
          {d.dataInicio ? `${dataCurta(d.dataInicio)} – ${dataCurta(d.dataFim)}` : `${d.duracaoDias} dias`}
        </span>
      </div>
    </div>
  );
}

export default function DesafiosTab({ desafios }: { desafios: DesafioProgressoItem[] }) {
  const ativos = desafios.filter((d) => !d.concluido);
  const concluidos = desafios.filter((d) => d.concluido);

  if (desafios.length === 0) {
    return (
      <div className={`${GLASS} p-12 flex flex-col items-center justify-center text-center gap-2 max-w-2xl mx-auto`}>
        <Target size={28} className="text-nx-primary" />
        <p className="text-body-lg">Nenhum desafio para este paciente.</p>
        <p className="text-body-sm text-nx-on-surface-variant">Crie desafios no Centro de Desafios para engajá-lo.</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <section>
        <h3 className="text-label-md font-bold uppercase tracking-wider text-nx-on-surface-variant mb-3">
          Em curso · {ativos.length}
        </h3>
        {ativos.length === 0 ? (
          <p className="text-body-sm text-nx-on-surface-variant">Nenhum desafio ativo no momento.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ativos.map((d) => <DesafioCard key={d.id} item={d} />)}
          </div>
        )}
      </section>

      {concluidos.length > 0 && (
        <section>
          <h3 className="text-label-md font-bold uppercase tracking-wider text-nx-on-surface-variant mb-3">
            Concluídos · {concluidos.length}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {concluidos.map((d) => <DesafioCard key={d.id} item={d} />)}
          </div>
        </section>
      )}
    </div>
  );
}
