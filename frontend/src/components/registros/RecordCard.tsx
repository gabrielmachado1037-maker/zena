import {
  Lock, Clock, AlertTriangle, CheckCircle2, BadgeCheck, UtensilsCrossed,
  CheckCheck, SquarePen, MessageCircle, BellRing, type LucideIcon,
} from "lucide-react";
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
  icon: LucideIcon;
  label: string;
  wrap: string; // classes do container do chip
  text: string; // cor do texto/ícone
}

interface BtnCfg {
  label?: string;
  icon: LucideIcon;
  kind: "primary" | "secondary" | "ghost";
  acao: "validar" | "ajustar" | "nudge" | "chat";
}

// "Uma cor, uma função": exceção=laranja/atenção, meta=verde, conforme=azul, baixa adesão=vermelho.
const CHIP: Record<TipoRegistro, ChipCfg> = {
  excecao: {
    icon: AlertTriangle,
    label: "Exceção Registrada",
    wrap: "bg-nx-streak/10 border border-nx-streak/30",
    text: "text-nx-streak",
  },
  treino: {
    icon: CheckCircle2,
    label: "Meta Atingida",
    wrap: "bg-nx-evo/10 border border-nx-evo/30",
    text: "text-nx-evo",
  },
  refeicao: {
    icon: BadgeCheck,
    label: "Conforme Prescrito",
    wrap: "bg-nx-water/10 border border-nx-water/30",
    text: "text-nx-water",
  },
  furtada: {
    icon: UtensilsCrossed,
    label: "Baixa Adesão",
    wrap: "bg-nx-danger/10 border border-nx-danger/30",
    text: "text-nx-danger",
  },
};

const BOTOES: Record<TipoRegistro, BtnCfg[]> = {
  excecao: [
    { label: "Validar Registro", icon: CheckCheck, kind: "primary", acao: "validar" },
    { label: "Ajustar Plano", icon: SquarePen, kind: "secondary", acao: "ajustar" },
    { icon: MessageCircle, kind: "ghost", acao: "chat" },
  ],
  treino: [
    { label: "Validar Registro", icon: CheckCheck, kind: "primary", acao: "validar" },
    { label: "Enviar Nudge", icon: BellRing, kind: "secondary", acao: "nudge" },
    { icon: MessageCircle, kind: "ghost", acao: "chat" },
  ],
  refeicao: [
    { label: "Validar Registro", icon: CheckCheck, kind: "primary", acao: "validar" },
    { icon: MessageCircle, kind: "ghost", acao: "chat" },
  ],
  furtada: [
    { label: "Validar Registro", icon: CheckCheck, kind: "primary", acao: "validar" },
    { label: "Ajustar Plano", icon: SquarePen, kind: "secondary", acao: "ajustar" },
    { icon: MessageCircle, kind: "ghost", acao: "chat" },
  ],
};

function botaoClasse(kind: BtnCfg["kind"]): string {
  if (kind === "primary")
    return "flex-1 bg-nx-evo text-nx-on-evo font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all hover:bg-nx-evo-2 active:scale-95 disabled:opacity-60";
  if (kind === "secondary")
    return "flex-1 bg-nx-container-high text-nx-on-surface font-bold py-2.5 rounded-xl border border-nx-border flex items-center justify-center gap-2 hover:bg-nx-surface-hover transition-all disabled:opacity-60";
  return "px-4 py-2.5 rounded-xl border border-nx-border font-bold flex items-center justify-center gap-2 hover:bg-nx-surface-hover transition-all text-nx-on-surface-variant";
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
  const ChipIcon = chip.icon;
  const alturaImg = registro.tipo === "excecao" ? "h-72" : "h-64";

  function disparar(acao: BtnCfg["acao"]) {
    if (acao === "validar") onValidar(registro.id);
    else if (acao === "ajustar") onAjustar(registro.pacienteId);
    else if (acao === "nudge") onNudge(registro.pacienteId);
    else onChat(registro.pacienteId);
  }

  return (
    <GlassPanel
      className="rounded-2xl overflow-hidden transition-transform hover:scale-[1.01] duration-300"
    >
      <div className="p-6">
        {/* Cabeçalho — canal privado */}
        <div className="flex items-center justify-between mb-4 pb-4 border-b border-nx-border">
          <div className="flex items-center gap-2 text-label-sm font-bold text-nx-on-surface-variant uppercase tracking-wider">
            <Lock size={13} />
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
              <h4 className="font-bold text-body-md text-nx-on-surface">{registro.paciente}</h4>
              <p className="text-label-sm text-nx-on-surface-variant flex items-center gap-1">
                <Clock size={12} />
                {registro.horario} • {registro.tipoTexto}
              </p>
            </div>
          </div>
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${chip.wrap}`}>
            <ChipIcon size={15} className={chip.text} />
            <span className={`text-label-md font-bold ${chip.text}`}>{chip.label}</span>
          </div>
        </div>

        {/* Texto (citação) */}
        {registro.texto && (
          <p className="text-body-md text-nx-on-surface-variant mb-4 leading-relaxed bg-nx-container/50 p-4 rounded-xl border border-nx-border italic">
            {registro.texto}
          </p>
        )}

        {/* Imagem do registro */}
        {registro.imagem && (
          <div className="bg-nx-container-low rounded-xl p-2 mb-4 border border-nx-border">
            <img alt="Registro" src={registro.imagem} className={`w-full ${alturaImg} object-cover rounded-lg`} />
          </div>
        )}

        {/* Ações */}
        {registro.revisado ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-nx-evo font-bold">
              <CheckCircle2 size={16} />
              Registro validado
            </div>
            <button
              onClick={() => onChat(registro.pacienteId)}
              className="px-4 py-2 rounded-xl border border-nx-border text-nx-on-surface-variant hover:bg-nx-surface-hover transition-all"
            >
              <MessageCircle size={16} />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            {BOTOES[registro.tipo].map((b, i) => {
              const BtnIcon = b.icon;
              return (
                <button
                  key={i}
                  onClick={() => disparar(b.acao)}
                  disabled={enviando && (b.acao === "validar" || b.acao === "nudge")}
                  className={botaoClasse(b.kind)}
                >
                  <BtnIcon size={16} />
                  {b.label}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </GlassPanel>
  );
}
