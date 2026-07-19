import { useCallback, useEffect, useRef, useState } from "react"
import {
  Camera, Scale, Smile, X, ArrowDown, ArrowUp, Minus,
  Flame, Zap, Medal, Trophy, Crown, Award, Check, Sparkles,
  type LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { usePacienteData } from "@/lib/paciente-data"
import { formatarXpDia } from "@/lib/ligas"
import apiPaciente from "@/lib/apiPaciente"
import { ScreenHeader } from "../screen-header"
import type { NavigateFn } from "../types"

/* Ordem do seletor de humor (pior → melhor) → chave do backend. */
const HUMOR_PICKER = [
  { key: "pessimo", emoji: "😡", label: "Ruim" },
  { key: "dificil", emoji: "😔", label: "Difícil" },
  { key: "neutro", emoji: "😐", label: "Neutro" },
  { key: "bom", emoji: "😊", label: "Bom" },
  { key: "otimo", emoji: "😄", label: "Ótimo" },
] as const

const MOOD: Record<string, { emoji: string; label: string }> = Object.fromEntries(
  HUMOR_PICKER.map((m) => [m.key, { emoji: m.emoji, label: m.label }]),
)

const CONQUISTA_ICON: Record<string, LucideIcon> = {
  sequencia_7: Flame, sequencia_30: Zap, subiu_liga: Medal,
  desafio_concluido: Trophy, checkpoint_foto: Camera, lendario: Crown,
}

/* ─── shapes cruas (datas ISO, para ordenar a timeline) ─── */
interface EvolucaoRaw {
  fotos: { id: string; data: string; fotoUrl: string | null }[]
  medicoes: { data: string; peso: number; cintura?: number | null; quadril?: number | null; braco?: number | null; coxa?: number | null }[]
  humores: { data: string; humor: string | null }[]
}
interface ResumoRaw {
  registroHoje: { pontosGanhos: number; alimentacaoOk: boolean; treinoOk: boolean; aguaOk: boolean; sonoOk: boolean } | null
  feitoHoje: boolean
  conquistas: { id: string; tipo: string; titulo: string; descricao: string | null; createdAt: string }[]
}

type Entry =
  | { id: string; date: Date; kind: "foto"; img: string }
  | { id: string; date: Date; kind: "peso"; peso: number; delta: number | null; medidas: [string, number][] }
  | { id: string; date: Date; kind: "humor"; humor: string }
  | { id: string; date: Date; kind: "evento"; titulo: string; descricao: string | null; tipo: string }
  | { id: string; date: Date; kind: "checkin"; pontos: number }

const kg = (n: number) => `${n.toFixed(1).replace(".", ",")} kg`

function startOfDay(d: Date) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}
function dayLabel(d: Date) {
  const today = startOfDay(new Date())
  const diff = Math.round((today.getTime() - startOfDay(d).getTime()) / 86_400_000)
  if (diff === 0) return "Hoje"
  if (diff === 1) return "Ontem"
  if (diff < 7) return `Há ${diff} dias`
  return d.toLocaleDateString("pt-BR", { day: "numeric", month: "long" })
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader()
    r.onload = () => res(r.result as string)
    r.onerror = rej
    r.readAsDataURL(file)
  })
}

export function EvolucaoScreen({ onNavigate }: { onNavigate: NavigateFn }) {
  const { user, reload } = usePacienteData()

  const [entries, setEntries] = useState<Entry[]>([])
  const [carregando, setCarregando] = useState(true)

  const loadTimeline = useCallback(async () => {
    const [evoR, resumoR] = await Promise.allSettled([
      apiPaciente.get<EvolucaoRaw>("/registros/evolucao"),
      apiPaciente.get<ResumoRaw>("/registros/resumo"),
    ])
    const evo = evoR.status === "fulfilled" ? evoR.value.data : { fotos: [], medicoes: [], humores: [] }
    const resumo = resumoR.status === "fulfilled" ? resumoR.value.data : null

    const list: Entry[] = []

    for (const f of evo.fotos ?? [])
      if (f.fotoUrl) list.push({ id: `foto-${f.id}`, date: new Date(f.data), kind: "foto", img: f.fotoUrl })

    const meds = [...(evo.medicoes ?? [])].sort((a, b) => +new Date(a.data) - +new Date(b.data))
    meds.forEach((m, i) => {
      const prev = meds[i - 1]
      const medidas: [string, number][] = []
      if (m.cintura != null) medidas.push(["Cintura", m.cintura])
      if (m.quadril != null) medidas.push(["Quadril", m.quadril])
      if (m.braco != null) medidas.push(["Braço", m.braco])
      if (m.coxa != null) medidas.push(["Coxa", m.coxa])
      list.push({
        id: `peso-${m.data}-${i}`, date: new Date(m.data), kind: "peso",
        peso: m.peso, delta: prev ? m.peso - prev.peso : null, medidas,
      })
    })

    for (const [i, h] of (evo.humores ?? []).entries())
      if (h.humor) list.push({ id: `hum-${h.data}-${i}`, date: new Date(h.data), kind: "humor", humor: h.humor })

    for (const c of resumo?.conquistas ?? [])
      list.push({ id: `ev-${c.id}`, date: new Date(c.createdAt), kind: "evento", titulo: c.titulo, descricao: c.descricao, tipo: c.tipo })

    if (resumo?.feitoHoje && resumo.registroHoje)
      list.push({ id: "checkin-hoje", date: new Date(), kind: "checkin", pontos: resumo.registroHoje.pontosGanhos })

    list.sort((a, b) => b.date.getTime() - a.date.getTime())
    setEntries(list)
    setCarregando(false)
  }, [])

  useEffect(() => { void loadTimeline() }, [loadTimeline])

  // agrupa por dia preservando a ordem (desc)
  const grupos: { key: string; date: Date; items: Entry[] }[] = []
  for (const e of entries) {
    const key = startOfDay(e.date).toISOString()
    const g = grupos.find((x) => x.key === key)
    if (g) g.items.push(e)
    else grupos.push({ key, date: e.date, items: [e] })
  }

  /* ── Compor: foto / medição / humor ── */
  const fotoRef = useRef<HTMLInputElement>(null)
  const [enviandoFoto, setEnviandoFoto] = useState(false)

  const [medOpen, setMedOpen] = useState(false)
  const [medForm, setMedForm] = useState({ peso: "", cintura: "", quadril: "", braco: "", coxa: "" })
  const [salvandoMed, setSalvandoMed] = useState(false)
  const [medErr, setMedErr] = useState("")

  const [humorOpen, setHumorOpen] = useState(false)
  const [humorSel, setHumorSel] = useState(3)
  const [salvandoHumor, setSalvandoHumor] = useState(false)

  const num = (s: string) => {
    const n = parseFloat(s.replace(",", "."))
    return isFinite(n) && n > 0 ? n : undefined
  }

  async function onFotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setEnviandoFoto(true)
    try {
      const fotoBase64 = await fileToBase64(f)
      await apiPaciente.post("/registros/foto-evolucao", { fotoBase64 })
      await Promise.all([reload(), loadTimeline()])
    } catch { /* silencioso */ } finally {
      setEnviandoFoto(false)
      if (fotoRef.current) fotoRef.current.value = ""
    }
  }

  async function salvarMedicao() {
    const peso = num(medForm.peso)
    if (!peso) { setMedErr("Informe um peso válido."); return }
    setSalvandoMed(true); setMedErr("")
    try {
      await apiPaciente.post("/registros/medicao", {
        peso, cintura: num(medForm.cintura), quadril: num(medForm.quadril),
        braco: num(medForm.braco), coxa: num(medForm.coxa),
      })
      setMedOpen(false)
      setMedForm({ peso: "", cintura: "", quadril: "", braco: "", coxa: "" })
      await Promise.all([reload(), loadTimeline()])
    } catch (e: any) {
      setMedErr(e?.response?.data?.error || "Não foi possível salvar.")
    } finally {
      setSalvandoMed(false)
    }
  }

  async function salvarHumor() {
    setSalvandoHumor(true)
    try {
      await apiPaciente.put("/registros/humor", { humor: HUMOR_PICKER[humorSel].key })
      setHumorOpen(false)
      await Promise.all([reload(), loadTimeline()])
    } catch { /* silencioso */ } finally {
      setSalvandoHumor(false)
    }
  }

  const acoes: { icon: LucideIcon; label: string; onClick: () => void; busy?: boolean }[] = [
    { icon: Camera, label: "Foto", onClick: () => fotoRef.current?.click(), busy: enviandoFoto },
    { icon: Scale, label: "Peso", onClick: () => { setMedErr(""); setMedOpen(true) } },
    { icon: Smile, label: "Humor", onClick: () => setHumorOpen(true) },
  ]

  const medInput = "w-full rounded-nx-md border border-nx-border bg-nx-container px-3 py-2.5 text-body-md text-nx-on-surface outline-none placeholder:text-nx-on-surface-variant focus:border-nx-evo"

  return (
    <div className="pb-6">
      <ScreenHeader title="Meu diário" onBack={() => onNavigate("registro")} />

      <div className="space-y-6 px-5 pt-4">
        {/* Compor — registrar é uma ação, não um formulário */}
        <div>
          <p className="mb-2 px-1 text-body-md text-nx-on-surface-variant">
            Registre um momento da sua evolução
          </p>
          <div className="grid grid-cols-3 gap-3">
            {acoes.map((a) => {
              const Icon = a.icon
              return (
                <button
                  key={a.label}
                  type="button"
                  onClick={a.onClick}
                  disabled={a.busy}
                  className="flex flex-col items-center gap-2 rounded-nx-lg border border-nx-border bg-nx-surface py-4 transition-colors hover:border-nx-evo/40 active:scale-[0.98] disabled:opacity-60"
                >
                  <span className="grid size-11 place-items-center rounded-full bg-nx-evo/12">
                    <Icon className="size-5 text-nx-evo" />
                  </span>
                  <span className="text-body-sm font-medium text-nx-on-surface">
                    {a.busy ? "…" : a.label}
                  </span>
                </button>
              )
            })}
          </div>
          <input ref={fotoRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onFotoChange} />
        </div>

        {/* Timeline */}
        {carregando ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => <div key={i} className="h-24 animate-pulse rounded-nx-lg bg-nx-container/60" />)}
          </div>
        ) : grupos.length === 0 ? (
          <div className="rounded-nx-lg border border-nx-border bg-nx-surface p-8 text-center">
            <Sparkles className="mx-auto size-8 text-nx-evo" />
            <p className="mt-3 text-body-lg font-semibold text-nx-on-surface">Seu diário começa hoje</p>
            <p className="mt-1 text-body-sm text-nx-on-surface-variant">
              Adicione uma foto, seu peso ou como você se sente.
            </p>
          </div>
        ) : (
          <div className="space-y-7">
            {grupos.map((g) => (
              <section key={g.key}>
                <div className="mb-3 flex items-center gap-2">
                  <span className="size-2 rounded-full bg-nx-evo" />
                  <h2 className="text-label-md uppercase tracking-wide text-nx-on-surface-variant">
                    {dayLabel(g.date)}
                  </h2>
                </div>
                <div className="ml-1 space-y-3 border-l border-nx-border pl-4">
                  {g.items.map((e) => <TimelineEntry key={e.id} entry={e} name={user.firstName} />)}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      {/* Modal medição */}
      {medOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-nx-bg/70 backdrop-blur-sm sm:items-center sm:p-4" onClick={() => setMedOpen(false)}>
          <div className="w-full max-w-md rounded-t-nx-xl border border-nx-border bg-nx-surface p-5 sm:rounded-nx-xl" onClick={(ev) => ev.stopPropagation()}>
            <div className="flex items-center justify-between">
              <p className="text-headline-md text-nx-on-surface">Nova medição</p>
              <button type="button" onClick={() => setMedOpen(false)} aria-label="Fechar"><X className="size-5 text-nx-outline" /></button>
            </div>
            <div className="mt-4 space-y-3">
              <div>
                <label className="text-body-sm text-nx-on-surface-variant">Peso (kg) *</label>
                <input type="number" inputMode="decimal" step="0.1" placeholder="72,5"
                  value={medForm.peso} onChange={(e) => setMedForm((f) => ({ ...f, peso: e.target.value }))} className={cn(medInput, "mt-1")} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                {([["cintura", "Cintura (cm)"], ["quadril", "Quadril (cm)"], ["braco", "Braço (cm)"], ["coxa", "Coxa (cm)"]] as const).map(([key, label]) => (
                  <div key={key}>
                    <label className="text-body-sm text-nx-on-surface-variant">{label}</label>
                    <input type="number" inputMode="decimal" step="0.1" placeholder="—"
                      value={medForm[key]} onChange={(e) => setMedForm((f) => ({ ...f, [key]: e.target.value }))} className={cn(medInput, "mt-1")} />
                  </div>
                ))}
              </div>
              {medErr && <p className="text-body-sm text-nx-danger">{medErr}</p>}
              <button type="button" onClick={salvarMedicao} disabled={salvandoMed}
                className="mt-1 w-full rounded-nx-md bg-nx-evo py-3 text-body-md font-semibold text-nx-on-evo disabled:opacity-60">
                {salvandoMed ? "Salvando…" : "Salvar medição"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal humor */}
      {humorOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-nx-bg/70 backdrop-blur-sm sm:items-center sm:p-4" onClick={() => setHumorOpen(false)}>
          <div className="w-full max-w-md rounded-t-nx-xl border border-nx-border bg-nx-surface p-5 sm:rounded-nx-xl" onClick={(ev) => ev.stopPropagation()}>
            <div className="flex items-center justify-between">
              <p className="text-headline-md text-nx-on-surface">Como você se sente?</p>
              <button type="button" onClick={() => setHumorOpen(false)} aria-label="Fechar"><X className="size-5 text-nx-outline" /></button>
            </div>
            <div className="mt-5 flex items-center justify-between">
              {HUMOR_PICKER.map((m, i) => {
                const sel = i === humorSel
                return (
                  <button key={m.key} type="button" onClick={() => setHumorSel(i)} aria-label={m.label} aria-pressed={sel}
                    className={cn("grid size-12 place-items-center rounded-nx-md text-2xl transition", sel ? "bg-nx-evo/20 ring-2 ring-nx-evo" : "bg-nx-container-high opacity-70 hover:opacity-100")}>
                    <span aria-hidden>{m.emoji}</span>
                  </button>
                )
              })}
            </div>
            <p className="mt-3 text-center text-body-md font-semibold text-nx-evo">{HUMOR_PICKER[humorSel].label}</p>
            <button type="button" onClick={salvarHumor} disabled={salvandoHumor}
              className="mt-5 w-full rounded-nx-md bg-nx-evo py-3 text-body-md font-semibold text-nx-on-evo disabled:opacity-60">
              {salvandoHumor ? "Salvando…" : "Salvar humor de hoje"}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── Um item da timeline ─── */
function TimelineEntry({ entry, name }: { entry: Entry; name: string }) {
  if (entry.kind === "foto") {
    return (
      <div className="overflow-hidden rounded-nx-lg border border-nx-border bg-nx-surface">
        <img src={entry.img} alt={`Foto de evolução de ${name}`} className="aspect-[4/5] w-full object-cover" />
        <div className="flex items-center gap-2 px-4 py-3">
          <Camera className="size-4 text-nx-evo" />
          <span className="text-body-sm text-nx-on-surface-variant">Foto de evolução</span>
        </div>
      </div>
    )
  }

  if (entry.kind === "peso") {
    const down = entry.delta != null && entry.delta < 0
    const up = entry.delta != null && entry.delta > 0
    return (
      <div className="rounded-nx-lg border border-nx-border bg-nx-surface p-4">
        <div className="flex items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-nx-md bg-nx-water/12">
            <Scale className="size-5 text-nx-water" />
          </span>
          <div className="flex-1">
            <p className="text-body-lg font-semibold text-nx-on-surface">{kg(entry.peso)}</p>
            <p className="text-body-sm text-nx-on-surface-variant">Pesagem registrada</p>
          </div>
          {entry.delta != null && entry.delta !== 0 && (
            <span className={cn("flex items-center gap-0.5 rounded-full px-2 py-1 text-body-sm font-semibold",
              down ? "bg-nx-evo/12 text-nx-evo" : "bg-nx-container-high text-nx-on-surface-variant")}>
              {down ? <ArrowDown className="size-3.5" /> : up ? <ArrowUp className="size-3.5" /> : <Minus className="size-3.5" />}
              {Math.abs(entry.delta).toFixed(1).replace(".", ",")} kg
            </span>
          )}
        </div>
        {entry.medidas.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2 border-t border-nx-border pt-3">
            {entry.medidas.map(([label, v]) => (
              <span key={label} className="rounded-full bg-nx-container-high px-2.5 py-1 text-body-sm text-nx-on-surface-variant">
                {label} <span className="font-semibold text-nx-on-surface">{Math.round(v)}cm</span>
              </span>
            ))}
          </div>
        )}
      </div>
    )
  }

  if (entry.kind === "humor") {
    const m = MOOD[entry.humor] ?? { emoji: "😐", label: entry.humor }
    return (
      <div className="flex items-center gap-3 rounded-nx-lg border border-nx-border bg-nx-surface p-4">
        <span className="text-3xl" aria-hidden>{m.emoji}</span>
        <div>
          <p className="text-body-lg font-semibold text-nx-on-surface">{m.label}</p>
          <p className="text-body-sm text-nx-on-surface-variant">Seu humor no dia</p>
        </div>
      </div>
    )
  }

  if (entry.kind === "checkin") {
    return (
      <div className="flex items-center gap-3 rounded-nx-lg border border-nx-evo/30 bg-nx-evo/8 p-4">
        <span className="grid size-10 shrink-0 place-items-center rounded-nx-md bg-nx-evo/15">
          <Check className="size-5 text-nx-evo" strokeWidth={3} />
        </span>
        <div className="flex-1">
          <p className="text-body-lg font-semibold text-nx-on-surface">Dia registrado</p>
          <p className="text-body-sm text-nx-on-surface-variant">Missões do dia concluídas</p>
        </div>
        {entry.pontos > 0 && <span className="text-body-sm font-bold text-nx-evo">+{formatarXpDia(entry.pontos)} XP</span>}
      </div>
    )
  }

  // evento (conquista)
  const Icon = CONQUISTA_ICON[entry.tipo] ?? Award
  return (
    <div className="flex items-center gap-3 rounded-nx-lg border border-nx-gold/30 bg-nx-gold/8 p-4">
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-nx-gold/15 shadow-[0_0_16px_rgba(248,200,75,0.25)]">
        <Icon className="size-5 text-nx-gold" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-label-sm uppercase text-nx-gold">Conquista desbloqueada</p>
        <p className="text-body-lg font-semibold text-nx-on-surface">{entry.titulo}</p>
        {entry.descricao && <p className="truncate text-body-sm text-nx-on-surface-variant">{entry.descricao}</p>}
      </div>
    </div>
  )
}
