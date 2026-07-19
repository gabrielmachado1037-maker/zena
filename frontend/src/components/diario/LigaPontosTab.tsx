import { Award, Flame, Trophy, Zap, Star } from "lucide-react";
import { calcularLiga, progressoLiga, formatarXp, CORES_LIGA } from "../../lib/ligas";
import {
  GLASS, dataCurta, rotuloTipoPontos,
  type PontosLogItem, type StreakMarcoItem, type ConquistaItem,
} from "../../lib/diario";

interface PacienteLiga {
  pontosTotal: number;
  ligaAtual: string;
  ligaNivel: string;
  streakAtual: number;
  streakMaximo: number;
}

interface Props {
  paciente: PacienteLiga;
  pontosLog: PontosLogItem[];
  streakMarcos: StreakMarcoItem[];
  conquistas: ConquistaItem[];
  rankPos: number | null;
}

export default function LigaPontosTab({ paciente, pontosLog, streakMarcos, conquistas, rankPos }: Props) {
  const cor = CORES_LIGA[paciente.ligaAtual] ?? "#F59E0B";
  const prog = progressoLiga(paciente.pontosTotal);
  const atual = calcularLiga(paciente.pontosTotal);

  // Agrega pontos por tipo de lançamento.
  const porTipo = new Map<string, number>();
  pontosLog.forEach((p) => porTipo.set(p.tipo, (porTipo.get(p.tipo) ?? 0) + p.pontos));
  const linhas = [...porTipo.entries()].map(([tipo, pontos]) => ({ tipo, pontos })).sort((a, b) => b.pontos - a.pontos);
  const maxP = Math.max(...linhas.map((l) => l.pontos), 1);
  const totalLog = linhas.reduce((s, l) => s + l.pontos, 0);

  return (
    <div className="max-w-5xl mx-auto grid grid-cols-12 gap-4">
      {/* Card de liga */}
      <div className={`${GLASS} p-6 col-span-12 lg:col-span-8`}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-headline-md">Progresso na Liga</h3>
          {rankPos != null && <span className="text-body-sm font-bold" style={{ color: cor }}>#{rankPos} no Ranking</span>}
        </div>
        <div className="flex items-center gap-5 mb-5">
          <div className="w-20 h-20 rounded-full flex items-center justify-center border-2 shrink-0" style={{ background: `${cor}22`, borderColor: `${cor}66`, boxShadow: `0 0 20px ${cor}40` }}>
            <Award size={36} style={{ color: cor }} />
          </div>
          <div className="flex-grow min-w-0">
            <p className="text-headline-md font-bold" style={{ color: cor }}>{atual.liga} {atual.nivel}</p>
            <div className="flex justify-between items-center mt-2 mb-1 gap-2">
              <span className="text-label-md text-nx-on-surface-variant truncate">
                {prog.proxima ? `Promoção para ${prog.proxima.liga} ${prog.proxima.nivel}` : "Nível máximo atingido"}
              </span>
              <span className="text-label-sm text-nx-on-surface-variant shrink-0">{formatarXp(paciente.pontosTotal)} pts</span>
            </div>
            <div className="w-full bg-nx-container-high h-2 rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${prog.pct}%`, background: cor, boxShadow: `0 0 8px ${cor}80` }} />
            </div>
            {prog.proxima && <p className="text-label-sm text-nx-on-surface-variant mt-1">faltam {prog.faltam} pts</p>}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 bg-nx-container-low rounded-xl text-center">
            <span className="text-label-sm text-nx-on-surface-variant block mb-1">XP Total</span>
            <span className="text-headline-md font-bold text-nx-tertiary">{formatarXp(paciente.pontosTotal)}</span>
          </div>
          <div className="p-3 bg-nx-container-low rounded-xl text-center">
            <span className="text-label-sm text-nx-on-surface-variant block mb-1">Streak atual</span>
            <span className="text-headline-md font-bold flex items-center justify-center gap-1"><Flame size={18} className="text-nx-primary" />{paciente.streakAtual}</span>
          </div>
          <div className="p-3 bg-nx-container-low rounded-xl text-center">
            <span className="text-label-sm text-nx-on-surface-variant block mb-1">Streak máx.</span>
            <span className="text-headline-md font-bold">{paciente.streakMaximo}</span>
          </div>
        </div>
      </div>

      {/* Marcos de streak */}
      <div className={`${GLASS} p-6 col-span-12 lg:col-span-4`}>
        <div className="flex items-center gap-2 mb-4">
          <Star size={18} className="text-league-gold" />
          <h4 className="text-label-md font-bold uppercase tracking-wider text-nx-on-surface-variant">Marcos de Streak</h4>
        </div>
        {streakMarcos.length === 0 ? (
          <p className="text-body-sm text-nx-on-surface-variant">Nenhum marco de sequência ainda.</p>
        ) : (
          <ul className="space-y-3">
            {streakMarcos.slice(0, 6).map((m) => (
              <li key={m.id} className="flex items-center justify-between">
                <span className="text-body-sm flex items-center gap-2"><Flame size={15} className="text-nx-primary" />{m.marco} dias</span>
                <span className="text-label-sm font-bold text-nx-tertiary">+{m.pontosBonus} XP</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Composição dos pontos */}
      <div className={`${GLASS} p-6 col-span-12 lg:col-span-7`}>
        <div className="flex items-center gap-2 mb-4">
          <Zap size={18} className="text-nx-primary" />
          <h4 className="text-label-md font-bold uppercase tracking-wider text-nx-on-surface-variant">Composição dos Pontos</h4>
        </div>
        {linhas.length === 0 ? (
          <p className="text-body-sm text-nx-on-surface-variant">Sem histórico de pontos registrado.</p>
        ) : (
          <div className="space-y-3">
            {linhas.map((l) => (
              <div key={l.tipo}>
                <div className="flex justify-between text-label-sm mb-1">
                  <span className="text-nx-on-surface-variant">{rotuloTipoPontos(l.tipo)}</span>
                  <span className="font-bold">{formatarXp(l.pontos)} pts</span>
                </div>
                <div className="w-full h-1.5 bg-nx-container-high rounded-full overflow-hidden">
                  <div className="h-full bg-nx-primary rounded-full" style={{ width: `${(l.pontos / maxP) * 100}%` }} />
                </div>
              </div>
            ))}
            <p className="text-label-sm text-nx-on-surface-variant pt-1">Total registrado: {totalLog} pts (últimos {pontosLog.length} lançamentos)</p>
          </div>
        )}
      </div>

      {/* Conquistas */}
      <div className={`${GLASS} p-6 col-span-12 lg:col-span-5`}>
        <div className="flex items-center gap-2 mb-4">
          <Trophy size={18} className="text-league-gold" />
          <h4 className="text-label-md font-bold uppercase tracking-wider text-nx-on-surface-variant">Conquistas</h4>
        </div>
        {conquistas.length === 0 ? (
          <p className="text-body-sm text-nx-on-surface-variant">Nenhuma conquista desbloqueada.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {conquistas.map((c) => (
              <div key={c.id} className="p-3 bg-nx-container-low rounded-xl flex items-start gap-3">
                <div className="text-xl leading-none">{c.icone || "🏅"}</div>
                <div className="min-w-0">
                  <p className="text-body-sm font-bold truncate">{c.titulo}</p>
                  <p className="text-label-sm text-nx-on-surface-variant">{dataCurta(c.createdAt)}{c.pontosBonus ? ` · +${c.pontosBonus} XP` : ""}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
