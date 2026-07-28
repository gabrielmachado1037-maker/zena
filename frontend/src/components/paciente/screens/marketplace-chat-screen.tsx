import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { listarChat, enviarChat, type MensagemParceria } from "@/lib/parceria";

export function MarketplaceChatScreen() {
  const navigate = useNavigate();
  const [msgs, setMsgs] = useState<MensagemParceria[]>([]);
  const [parceiroNome, setParceiroNome] = useState("");
  const [texto, setTexto] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const fimRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    listarChat()
      .then((r) => { setMsgs(r.mensagens); setParceiroNome(r.parceiroNome); })
      .catch(() => { /* guard trata expiração */ })
      .finally(() => setCarregando(false));
  }, []);

  useEffect(() => { fimRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  async function enviar() {
    const conteudo = texto.trim();
    if (!conteudo || enviando) return;
    setEnviando(true);
    try {
      const nova = await enviarChat(conteudo);
      setMsgs((prev) => [...prev, nova]);
      setTexto("");
    } catch { /* silencioso */ }
    finally { setEnviando(false); }
  }

  return (
    <div className="flex min-h-[calc(100dvh-6rem)] flex-col px-5 pt-7">
      <header className="shrink-0">
        <button
          onClick={() => navigate("/paciente/parceria")}
          className="mb-3 inline-flex items-center gap-1.5 text-body-sm font-semibold text-nx-on-surface-variant transition-colors hover:text-nx-on-surface"
        >
          <ArrowLeft className="size-4" /> Voltar
        </button>
        <h1 className="text-headline-lg text-nx-on-surface">Conversa</h1>
        {parceiroNome && <p className="mt-0.5 text-body-md text-nx-on-surface-variant">com {parceiroNome}</p>}
      </header>

      <div className="flex-1 space-y-2.5 overflow-y-auto py-5">
        {carregando ? (
          <div className="flex justify-center py-12"><div className="size-8 animate-spin rounded-full border-2 border-nx-evo border-t-transparent" /></div>
        ) : msgs.length === 0 ? (
          <div className="rounded-nx-lg border border-nx-border bg-nx-surface p-8 text-center">
            <p className="text-body-md text-nx-on-surface-variant">Nenhuma mensagem ainda.</p>
            <p className="mt-1 text-body-sm text-nx-on-surface-variant">Envie a primeira para {parceiroNome || "seu nutricionista"}.</p>
          </div>
        ) : (
          msgs.map((m) => (
            <div key={m.id} className={cn("flex", m.autor === "paciente" ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[80%] rounded-nx-lg px-3.5 py-2.5 text-body-sm",
                  m.autor === "paciente" ? "bg-nx-evo text-nx-on-evo" : "border border-nx-border bg-nx-surface text-nx-on-surface",
                )}
              >
                {m.conteudo}
              </div>
            </div>
          ))
        )}
        <div ref={fimRef} />
      </div>

      <div className="sticky bottom-[calc(env(safe-area-inset-bottom))] flex shrink-0 items-center gap-2 pb-4 pt-2">
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") enviar(); }}
          placeholder="Escreva uma mensagem…"
          className="flex-1 rounded-nx-md border border-nx-border bg-nx-container-low px-4 py-3 text-body-md text-nx-on-surface outline-none placeholder:text-nx-on-surface-variant/60 focus:border-nx-evo/60"
        />
        <button
          onClick={enviar}
          disabled={enviando || !texto.trim()}
          className="grid size-12 shrink-0 place-items-center rounded-nx-md bg-nx-evo text-nx-on-evo transition-colors hover:bg-nx-evo-2 disabled:opacity-40"
          aria-label="Enviar"
        >
          <Send className="size-5" />
        </button>
      </div>
    </div>
  );
}
