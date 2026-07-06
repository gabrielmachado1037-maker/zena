import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getConversas,
  getThread,
  enviarMensagem,
  marcarLida,
  formatHora,
  type Conversa,
  type Mensagem,
} from "../lib/mensagens";
import InboxList from "../components/mensagens/InboxList";
import ChatHeader from "../components/mensagens/ChatHeader";
import MessageBubble from "../components/mensagens/MessageBubble";
import MessageInput from "../components/mensagens/MessageInput";
import PatientContextPanel from "../components/mensagens/PatientContextPanel";

// Tela de Mensagens (nutricionista) — 3 colunas, dados reais via /api/mensagens/*.
export default function Mensagens() {
  const navigate = useNavigate();
  const [conversas, setConversas] = useState<Conversa[]>([]);
  const [loadingConversas, setLoadingConversas] = useState(true);
  const [selecionadaId, setSelecionadaId] = useState<string | null>(null);

  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [nutriAvatar, setNutriAvatar] = useState<string | null>(null);
  const [loadingThread, setLoadingThread] = useState(false);

  const [texto, setTexto] = useState("");
  const [buscaThread, setBuscaThread] = useState("");
  const [enviando, setEnviando] = useState(false);
  const fimRef = useRef<HTMLDivElement>(null);

  const conversa = useMemo(
    () => conversas.find((c) => c.id === selecionadaId) ?? null,
    [conversas, selecionadaId],
  );

  // Carrega a lista de conversas ao montar.
  useEffect(() => {
    let vivo = true;
    getConversas()
      .then((cs) => {
        if (!vivo) return;
        setConversas(cs);
        setSelecionadaId((atual) => atual ?? cs[0]?.id ?? null);
      })
      .catch(() => {})
      .finally(() => vivo && setLoadingConversas(false));
    return () => { vivo = false; };
  }, []);

  // Carrega a thread quando troca de conversa (e zera o não-lido local — o GET marca como lida).
  useEffect(() => {
    if (!conversa) return;
    let vivo = true;
    setLoadingThread(true);
    setBuscaThread("");
    getThread(conversa)
      .then((t) => {
        if (!vivo) return;
        setMensagens(t.mensagens);
        setNutriAvatar(t.nutriAvatarUrl);
        setConversas((prev) => prev.map((c) => (c.id === conversa.id ? { ...c, naoLidoCount: 0 } : c)));
      })
      .catch(() => vivo && setMensagens([]))
      .finally(() => vivo && setLoadingThread(false));
    return () => { vivo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selecionadaId]);

  // Rola pro fim quando a thread muda.
  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensagens.length, loadingThread]);

  async function enviar(anexoBase64?: string) {
    const t = texto.trim();
    if ((!t && !anexoBase64) || !conversa || enviando) return;

    const otimista: Mensagem = {
      id: `tmp-${Date.now()}`,
      autor: "nutri",
      texto: t,
      hora: formatHora(new Date()),
      avatarUrl: nutriAvatar,
      anexoUrl: anexoBase64 ?? null,
    };
    setMensagens((prev) => [...prev, otimista]);
    setTexto("");
    setEnviando(true);

    try {
      const salva = await enviarMensagem(conversa.id, t, anexoBase64);
      // Confirma o id real e troca o data-URI otimista pela URL final do anexo.
      setMensagens((prev) => prev.map((m) => (m.id === otimista.id ? { ...m, id: salva.id, anexoUrl: salva.anexoUrl } : m)));
      // Atualiza prévia/horário da conversa na lista.
      setConversas((prev) =>
        prev.map((c) => (c.id === conversa.id ? { ...c, previa: t || "📷 Imagem", ultimaAtividade: salva.criadoEm } : c)),
      );
    } catch {
      // Reverte em caso de erro.
      setMensagens((prev) => prev.filter((m) => m.id !== otimista.id));
      setTexto(t);
    } finally {
      setEnviando(false);
    }
  }

  async function handleMarcarLida() {
    if (!conversa) return;
    try {
      await marcarLida(conversa.id);
      setConversas((prev) => prev.map((c) => (c.id === conversa.id ? { ...c, naoLidoCount: 0 } : c)));
    } catch {
      /* silencioso */
    }
  }

  const mensagensVisiveis = useMemo(() => {
    const q = buscaThread.trim().toLowerCase();
    return q ? mensagens.filter((m) => m.texto.toLowerCase().includes(q)) : mensagens;
  }, [mensagens, buscaThread]);

  return (
    <div className="flex h-screen gap-4 p-4 overflow-hidden bg-nx-bg-lowest text-nx-on-surface font-sans">
      {/* Coluna esquerda — Inbox */}
      <InboxList
        conversas={conversas}
        ativaId={selecionadaId}
        onSelect={setSelecionadaId}
        loading={loadingConversas}
      />

      {/* Coluna central — Chat */}
      <div className="flex-1 min-w-0 flex flex-col glass-panel rounded-xl overflow-hidden relative">
        {conversa ? (
          <>
            <ChatHeader
              nome={conversa.nome}
              online={conversa.online}
              busca={buscaThread}
              onBusca={setBuscaThread}
              onMarcarLida={handleMarcarLida}
              onVerPerfil={() => navigate(`/app/pacientes/${conversa.id}`)}
            />

            <div className="flex-1 overflow-y-auto hide-scrollbar p-6 flex flex-col gap-6">
              <div className="flex items-center gap-4 my-2">
                <div className="flex-1 h-px bg-nx-primary-container/10" />
                <span className="text-label-sm text-nx-on-surface-variant uppercase tracking-widest">
                  {buscaThread ? "Resultados" : "Conversa"}
                </span>
                <div className="flex-1 h-px bg-nx-primary-container/10" />
              </div>

              {loadingThread ? (
                <p className="text-body-sm text-nx-on-surface-variant text-center">Carregando mensagens…</p>
              ) : mensagensVisiveis.length === 0 ? (
                <p className="text-body-sm text-nx-on-surface-variant text-center">
                  {buscaThread ? "Nenhuma mensagem encontrada." : "Nenhuma mensagem ainda. Diga olá! 👋"}
                </p>
              ) : (
                mensagensVisiveis.map((m) => <MessageBubble key={m.id} msg={m} />)
              )}
              <div ref={fimRef} />
            </div>

            <MessageInput valor={texto} onChange={setTexto} onEnviar={enviar} disabled={enviando} />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-body-md text-nx-on-surface-variant">
            {loadingConversas ? "Carregando…" : "Selecione uma conversa na Inbox."}
          </div>
        )}
      </div>

      {/* Coluna direita — Contexto do Paciente */}
      {conversa && (
        <PatientContextPanel
          conversa={conversa}
          onVerPerfil={() => navigate(`/app/pacientes/${conversa.id}`)}
          onAjustarPlano={() => navigate(`/app/pacientes/${conversa.id}`)}
        />
      )}
    </div>
  );
}
