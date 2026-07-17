import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { ChevronLeft, ChevronUp, RotateCw, Send, Stethoscope } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  getMensagensNutri, getMensagensNutriAnteriores, enviarMensagemNutri, formatHora, rotuloDia,
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
  const [hasMore, setHasMore] = useState(false)
  const [cursor, setCursor] = useState<string | null>(null)
  const [carregandoAntes, setCarregandoAntes] = useState(false)

  const fimRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const ultimoIdRef = useRef<string | null>(null)
  const prependRef = useRef<number | null>(null)

  const carregar = useCallback(async () => {
    setLoading(true)
    setErro(false)
    ultimoIdRef.current = null
    try {
      const t = await getMensagensNutri()
      setMsgs(t.mensagens)
      setNutriNome(t.nutriNome)
      setNutriAvatar(t.nutriAvatarUrl)
      setHasMore(t.hasMore)
      setCursor(t.nextCursor)
    } catch {
      setErro(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { carregar() }, [carregar])

  // Rola pro fim só quando a ÚLTIMA mensagem muda (carga inicial / nova mensagem) —
  // nunca ao carregar anteriores (prepend não altera a última).
  useEffect(() => {
    if (msgs.length === 0) return
    const ultimoId = msgs[msgs.length - 1]!.id
    if (ultimoId !== ultimoIdRef.current) {
      ultimoIdRef.current = ultimoId
      fimRef.current?.scrollIntoView({ behavior: loading ? "auto" : "smooth" })
    }
  }, [msgs, loading])

  // Após um prepend, restaura a posição de leitura (sem "pulo").
  useLayoutEffect(() => {
    if (prependRef.current != null && scrollRef.current) {
      scrollRef.current.scrollTop += scrollRef.current.scrollHeight - prependRef.current
      prependRef.current = null
    }
  })

  const carregarAnteriores = useCallback(async () => {
    if (!cursor || carregandoAntes) return
    const cont = scrollRef.current
    prependRef.current = cont ? cont.scrollHeight : null
    setCarregandoAntes(true)
    try {
      const r = await getMensagensNutriAnteriores(cursor)
      setMsgs((prev) => [...r.mensagens, ...prev])
      setHasMore(r.hasMore)
      setCursor(r.nextCursor)
    } catch {
      prependRef.current = null
    } finally {
      setCarregandoAntes(false)
    }
  }, [cursor, carregandoAntes])

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
      setErro(false) // enviou → a conversa existe, some com o estado de erro de carga
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

  const temNome = nutriNome !== "Sua nutricionista"
  const primeiroNome = nutriNome.split(" ")[0]
  const placeholder = temNome ? `Mensagem para ${primeiroNome}…` : "Escreva sua mensagem…"

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
      <div ref={scrollRef} className="flex-1 overflow-y-auto hide-scrollbar px-4 py-5">
        {loading ? (
          <p className="mt-8 text-center text-body-sm text-nx-on-surface-variant">Carregando conversa…</p>
        ) : erro ? (
          <div className="mt-10 flex flex-col items-center px-6 text-center">
            <p className="text-body-md text-nx-on-surface">Não foi possível carregar o histórico.</p>
            <p className="mt-1 text-body-sm text-nx-on-surface-variant">
              A conexão pode ter demorado. Você ainda pode escrever abaixo.
            </p>
            <button
              type="button"
              onClick={carregar}
              className="mt-4 inline-flex items-center gap-2 rounded-nx-lg border border-nx-border px-4 py-2 text-body-sm font-medium text-nx-on-surface transition-colors hover:bg-nx-container-high"
            >
              <RotateCw className="size-4" />
              Tentar de novo
            </button>
          </div>
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
            {hasMore && (
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={carregarAnteriores}
                  disabled={carregandoAntes}
                  className="inline-flex items-center gap-1.5 rounded-full border border-nx-border bg-nx-surface px-3.5 py-1.5 text-label-md text-nx-on-surface-variant transition-colors hover:bg-nx-container-high disabled:opacity-60"
                >
                  <ChevronUp className="size-3.5" /> {carregandoAntes ? "Carregando…" : "Carregar anteriores"}
                </button>
              </div>
            )}
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
            placeholder={placeholder}
            disabled={loading}
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
