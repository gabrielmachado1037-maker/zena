import { useEffect, useRef, useState } from "react";
import { getThreadById, enviarMensagem, formatHora, type Mensagem } from "../../lib/mensagens";
import { GLASS } from "../../lib/diario";
import MessageBubble from "../mensagens/MessageBubble";
import MessageInput from "../mensagens/MessageInput";

interface Props {
  pacienteId: string;
  pacienteNome: string;
}

// Aba Mensagens do Diário — mesma conversa da tela de Mensagens (MensagemChat).
export default function MensagensTab({ pacienteId, pacienteNome }: Props) {
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [nutriAvatar, setNutriAvatar] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const fimRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let vivo = true;
    setLoading(true);
    getThreadById(pacienteId, pacienteNome)
      .then((t) => {
        if (!vivo) return;
        setMensagens(t.mensagens);
        setNutriAvatar(t.nutriAvatarUrl);
      })
      .catch(() => vivo && setMensagens([]))
      .finally(() => vivo && setLoading(false));
    return () => { vivo = false; };
  }, [pacienteId, pacienteNome]);

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensagens.length, loading]);

  async function enviar() {
    const t = texto.trim();
    if (!t || enviando) return;
    const otimista: Mensagem = {
      id: `tmp-${Date.now()}`,
      autor: "nutri",
      texto: t,
      hora: formatHora(new Date()),
      avatarUrl: nutriAvatar,
    };
    setMensagens((prev) => [...prev, otimista]);
    setTexto("");
    setEnviando(true);
    try {
      const salva = await enviarMensagem(pacienteId, t);
      setMensagens((prev) => prev.map((m) => (m.id === otimista.id ? { ...m, id: salva.id } : m)));
    } catch {
      setMensagens((prev) => prev.filter((m) => m.id !== otimista.id));
      setTexto(t);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className={`${GLASS} max-w-3xl mx-auto flex flex-col overflow-hidden h-[70vh]`}>
      <div className="flex-1 overflow-y-auto hide-scrollbar p-6 flex flex-col gap-6">
        {loading ? (
          <p className="text-body-sm text-nx-on-surface-variant text-center">Carregando mensagens…</p>
        ) : mensagens.length === 0 ? (
          <p className="text-body-sm text-nx-on-surface-variant text-center my-auto">
            Nenhuma mensagem com {pacienteNome.split(" ")[0]} ainda. Diga olá! 👋
          </p>
        ) : (
          mensagens.map((m) => <MessageBubble key={m.id} msg={m} />)
        )}
        <div ref={fimRef} />
      </div>
      <MessageInput valor={texto} onChange={setTexto} onEnviar={enviar} disabled={enviando} />
    </div>
  );
}
