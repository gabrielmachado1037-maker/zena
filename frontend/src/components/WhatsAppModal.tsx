import { useState, useEffect } from "react";
import { X, MessageCircle, Copy, ExternalLink, Check } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  gerarMensagemWhatsApp,
  gerarUrlWhatsApp,
  type TemplateWhatsApp,
  type WhatsAppContext,
} from "../lib/utils";
import api from "../lib/api";

interface Props {
  context: WhatsAppContext;
  template: TemplateWhatsApp;
  onClose: () => void;
}

const templateLabels: Record<TemplateWhatsApp, string> = {
  lembrete_consulta: "Lembrete de consulta",
  confirmar_consulta: "Confirmar consulta",
  envio_plano: "Enviar plano alimentar",
  lembrete_checkin: "Lembrete de check-in",
  lembrete_cobranca: "Lembrete de cobrança",
  aniversario: "Parabéns",
};

const templateEmojis: Record<TemplateWhatsApp, string> = {
  lembrete_consulta: "📅",
  confirmar_consulta: "✅",
  envio_plano: "🥗",
  lembrete_checkin: "✨",
  lembrete_cobranca: "💚",
  aniversario: "🎂",
};

export default function WhatsAppModal({ context, template, onClose }: Props) {
  const [copiado, setCopiado] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [activeTemplate, setActiveTemplate] = useState<TemplateWhatsApp>(template);

  const texto = gerarMensagemWhatsApp(activeTemplate, context);
  const temTelefone = !!context.pacienteTelefone;
  const urlWA = temTelefone
    ? gerarUrlWhatsApp(context.pacienteTelefone!, texto)
    : null;

  function copiar() {
    navigator.clipboard.writeText(texto);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  async function abrirWhatsApp() {
    if (urlWA) {
      window.open(urlWA, "_blank");
      await logMensagem();
    }
  }

  async function logMensagem() {
    if (enviado || !context.pacienteId) return;
    try {
      await api.post("/mensagens", {
        pacienteId: context.pacienteId,
        template: activeTemplate,
        textoEnviado: texto,
      });
      setEnviado(true);
    } catch {
      // silent
    }
  }

  const templates: TemplateWhatsApp[] = [
    "confirmar_consulta",
    "lembrete_consulta",
    "envio_plano",
    "lembrete_checkin",
    "lembrete_cobranca",
    "aniversario",
  ];

  // Format message for display (replace *bold* and newlines)
  const linhas = texto.split("\n");

  const hora = format(new Date(), "HH:mm");

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zena-cream">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#25D366]/10 flex items-center justify-center">
              <MessageCircle size={20} className="text-[#25D366]" />
            </div>
            <div>
              <h2 className="text-zena-text-dark font-bold">Mensagem WhatsApp</h2>
              <p className="text-zena-text-light text-xs">Para {context.pacienteNome.split(" ")[0]}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-zena-text-light hover:text-zena-text-mid p-1">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 grid md:grid-cols-2 gap-6">
          {/* Esquerda: seletor de templates + telefone */}
          <div className="space-y-4">
            <div>
              <p className="text-zena-text-mid text-sm font-medium mb-2">Tipo de mensagem</p>
              <div className="space-y-2">
                {templates.map((t) => (
                  <button
                    key={t}
                    onClick={() => setActiveTemplate(t)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all text-sm ${
                      activeTemplate === t
                        ? "border-[#25D366] bg-[#25D366]/5 text-zena-text-dark"
                        : "border-zena-mint/30 text-zena-text-mid hover:border-zena-green-light"
                    }`}
                  >
                    <span className="text-lg">{templateEmojis[t]}</span>
                    {templateLabels[t]}
                  </button>
                ))}
              </div>
            </div>

            {!temTelefone && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-amber-700 text-xs font-medium">Telefone não cadastrado</p>
                <p className="text-amber-600 text-xs mt-1">Adicione o número da paciente para abrir o WhatsApp diretamente. Por enquanto, copie a mensagem.</p>
              </div>
            )}

            {enviado && (
              <div className="flex items-center gap-2 bg-zena-green-light/10 border border-zena-green-light/30 rounded-xl px-4 py-3">
                <Check size={14} className="text-zena-green-mid" />
                <p className="text-zena-green-dark text-xs font-medium">Mensagem registrada no histórico</p>
              </div>
            )}
          </div>

          {/* Direita: mockup de celular */}
          <div className="flex flex-col items-center">
            <p className="text-zena-text-light text-xs mb-3 self-start">Prévia da mensagem</p>
            {/* Phone frame */}
            <div className="w-[230px] bg-gray-900 rounded-[28px] p-1.5 shadow-2xl">
              {/* Screen */}
              <div className="bg-white rounded-[22px] overflow-hidden">
                {/* WhatsApp header */}
                <div className="bg-[#128C7E] px-3 py-2.5 flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-[#25D366] flex items-center justify-center text-white text-xs font-bold">
                    {context.pacienteNome[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-xs font-semibold truncate">{context.pacienteNome.split(" ")[0]}</p>
                    <p className="text-white/70 text-[9px]">online</p>
                  </div>
                </div>

                {/* Chat */}
                <div
                  className="p-2 min-h-[220px]"
                  style={{ background: "#ECE5DD url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23c5b9a8' fill-opacity='0.15'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }}
                >
                  {/* Message bubble */}
                  <div className="flex justify-end">
                    <div className="bg-[#DCF8C6] rounded-[12px] rounded-tr-[3px] px-3 py-2 max-w-[85%] shadow-sm">
                      <div className="text-[10px] text-gray-800 leading-relaxed space-y-1">
                        {linhas.map((linha, i) => {
                          if (!linha) return <div key={i} className="h-1" />;
                          // Render *bold* as bold
                          const parts = linha.split(/(\*[^*]+\*)/g);
                          return (
                            <p key={i}>
                              {parts.map((part, j) =>
                                part.startsWith("*") && part.endsWith("*")
                                  ? <strong key={j}>{part.slice(1, -1)}</strong>
                                  : part
                              )}
                            </p>
                          );
                        })}
                      </div>
                      <div className="flex items-center justify-end gap-1 mt-1">
                        <span className="text-[8px] text-gray-400">{hora}</span>
                        <svg width="11" height="8" viewBox="0 0 16 11" className="text-[#4FC3F7]" fill="currentColor">
                          <path d="M11.071.653a.75.75 0 0 1 1.06 0l.707.707L8.5 5.698l-.353-.354L11.071.653zM.22 5.78L5 10.56l.707-.707L1.634 5.78.22 5.78zm3.538 4.073l-.707.707L8.5 5.713 7.793 5 3.758 9.853z"/>
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Input bar */}
                <div className="bg-[#F0F0F0] px-2 py-1.5 flex items-center gap-1.5">
                  <div className="flex-1 bg-white rounded-full px-3 py-1">
                    <p className="text-[9px] text-gray-400">Mensagem</p>
                  </div>
                  <div className="w-6 h-6 rounded-full bg-[#25D366] flex items-center justify-center">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="white"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex gap-3 p-6 pt-0">
          <button
            onClick={copiar}
            className="flex items-center gap-2 flex-1 justify-center py-3 rounded-xl border border-zena-mint/50 text-zena-text-mid text-sm font-medium hover:bg-zena-cream transition-all"
          >
            {copiado ? <Check size={16} className="text-zena-green-mid" /> : <Copy size={16} />}
            {copiado ? "Copiado!" : "Copiar mensagem"}
          </button>
          <button
            onClick={abrirWhatsApp}
            disabled={!temTelefone}
            className="flex items-center gap-2 flex-1 justify-center py-3 rounded-xl bg-[#25D366] hover:bg-[#20BD5C] text-white text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ExternalLink size={16} />
            Abrir WhatsApp
          </button>
        </div>
      </div>
    </div>
  );
}
