import { useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarPlus,
  ChevronDown,
  HeartHandshake,
  MessageCircle,
  PartyPopper,
  Send,
  Sparkles,
  User,
  type LucideIcon,
} from "lucide-react";
import { ButtonNx, LeagueBadge, LeagueCrest } from "../ui-nx";
import Avatar from "./Avatar";
import {
  enviarMensagem,
  formatData,
  formatHora,
  getThreadById,
  type Conversa,
  type Mensagem,
} from "../../lib/mensagens";
import {
  ACOES,
  agendarConsulta,
  formatQuando,
  intentLabel,
  msgConsultaAgendada,
  rascunho,
  streakNum,
  type CommTone,
  type Intent,
  type Situacao,
} from "../../lib/comunicacao";
import AgendarModal from "./AgendarModal";

interface Props {
  conversa: Conversa;
  situacao: Situacao;
  onEnviado: (id: string, previa: string) => void;
  onLida: (id: string) => void;
  onVerPerfil: () => void;
}

const ICON: Record<Intent, LucideIcon> = {
  responder: MessageCircle,
  incentivo: Sparkles,
  parabenizar: PartyPopper,
  cobrar: HeartHandshake,
  consulta: CalendarPlus,
};

const INK: Record<CommTone, string> = {
  water: "text-nx-water",
  gold: "text-nx-gold",
  danger: "text-nx-danger",
  evo: "text-nx-evo",
  streak: "text-nx-streak",
  neutral: "text-nx-on-surface-variant",
};

const BANNER: Record<CommTone, string> = {
  water: "border-nx-water/25 bg-nx-water/10",
  gold: "border-nx-gold/25 bg-nx-gold/10",
  danger: "border-nx-danger/25 bg-nx-danger/10",
  evo: "border-nx-evo/25 bg-nx-evo/10",
  streak: "border-nx-streak/25 bg-nx-streak/10",
  neutral: "border-nx-border bg-nx-container-high/40",
};

// Pílula de ação rápida — ativa = preenchida no tom, inativa = contorno tingido.
const ACTIVE: Record<CommTone, string> = {
  evo: "bg-nx-evo text-nx-on-evo border-nx-evo shadow-nx-evo",
  gold: "bg-nx-gold text-[#3a2b00] border-nx-gold",
  danger: "bg-nx-danger text-white border-nx-danger",
  water: "bg-nx-water text-[#04263f] border-nx-water",
  streak: "bg-nx-streak text-[#3a1e00] border-nx-streak",
  neutral: "bg-nx-container-high text-nx-on-surface border-nx-outline",
};
const IDLE: Record<CommTone, string> = {
  evo: "text-nx-evo border-nx-evo/25 hover:bg-nx-evo/10",
  gold: "text-nx-gold border-nx-gold/25 hover:bg-nx-gold/10",
  danger: "text-nx-danger border-nx-danger/25 hover:bg-nx-danger/10",
  water: "text-nx-water border-nx-water/25 hover:bg-nx-water/10",
  streak: "text-nx-streak border-nx-streak/25 hover:bg-nx-streak/10",
  neutral: "text-nx-on-surface-variant border-nx-border hover:bg-nx-container-high",
};

function Bubble({ m }: { m: Mensagem }) {
  const nutri = m.autor === "nutri";
  return (
    <div className={"flex " + (nutri ? "justify-end" : "justify-start")}>
      <div
        className={
          "max-w-[80%] rounded-nx-md px-3.5 py-2.5 " +
          (nutri ? "bg-nx-evo/12 text-nx-on-surface" : "bg-nx-container-high text-nx-on-surface")
        }
      >
        {m.anexoUrl && (
          <a href={m.anexoUrl} target="_blank" rel="noreferrer">
            <img src={m.anexoUrl} alt="Anexo" className="mb-1.5 max-h-52 rounded-nx-sm object-cover" />
          </a>
        )}
        {m.texto && <p className="whitespace-pre-wrap text-body-sm">{m.texto}</p>}
        <span className="mt-1 block text-right text-[10px] text-nx-on-surface-variant">{m.hora}</span>
      </div>
    </div>
  );
}

/** Painel direito — a ação de comunicação: identidade, sugestão do dia, ações rápidas e conversa. */
export default function CommPanel({ conversa, situacao, onEnviado, onLida, onVerPerfil }: Props) {
  const [intent, setIntent] = useState<Intent>(situacao.intent);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [historico, setHistorico] = useState<Mensagem[]>([]);
  const [loadingHist, setLoadingHist] = useState(false);
  const [histAberto, setHistAberto] = useState(false);
  const [agendarOpen, setAgendarOpen] = useState(false);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const ligaNome = conversa.ligaAtual.split(" ")[0];
  const streak = streakNum(conversa.streak);

  // Ao trocar de paciente: reinicia sugestão/rascunho e carrega a conversa (marca lidas no servidor).
  useEffect(() => {
    setIntent(situacao.intent);
    setDraft(rascunho(situacao.intent, conversa));
    setHistAberto(situacao.intent === "responder");
    setFeedback(null);
    setAgendarOpen(false);

    let vivo = true;
    setLoadingHist(true);
    getThreadById(conversa.id, conversa.nome)
      .then((t) => {
        if (!vivo) return;
        setHistorico(t.mensagens);
        if (conversa.naoLidoCount > 0) onLida(conversa.id);
      })
      .catch(() => vivo && setHistorico([]))
      .finally(() => vivo && setLoadingHist(false));
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversa.id]);

  useEffect(() => () => clearTimeout(feedbackTimer.current), []);

  function flash(msg: string) {
    setFeedback(msg);
    clearTimeout(feedbackTimer.current);
    feedbackTimer.current = setTimeout(() => setFeedback(null), 3000);
  }

  function pick(i: Intent) {
    setIntent(i);
    setDraft(rascunho(i, conversa));
  }

  const ultimaDoPaciente = useMemo(
    () => [...historico].reverse().find((m) => m.autor === "paciente") ?? null,
    [historico],
  );

  async function enviar() {
    const t = draft.trim();
    if (!t || sending) return;
    setSending(true);
    const tmp: Mensagem = {
      id: `tmp-${historico.length}-${t.length}`,
      autor: "nutri",
      texto: t,
      hora: formatHora(new Date()),
      avatarUrl: null,
    };
    setHistorico((h) => [...h, tmp]);
    try {
      const salva = await enviarMensagem(conversa.id, t);
      setHistorico((h) => h.map((m) => (m.id === tmp.id ? { ...m, id: salva.id } : m)));
      setDraft("");
      setHistAberto(true);
      onEnviado(conversa.id, t);
      flash("Mensagem enviada ✓");
    } catch {
      setHistorico((h) => h.filter((m) => m.id !== tmp.id));
      flash("Falha ao enviar. Tente de novo.");
    } finally {
      setSending(false);
    }
  }

  async function confirmarAgenda(dataISO: string, tipo: string) {
    // Deixa o erro subir pro modal se a criação falhar (o modal mostra e mantém aberto).
    await agendarConsulta(conversa.id, dataISO, tipo);
    const quando = formatQuando(dataISO);
    const aviso = msgConsultaAgendada(quando);
    try {
      const salva = await enviarMensagem(conversa.id, aviso);
      setHistorico((h) => [
        ...h,
        { id: salva.id, autor: "nutri", texto: aviso, hora: formatHora(new Date()), avatarUrl: null },
      ]);
      onEnviado(conversa.id, aviso);
    } catch {
      /* consulta já foi marcada; aviso é best-effort */
    }
    setAgendarOpen(false);
    setHistAberto(true);
    flash(`Consulta marcada · ${quando}`);
  }

  const visiveis = histAberto ? historico : historico.slice(-4);
  const IntentIcon = ICON[intent];

  return (
    <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-nx-lg border border-nx-border bg-nx-surface">
      {/* Identidade do paciente */}
      <div className="flex items-center gap-4 border-b border-nx-border p-5">
        <div className="relative flex-shrink-0">
          <Avatar url={conversa.avatarUrl} nome={conversa.nome} className="size-14 rounded-full text-base" />
          <div className="absolute -bottom-1.5 -right-1.5">
            <LeagueCrest liga={ligaNome} size={26} animated={false} />
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-headline-md text-nx-on-surface">{conversa.nome}</h2>
          <p className="truncate text-body-sm text-nx-on-surface-variant">Objetivo: {conversa.objetivo}</p>
        </div>
        <ButtonNx variant="surface" size="sm" leftIcon={<User size={15} />} onClick={onVerPerfil}>
          Ver perfil
        </ButtonNx>
      </div>

      {/* Faixa de contexto rápido */}
      <div className="flex flex-wrap items-center gap-2 border-b border-nx-border px-5 py-3">
        <LeagueBadge liga={ligaNome} />
        <span className="inline-flex items-center gap-1.5 rounded-full border border-nx-streak/25 bg-nx-streak/10 px-2.5 py-1 text-label-md font-semibold text-nx-streak">
          🔥 {streak} {streak === 1 ? "dia" : "dias"}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-nx-border bg-nx-container-high px-2.5 py-1 text-label-md font-semibold text-nx-on-surface-variant">
          Consulta: {formatData(conversa.ultimaConsulta)}
        </span>
        {conversa.online && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-nx-evo/25 bg-nx-evo/10 px-2.5 py-1 text-label-md font-semibold text-nx-evo">
            <span className="size-1.5 rounded-full bg-nx-evo" /> Ativo hoje
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-5 overflow-y-auto hide-scrollbar p-5">
        {/* Sugestão do dia */}
        <div className={"rounded-nx-lg border p-4 " + BANNER[situacao.tone]}>
          <div className="flex items-center gap-2">
            <span className={INK[situacao.tone]}>
              {(() => {
                const I = ICON[situacao.intent];
                return <I size={16} />;
              })()}
            </span>
            <span className="text-label-md uppercase tracking-wider text-nx-on-surface-variant">Sugestão de hoje</span>
          </div>
          <p className="mt-2 text-body-md text-nx-on-surface">
            <span className={"font-semibold " + INK[situacao.tone]}>{situacao.motivo}</span>
            {" — "}
            {situacao.detalhe}
          </p>
          {situacao.intent === "responder" && ultimaDoPaciente && (
            <p className="mt-3 rounded-nx-sm border-l-0 bg-nx-container-high/60 p-3 text-body-sm italic text-nx-on-surface-variant">
              “{ultimaDoPaciente.texto || "Enviou um anexo"}”
            </p>
          )}
        </div>

        {/* Ações rápidas */}
        <div>
          <span className="mb-2 block text-label-md uppercase tracking-wider text-nx-on-surface-variant">Ação rápida</span>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {ACOES.map((a) => {
              const A = ICON[a.intent];
              const on = intent === a.intent;
              return (
                <button
                  key={a.intent}
                  onClick={() => pick(a.intent)}
                  className={
                    "flex items-center justify-center gap-1.5 rounded-nx-md border px-3 py-2.5 text-body-sm font-medium transition-all active:scale-[0.98] " +
                    (on ? ACTIVE[a.tone] : IDLE[a.tone])
                  }
                >
                  <A size={15} />
                  {a.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Compositor */}
        <div className="rounded-nx-lg border border-nx-border bg-nx-container-low p-4">
          <div className="mb-2 flex items-center gap-2 text-label-md uppercase tracking-wider text-nx-on-surface-variant">
            <IntentIcon size={14} /> {intentLabel(intent)}
          </div>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={4}
            placeholder={
              intent === "responder"
                ? "Escreva sua resposta para " + conversa.nome.split(" ")[0] + "…"
                : "Ajuste a mensagem antes de enviar…"
            }
            className="w-full resize-none rounded-nx-sm border border-nx-border bg-nx-surface p-3 text-body-md leading-relaxed text-nx-on-surface outline-none placeholder:text-nx-on-surface-variant focus:border-nx-evo/50"
          />
          <div className="mt-3 flex items-center justify-between gap-3">
            <span className={"text-body-sm " + (feedback ? "text-nx-evo" : "text-transparent")}>
              {feedback ?? "·"}
            </span>
            <div className="flex gap-2">
              {intent === "consulta" && (
                <ButtonNx
                  variant="surface"
                  leftIcon={<CalendarPlus size={16} />}
                  onClick={() => setAgendarOpen(true)}
                >
                  Marcar no calendário
                </ButtonNx>
              )}
              <ButtonNx onClick={enviar} disabled={sending || !draft.trim()} leftIcon={<Send size={16} />}>
                {sending ? "Enviando…" : "Enviar mensagem"}
              </ButtonNx>
            </div>
          </div>
        </div>

        {/* Conversa (contexto, secundário) */}
        <div>
          <button
            onClick={() => setHistAberto((v) => !v)}
            className="mb-2 flex w-full items-center justify-between text-label-md uppercase tracking-wider text-nx-on-surface-variant"
          >
            <span>Conversa {historico.length > 0 && `· ${historico.length}`}</span>
            <ChevronDown
              size={16}
              className={"transition-transform " + (histAberto ? "rotate-180" : "")}
            />
          </button>
          {loadingHist ? (
            <p className="py-4 text-center text-body-sm text-nx-on-surface-variant">Carregando conversa…</p>
          ) : historico.length === 0 ? (
            <p className="py-4 text-center text-body-sm text-nx-on-surface-variant">
              Nenhuma mensagem ainda — sua sugestão acima começa a conversa. 👋
            </p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {!histAberto && historico.length > 4 && (
                <button
                  onClick={() => setHistAberto(true)}
                  className="self-center text-body-sm text-nx-evo hover:underline"
                >
                  Ver conversa completa
                </button>
              )}
              {visiveis.map((m) => (
                <Bubble key={m.id} m={m} />
              ))}
            </div>
          )}
        </div>
      </div>

      {agendarOpen && (
        <AgendarModal nome={conversa.nome} onClose={() => setAgendarOpen(false)} onConfirm={confirmarAgenda} />
      )}
    </div>
  );
}
