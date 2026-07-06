import type { Liga, Registro, TipoRegistro } from "../../lib/registros";
import GlassPanel from "./GlassPanel";

// Strings literais p/ o JIT do Tailwind emitir os utilitários (nada de interpolação).
const FRAME: Record<Liga, string> = {
  bronze: "league-frame-bronze",
  silver: "league-frame-silver",
  gold: "league-frame-gold",
  diamond: "league-frame-diamond",
  master: "league-frame-master",
  legendary: "league-frame-legendary",
};
const BADGE_BG: Record<Liga, string> = {
  bronze: "bg-league-bronze",
  silver: "bg-league-silver",
  gold: "bg-league-gold",
  diamond: "bg-league-diamond",
  master: "bg-league-master",
  legendary: "bg-league-legendary",
};

interface ChipCfg {
  icon: string;
  label: string;
  wrap: string; // classes do container do chip
  text: string; // cor do texto/ícone
}

interface BtnCfg {
  label?: string;
  icon: string;
  kind: "primary" | "secondary" | "ghost";
  acao: "validar" | "ajustar" | "nudge" | "chat";
}

const BORDA: Record<TipoRegistro, string> = {
  excecao: "border-l-nx-secondary",
  treino: "border-l-nx-tertiary",
  refeicao: "border-l-nx-primary",
  furtada: "border-l-nx-error",
};

const CHIP: Record<TipoRegistro, ChipCfg> = {
  excecao: {
    icon: "warning",
    label: "Exceção Registrada",
    wrap: "bg-nx-container-high border border-nx-secondary/30",
    text: "text-nx-secondary",
  },
  treino: {
    icon: "check_circle",
    label: "Meta Atingida",
    wrap: "bg-nx-tertiary/10 border border-nx-tertiary/30",
    text: "text-nx-tertiary",
  },
  refeicao: {
    icon: "verified",
    label: "Conforme Prescrito",
    wrap: "bg-nx-primary/10 border border-nx-primary/30",
    text: "text-nx-primary",
  },
  furtada: {
    icon: "no_meals",
    label: "Baixa Adesão",
    wrap: "bg-nx-error/10 border border-nx-error/30",
    text: "text-nx-error",
  },
};

const BOTOES: Record<TipoRegistro, BtnCfg[]> = {
  excecao: [
    { label: "Validar Registro", icon: "done_all", kind: "primary", acao: "validar" },
    { label: "Ajustar Plano", icon: "edit_note", kind: "secondary", acao: "ajustar" },
    { icon: "chat_bubble", kind: "ghost", acao: "chat" },
  ],
  treino: [
    { label: "Validar Registro", icon: "done_all", kind: "primary", acao: "validar" },
    { label: "Enviar Nudge", icon: "notifications_active", kind: "secondary", acao: "nudge" },
    { icon: "chat_bubble", kind: "ghost", acao: "chat" },
  ],
  refeicao: [
    { label: "Validar Registro", icon: "done_all", kind: "primary", acao: "validar" },
    { icon: "chat_bubble", kind: "ghost", acao: "chat" },
  ],
  furtada: [
    { label: "Validar Registro", icon: "done_all", kind: "primary", acao: "validar" },
    { label: "Ajustar Plano", icon: "edit_note", kind: "secondary", acao: "ajustar" },
    { icon: "chat_bubble", kind: "ghost", acao: "chat" },
  ],
};

function botaoClasse(kind: BtnCfg["kind"]): string {
  if (kind === "primary")
    return "flex-1 bg-nx-primary text-nx-on-primary font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all hover:brightness-110 active:scale-95 disabled:opacity-60";
  if (kind === "secondary")
    return "flex-1 bg-nx-container-high text-nx-on-surface font-bold py-2.5 rounded-xl border border-nx-outline-variant flex items-center justify-center gap-2 hover:bg-[#343342]/50 transition-all disabled:opacity-60";
  return "px-4 py-2.5 rounded-xl border border-nx-outline-variant font-bold flex items-center justify-center gap-2 hover:bg-[#343342]/30 transition-all text-nx-on-surface-variant";
}

function iniciais(nome: string) {
  return nome.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
}

interface Props {
  registro: Registro;
  onValidar: (id: string) => void;
  onAjustar: (pacienteId: string) => void;
  onNudge: (pacienteId: string) => void;
  onChat: (pacienteId: string) => void;
  enviando?: boolean;
}

export default function RecordCard({ registro, onValidar, onAjustar, onNudge, onChat, enviando }: Props) {
  const chip = CHIP[registro.tipo];
  const alturaImg = registro.tipo === "excecao" ? "h-72" : "h-64";

  function disparar(acao: BtnCfg["acao"]) {
    if (acao === "validar") onValidar(registro.id);
    else if (acao === "ajustar") onAjustar(registro.pacienteId);
    else if (acao === "nudge") onNudge(registro.pacienteId);
    else onChat(registro.pacienteId);
  }

  return (
    <GlassPanel
      className={`rounded-2xl overflow-hidden border-l-4 ${BORDA[registro.tipo]} transition-transform hover:scale-[1.01] duration-300`}
    >
      <div className="p-6">
        {/* Cabeçalho — canal privado */}
        <div className="flex items-center justify-between mb-4 pb-4 border-b border-nx-outline-variant/30">
          <div className="flex items-center gap-2 text-label-sm font-bold text-nx-outline uppercase tracking-wider">
            <span className="material-symbols-outlined text-sm" data-icon="lock">lock</span>
            <span>Canal Privado • Log Clínico</span>
          </div>
          <span className="text-label-sm text-nx-on-surface-variant">Visível apenas para o Nutricionista</span>
        </div>

        {/* Identificação + chip de status */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              {registro.avatar ? (
                <img
                  alt={registro.paciente}
                  src={registro.avatar}
                  className={`w-12 h-12 rounded-full ${FRAME[registro.liga]} object-cover`}
                />
              ) : (
                <div className={`w-12 h-12 rounded-full ${FRAME[registro.liga]} bg-nx-container-high flex items-center justify-center text-label-md font-bold text-nx-on-surface-variant`}>
                  {iniciais(registro.paciente)}
                </div>
              )}
              <div
                className={`absolute -bottom-1 -right-1 ${BADGE_BG[registro.liga]} text-[8px] px-1 rounded-full font-bold text-nx-bg-lowest`}
              >
                {registro.ligaLabel}
              </div>
            </div>
            <div>
              <h4 className="font-bold text-body-md text-nx-primary">{registro.paciente}</h4>
              <p className="text-label-sm text-nx-on-surface-variant flex items-center gap-1">
                <span className="material-symbols-outlined text-[12px]" data-icon="schedule">schedule</span>
                {registro.horario} • {registro.tipoTexto}
              </p>
            </div>
          </div>
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${chip.wrap}`}>
            <span className={`material-symbols-outlined text-sm ${chip.text}`} data-icon={chip.icon}>
              {chip.icon}
            </span>
            <span className={`text-label-md font-bold ${chip.text}`}>{chip.label}</span>
          </div>
        </div>

        {/* Texto (citação) */}
        {registro.texto && (
          <p className="text-body-md text-nx-on-surface-variant mb-4 leading-relaxed bg-nx-container/50 p-4 rounded-xl border border-nx-outline-variant/30 italic">
            {registro.texto}
          </p>
        )}

        {/* Imagem do registro */}
        {registro.imagem && (
          <div className="bg-nx-container-low rounded-xl p-2 mb-4 border border-nx-outline-variant/30">
            <img alt="Registro" src={registro.imagem} className={`w-full ${alturaImg} object-cover rounded-lg`} />
          </div>
        )}

        {/* Ações */}
        {registro.revisado ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-nx-tertiary font-bold">
              <span className="material-symbols-outlined text-sm" data-icon="check_circle">check_circle</span>
              Registro validado
            </div>
            <button
              onClick={() => onChat(registro.pacienteId)}
              className="px-4 py-2 rounded-xl border border-nx-outline-variant text-nx-on-surface-variant hover:bg-[#343342]/30 transition-all"
            >
              <span className="material-symbols-outlined text-sm" data-icon="chat_bubble">chat_bubble</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            {BOTOES[registro.tipo].map((b, i) => (
              <button
                key={i}
                onClick={() => disparar(b.acao)}
                disabled={enviando && (b.acao === "validar" || b.acao === "nudge")}
                className={botaoClasse(b.kind)}
              >
                <span className="material-symbols-outlined text-sm" data-icon={b.icon}>{b.icon}</span>
                {b.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </GlassPanel>
  );
}
