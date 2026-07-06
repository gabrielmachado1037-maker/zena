import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MessagesSquare } from "lucide-react";
import { getConversas, type Conversa } from "../lib/mensagens";
import { deriveSituacao, type Situacao } from "../lib/comunicacao";
import CommQueue from "../components/mensagens/CommQueue";
import CommPanel from "../components/mensagens/CommPanel";

// Central de Comunicação (nutricionista) — não é um chat estilo WhatsApp: a tela é orientada
// a intenção. Um motor client-side deriva QUEM precisa de um toque hoje e QUAL (responder /
// parabenizar / cobrar retorno / incentivar / agendar consulta), com rascunho pronto pra enviar.
export default function Mensagens() {
  const navigate = useNavigate();
  const [conversas, setConversas] = useState<Conversa[]>([]);
  const [loading, setLoading] = useState(true);
  const [selId, setSelId] = useState<string | null>(null);
  // Situação "congelada" na seleção: abrir o paciente marca lido e mudaria a sugestão
  // ao vivo (responder → incentivo). O painel mantém a leitura do momento em que abriu.
  const [painelSituacao, setPainelSituacao] = useState<Situacao | null>(null);

  const situacoes = useMemo<Record<string, Situacao>>(
    () => Object.fromEntries(conversas.map((c) => [c.id, deriveSituacao(c)])),
    [conversas],
  );

  // Fila ordenada por urgência (prioridade da situação; empata pela atividade mais recente).
  const ordenadas = useMemo(() => {
    return [...conversas].sort((a, b) => {
      const pa = situacoes[a.id]?.prioridade ?? 9;
      const pb = situacoes[b.id]?.prioridade ?? 9;
      if (pa !== pb) return pa - pb;
      const ta = a.ultimaAtividade ? new Date(a.ultimaAtividade).getTime() : 0;
      const tb = b.ultimaAtividade ? new Date(b.ultimaAtividade).getTime() : 0;
      return tb - ta;
    });
  }, [conversas, situacoes]);

  useEffect(() => {
    let vivo = true;
    getConversas()
      .then((cs) => {
        if (!vivo) return;
        setConversas(cs);
      })
      .catch(() => {})
      .finally(() => vivo && setLoading(false));
    return () => {
      vivo = false;
    };
  }, []);

  function selecionar(id: string) {
    const c = conversas.find((x) => x.id === id);
    setSelId(id);
    setPainelSituacao(c ? deriveSituacao(c) : null);
  }

  // Seleciona a primeira da fila assim que ela existe.
  useEffect(() => {
    if (!selId && ordenadas.length > 0) selecionar(ordenadas[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ordenadas, selId]);

  const conversa = useMemo(() => conversas.find((c) => c.id === selId) ?? null, [conversas, selId]);

  function handleEnviado(id: string, previa: string) {
    setConversas((prev) =>
      prev.map((c) => (c.id === id ? { ...c, previa, ultimaAtividade: new Date().toISOString(), naoLidoCount: 0 } : c)),
    );
  }

  function handleLida(id: string) {
    setConversas((prev) => prev.map((c) => (c.id === id ? { ...c, naoLidoCount: 0 } : c)));
  }

  return (
    <div className="flex h-screen gap-4 overflow-hidden bg-nx-bg-lowest p-4 text-nx-on-surface">
      <CommQueue
        conversas={ordenadas}
        situacoes={situacoes}
        ativaId={selId}
        onSelect={selecionar}
        loading={loading}
      />

      {conversa && painelSituacao ? (
        <CommPanel
          key={conversa.id}
          conversa={conversa}
          situacao={painelSituacao}
          onEnviado={handleEnviado}
          onLida={handleLida}
          onVerPerfil={() => navigate(`/app/pacientes/${conversa.id}`)}
        />
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center rounded-nx-lg border border-nx-border bg-nx-surface text-nx-on-surface-variant">
          <MessagesSquare size={40} className="mb-3 text-nx-outline" />
          <p className="text-body-md">{loading ? "Carregando…" : "Selecione um paciente para começar."}</p>
        </div>
      )}
    </div>
  );
}
