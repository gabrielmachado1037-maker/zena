import type { Conversa } from "../../lib/mensagens";
import { formatData } from "../../lib/mensagens";
import Avatar from "./Avatar";

interface Props {
  conversa: Conversa;
  onVerPerfil: () => void;
  onAjustarPlano: () => void;
}

// Coluna direita — Contexto do Paciente (w-300px): mini card de perfil,
// grid de stats, botões de ação e card de alerta de risco (só se houver risco).
export default function PatientContextPanel({ conversa, onVerPerfil, onAjustarPlano }: Props) {
  return (
    <div className="w-[300px] flex-shrink-0 flex flex-col gap-4">
      {/* Mini Profile Card */}
      <div className="glass-panel rounded-xl p-6 flex flex-col items-center text-center relative overflow-hidden group">
        <div className="absolute top-0 inset-x-0 h-24 bg-gradient-to-b from-nx-primary/20 to-transparent" />
        <div className="relative w-24 h-24 mb-4 mt-2">
          <div className="absolute inset-0 rounded-full bg-nx-primary blur-md opacity-30 group-hover:opacity-60 transition-opacity" />
          <Avatar
            url={conversa.avatarUrl}
            nome={conversa.nome}
            className="w-full h-full rounded-full border-2 border-nx-surface relative z-10 text-lg"
          />
        </div>
        <h3 className="text-headline-md text-nx-on-surface mb-1">{conversa.nome}</h3>
        <p className="text-body-sm text-nx-on-surface-variant mb-6">Objetivo: {conversa.objetivo}</p>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 w-full mb-6">
          <div className="bg-nx-container-high rounded-lg p-3 flex flex-col items-center">
            <span className="material-symbols-outlined text-league-gold mb-1" style={{ fontVariationSettings: "'FILL' 1" }}>
              workspace_premium
            </span>
            <span className="text-label-sm text-nx-on-surface-variant uppercase">Liga Atual</span>
            <span className="text-label-md text-nx-on-surface mt-1">{conversa.ligaAtual}</span>
          </div>
          <div className="bg-nx-container-high rounded-lg p-3 flex flex-col items-center">
            <span className="material-symbols-outlined text-nx-tertiary mb-1" style={{ fontVariationSettings: "'FILL' 1" }}>
              local_fire_department
            </span>
            <span className="text-label-sm text-nx-on-surface-variant uppercase">Streak</span>
            <span className="text-label-md text-nx-on-surface mt-1">{conversa.streak}</span>
          </div>
        </div>

        <div className="w-full flex justify-between items-center py-3 border-t border-nx-primary-container/10 border-b mb-6">
          <span className="text-body-sm text-nx-on-surface-variant">Última Consulta</span>
          <span className="text-label-md text-nx-on-surface">{formatData(conversa.ultimaConsulta)}</span>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3 w-full">
          <button
            onClick={onVerPerfil}
            className="w-full py-2.5 rounded-lg border border-nx-primary text-nx-primary text-label-md hover:bg-nx-primary/10 transition-colors flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">person</span>
            Ver Perfil Completo
          </button>
          <button
            onClick={onAjustarPlano}
            className="w-full py-2.5 rounded-lg bg-nx-primary-container text-nx-on-primary-container text-label-md hover:bg-nx-primary transition-colors flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">edit_document</span>
            Ajustar Plano
          </button>
        </div>
      </div>
    </div>
  );
}
