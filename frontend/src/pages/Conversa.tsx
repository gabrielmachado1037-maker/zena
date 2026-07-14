import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, ExternalLink, Flame, Lightbulb } from "lucide-react";
import {
  getThreadById, enviarMensagem, formatHora,
  type Thread, type Mensagem, type Conversa as ConversaTipo,
} from "../lib/mensagens";
import { rascunho, intentLabel, type Intent } from "../lib/comunicacao";
import Avatar from "../components/mensagens/Avatar";
import MessageBubble from "../components/mensagens/MessageBubble";
import MessageInput from "../components/mensagens/MessageInput";

// Chat em tela cheia (nutricionista → paciente). Cabeçalho traz o contexto clínico
// (liga, score de adesão, sequência, último check-in) pra responder com contexto.
export default function Conversa() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [thread, setThread] = useState<Thread | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) return;
    let vivo = true;
    setLoading(true);
    setErro(null);
    getThreadById(id, "")
      .then((t) => vivo && setThread(t))
      .catch(() => vivo && setErro("Não foi possível carregar a conversa."))
      .finally(() => vivo && setLoading(false));
    return () => { vivo = false; };
  }, [id]);

  // Rola pro fim quando a thread carrega/cresce.
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [thread?.mensagens.length]);

  const pac = thread?.paciente ?? null;

  // Sugestão contextual discreta (decisão "Chat + sugestões") — preenche o rascunho.
  const sugestao = useMemo(() => {
    if (!pac) return null;
    let intent: Intent = "incentivo";
    if (pac.streak >= 7) intent = "parabenizar";
    else if (pac.streak === 0 && !pac.online) intent = "cobrar";
    const texto = rascunho(intent, { nome: pac.nome, streak: String(pac.streak) } as ConversaTipo);
    return texto ? { intent, texto } : null;
  }, [pac]);

  async function enviar(anexoBase64?: string) {
    if (!id) return;
    const txt = texto.trim();
    if (!txt && !anexoBase64) return;

    const tempId = `tmp-${txt.length}-${thread?.mensagens.length ?? 0}`;
    const otim: Mensagem = {
      id: tempId, autor: "nutri", texto: txt, hora: formatHora(new Date()),
      avatarUrl: thread?.nutriAvatarUrl ?? null, anexoUrl: anexoBase64 ?? null,
    };
    setThread((t) => (t ? { ...t, mensagens: [...t.mensagens, otim] } : t));
    setTexto("");
    setEnviando(true);
    try {
      const r = await enviarMensagem(id, txt, anexoBase64);
      setThread((t) =>
        t ? { ...t, mensagens: t.mensagens.map((m) => (m.id === tempId ? { ...m, id: r.id, anexoUrl: r.anexoUrl ?? m.anexoUrl } : m)) } : t,
      );
    } catch {
      setThread((t) => (t ? { ...t, mensagens: t.mensagens.filter((m) => m.id !== tempId) } : t));
      setTexto(txt);
    } finally {
      setEnviando(false);
    }
  }

  const nome = pac?.nome ?? "Paciente";

  return (
    <div className="flex flex-col min-h-[calc(100dvh-4rem)] lg:min-h-screen bg-nx-bg-lowest">
      {/* Cabeçalho de contexto */}
      <header className="sticky top-0 z-20 bg-nx-surface/95 backdrop-blur border-b border-nx-border">
        <div className="mx-auto max-w-3xl px-3 py-2.5">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/app/mensagens")} aria-label="Voltar" className="p-1 -ml-1 text-nx-on-surface-variant hover:text-nx-on-surface">
              <ChevronLeft size={22} />
            </button>
            <div className="relative shrink-0">
              <Avatar url={pac?.avatarUrl} nome={nome} className="w-10 h-10 rounded-full" />
              {pac?.online && <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-nx-surface bg-nx-evo" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate font-semibold text-nx-on-surface leading-tight">{nome}</p>
              <p className="text-label-sm text-nx-on-surface-variant">{pac?.online ? "Ativo hoje" : "Offline"}</p>
            </div>
            {id && (
              <button
                onClick={() => navigate(`/app/pacientes/${id}`)}
                className="flex items-center gap-1.5 rounded-full border border-nx-border px-3 py-1.5 text-label-md text-nx-on-surface-variant hover:text-nx-on-surface hover:bg-nx-surface-hover transition-colors"
              >
                <ExternalLink size={14} /> <span className="hidden sm:inline">Ver perfil</span>
              </button>
            )}
          </div>

          {/* Chips de contexto */}
          {pac && (
            <div className="flex gap-2 mt-2 overflow-x-auto hide-scrollbar pl-9">
              <Chip>{pac.ligaAtual}</Chip>
              <Chip tone="evo">Score {pac.score}</Chip>
              <Chip tone="streak"><Flame size={12} /> {pac.streak} {pac.streak === 1 ? "dia" : "dias"}</Chip>
              <Chip>Check-in: {rotuloCheckin(pac.ultimoCheckin)}</Chip>
            </div>
          )}
        </div>
      </header>

      {/* Thread */}
      <div className="flex-1 flex flex-col">
        <div className="mx-auto w-full max-w-3xl flex-1 flex flex-col gap-4 px-4 py-4">
          {loading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => <div key={i} className={`h-14 w-2/3 animate-pulse rounded-2xl bg-nx-container/60 ${i % 2 ? "self-end" : ""}`} />)}
            </div>
          ) : erro ? (
            <div className="m-auto text-body-md text-nx-danger">{erro}</div>
          ) : thread && thread.mensagens.length > 0 ? (
            thread.mensagens.map((m) => <MessageBubble key={m.id} msg={m} />)
          ) : (
            <div className="m-auto text-center text-nx-on-surface-variant">
              <p className="text-body-md">Nenhuma mensagem ainda.</p>
              <p className="text-body-sm mt-1">Envie a primeira mensagem para {nome.split(" ")[0]}.</p>
            </div>
          )}
          <div ref={endRef} />
        </div>
      </div>

      {/* Composer + sugestão discreta */}
      <div className="sticky bottom-0 z-20 bg-nx-surface border-t border-nx-border">
        <div className="mx-auto max-w-3xl">
          {sugestao && (
            <div className="px-4 pt-2">
              <button
                onClick={() => setTexto(sugestao.texto)}
                className="flex items-center gap-1.5 rounded-full bg-nx-evo/12 text-nx-evo px-3 py-1.5 text-label-md font-medium hover:bg-nx-evo/20 transition-colors"
                title="Preencher com uma sugestão contextual"
              >
                <Lightbulb size={14} /> Sugestão: {intentLabel(sugestao.intent)}
              </button>
            </div>
          )}
          <MessageInput valor={texto} onChange={setTexto} onEnviar={enviar} disabled={enviando || !!erro} />
        </div>
      </div>
    </div>
  );
}

function Chip({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "evo" | "streak" }) {
  const cls =
    tone === "evo" ? "bg-nx-evo/12 text-nx-evo"
    : tone === "streak" ? "bg-nx-streak/12 text-nx-streak"
    : "bg-nx-container text-nx-on-surface-variant";
  return (
    <span className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-label-sm font-medium whitespace-nowrap ${cls}`}>
      {children}
    </span>
  );
}

function rotuloCheckin(iso: string | null): string {
  if (!iso) return "sem registro";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "sem registro";
  const hoje = new Date();
  const a = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  const b = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dias = Math.round((a.getTime() - b.getTime()) / 86_400_000);
  if (dias <= 0) return "Hoje";
  if (dias === 1) return "Ontem";
  return `há ${dias} dias`;
}
