import { useEffect, useMemo, useRef, useState } from "react"
import { ChevronLeft, Send, Stethoscope } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  getMensagensNutri, enviarMensagemNutri, formatHora, rotuloDia,
  type MensagemNutri,
} from "@/lib/mensagens-paciente"
import type { NavigateFn } from "../types"

/* Avatar da nutri — foto ou ícone de estetoscópio. */
function NutriAvatar({ url, size = 40 }: { url: string | null; size?: number }) {
  return (
    <span
      className="grid shrink-0 place-items-center overflow-hidden rounded-full bg-nx-container-high"
      style={{ width: size, height: size }}
    >
      {url ? (
        <img src={url} alt="" className="size-full object-cover" />
      ) : (
        <Stethoscope className="text-nx-evo" style={{ width: size * 0.5, height: size * 0.5 }} />
      )}
    </span>
  )
}

export function MensagensScreen({ onNavigate }: { onNavigate: NavigateFn }) {
  const [msgs, setMsgs] = useState<MensagemNutri[]>([])
  const [nutriNome, setNutriNome] = useState("Sua nutricionista")
  const [nutriAvatar, setNutriAvatar] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState(false)
  const [texto, setTexto] = useState("")
  const [enviando, setEnviando] = useState(false)

  const fimRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    let vivo = true
    getMensagensNutri()
      .then((t) => {
        if (!vivo) return
        setMsgs(t.mensagens)
        setNutriNome(t.nutriNome)
        setNutriAvatar(t.nutriAvatarUrl)
      })
      .catch(() => vivo && setErro(true))
      .finally(() => vivo && setLoading(false))
    return () => { vivo = false }
  }, [])

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: loading ? "auto" : "smooth" })
  }, [msgs.length, loading])

  // Agrupa por dia pra separadores da timeline.
  const grupos = useMemo(() => {
    const out: { dia: string; itens: MensagemNutri[] }[] = []
    for (const m of msgs) {
      const dia = rotuloDia(m.criadoEm)
      const ultimo = out[out.length - 1]
      if (ultimo && ultimo.dia === dia) ultimo.itens.push(m)
      else out.push({ dia, itens: [m] })
    }
    return out
  }, [msgs])

  async function enviar() {
    const t = texto.trim()
    if (!t || enviando) return
    const otimista: MensagemNutri = {
      id: `tmp-${Date.now()}`,
      autor: "paciente",
      texto: t,
      hora: formatHora(new Date()),
      criadoEm: new Date().toISOString(),
    }
    setMsgs((prev) => [...prev, otimista])
    setTexto("")
    setEnviando(true)
    if (inputRef.current) inputRef.current.style.height = "auto"
    try {
      const salva = await enviarMensagemNutri(t)
      setMsgs((prev) => prev.map((m) => (m.id === otimista.id ? salva : m)))
    } catch {
      setMsgs((prev) => prev.filter((m) => m.id !== otimista.id))
      setTexto(t)
    } finally {
      setEnviando(false)
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      enviar()
    }
  }

  function autoGrow(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setTexto(e.target.value)
    const el = e.target
    el.style.height = "auto"
    el.style.height = Math.min(el.scrollHeight, 120) + "px"
  }

  const primeiroNome = nutriNome.split(" ")[0]

  return (
    <div className="flex flex-col h-[calc(100dvh-6rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))]">
      {/* Header — identidade da nutri */}
      <header className="flex items-center gap-3 border-b border-nx-border bg-nx-surface px-3 py-3">
        <button
          type="button"
          onClick={() => onNavigate("perfil")}
          aria-label="Voltar"
          className="grid size-9 place-items-center rounded-nx-md text-nx-on-surface-variant transition-colors hover:bg-nx-container-high"
        >
          <ChevronLeft className="size-5" />
        </button>
        <NutriAvatar url={nutriAvatar} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-body-md font-semibold text-nx-on-surface">{nutriNome}</p>
          <p className="text-label-sm uppercase tracking-wide text-nx-on-surface-variant">Nutricionista</p>
        </div>
      </header>

      {/* Timeline de mensagens */}
      <div className="flex-1 overflow-y-auto hide-scrollbar px-4 py-5">
        {loading ? (
          <p className="mt-8 text-center text-body-sm text-nx-on-surface-variant">Carregando conversa…</p>
        ) : erro ? (
          <p className="mt-8 text-center text-body-sm text-nx-danger">Não foi possível carregar as mensagens.</p>
        ) : msgs.length === 0 ? (
          <div className="mt-10 flex flex-col items-center px-6 text-center">
            <NutriAvatar url={nutriAvatar} size={64} />
            <p className="mt-4 text-body-md font-medium text-nx-on-surface">
              Fale direto com {primeiroNome}
            </p>
            <p className="mt-1 text-body-sm text-nx-on-surface-variant">
              Tire dúvidas, conte como está se sentindo ou peça um ajuste. A resposta chega por aqui.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {grupos.map((g) => (
              <div key={g.dia} className="space-y-2.5">
                <div className="flex justify-center">
                  <span className="rounded-full bg-nx-container px-3 py-1 text-label-sm uppercase tracking-wide text-nx-on-surface-variant">
                    {g.dia}
                  </span>
                </div>
                {g.itens.map((m) => {
                  const meu = m.autor === "paciente"
                  return (
                    <div key={m.id} className={cn("flex", meu ? "justify-end" : "justify-start")}>
                      <div
                        className={cn(
                          "max-w-[82%] rounded-nx-lg px-3.5 py-2.5",
                          meu
                            ? "rounded-br-sm bg-nx-evo text-nx-on-evo"
                            : "rounded-bl-sm border border-nx-border bg-nx-surface text-nx-on-surface",
                        )}
                      >
                        {m.anexoUrl && (
                          <img
                            src={m.anexoUrl}
                            alt=""
                            className="mb-2 max-h-56 w-full rounded-nx-md object-cover"
                          />
                        )}
                        {m.texto && (
                          <p className="whitespace-pre-wrap break-words text-body-md leading-snug">{m.texto}</p>
                        )}
                        <p
                          className={cn(
                            "mt-1 text-right text-label-sm tabular-nums",
                            meu ? "text-nx-on-evo/60" : "text-nx-on-surface-variant",
                          )}
                        >
                          {m.hora}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        )}
        <div ref={fimRef} />
      </div>

      {/* Compositor */}
      <div className="border-t border-nx-border bg-nx-surface px-3 py-2.5">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={texto}
            onChange={autoGrow}
            onKeyDown={onKeyDown}
            rows={1}
            placeholder={`Mensagem para ${primeiroNome}…`}
            disabled={loading || erro}
            className="max-h-[120px] min-h-[42px] flex-1 resize-none rounded-nx-lg border border-nx-border bg-nx-container px-3.5 py-2.5 text-body-md text-nx-on-surface placeholder:text-nx-on-surface-variant focus:border-nx-evo focus:outline-none disabled:opacity-50"
          />
          <button
            type="button"
            onClick={enviar}
            disabled={!texto.trim() || enviando}
            aria-label="Enviar"
            className="grid size-[42px] shrink-0 place-items-center rounded-nx-lg bg-nx-evo text-nx-on-evo transition-opacity disabled:opacity-40"
          >
            <Send className="size-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
