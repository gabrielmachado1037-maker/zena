import { useEffect, useRef, useState } from "react";
import { CalendarPlus, X } from "lucide-react";
import { ButtonNx } from "../ui-nx";

interface Props {
  nome: string;
  onClose: () => void;
  onConfirm: (dataISO: string, tipo: string) => Promise<void>;
}

const TIPOS = [
  { id: "retorno", label: "Retorno" },
  { id: "consulta", label: "Consulta" },
  { id: "avaliacao", label: "Avaliação" },
];

// Data mínima = hoje (formato yyyy-mm-dd para o <input type="date">).
function hojeISO(): string {
  const d = new Date();
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Agendador enxuto — marca a consulta de verdade (POST /consultas) sem sair da tela. */
export default function AgendarModal({ nome, onClose, onConfirm }: Props) {
  const [data, setData] = useState("");
  const [hora, setHora] = useState("09:00");
  const [tipo, setTipo] = useState("retorno");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const dateRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    dateRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function confirmar() {
    setErro(null);
    if (!data) return setErro("Escolha uma data.");
    const quando = new Date(`${data}T${hora || "09:00"}`);
    if (Number.isNaN(quando.getTime())) return setErro("Data ou horário inválidos.");
    if (quando.getTime() < Date.now() - 60_000) return setErro("Escolha um horário no futuro.");
    setSalvando(true);
    try {
      await onConfirm(quando.toISOString(), tipo);
    } catch {
      setErro("Não deu pra marcar agora. Tente de novo.");
      setSalvando(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Agendar consulta com ${nome}`}
    >
      <div
        className="w-full max-w-md rounded-nx-lg border border-nx-border bg-nx-surface p-6 shadow-nx-card animate-nx-pop"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-nx-md bg-nx-water/12 text-nx-water">
              <CalendarPlus size={20} />
            </span>
            <div>
              <h3 className="text-headline-md text-nx-on-surface">Agendar consulta</h3>
              <p className="text-body-sm text-nx-on-surface-variant">com {nome}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="rounded-full p-1.5 text-nx-on-surface-variant transition-colors hover:bg-nx-container-high hover:text-nx-on-surface"
          >
            <X size={18} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-label-md uppercase text-nx-on-surface-variant">Data</span>
            <input
              ref={dateRef}
              type="date"
              min={hojeISO()}
              value={data}
              onChange={(e) => setData(e.target.value)}
              className="rounded-nx-sm border border-nx-border bg-nx-container px-3 py-2.5 text-body-md text-nx-on-surface outline-none focus:border-nx-evo [color-scheme:dark]"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-label-md uppercase text-nx-on-surface-variant">Horário</span>
            <input
              type="time"
              value={hora}
              onChange={(e) => setHora(e.target.value)}
              className="rounded-nx-sm border border-nx-border bg-nx-container px-3 py-2.5 text-body-md text-nx-on-surface outline-none focus:border-nx-evo [color-scheme:dark]"
            />
          </label>
        </div>

        <div className="mt-4">
          <span className="mb-1.5 block text-label-md uppercase text-nx-on-surface-variant">Tipo</span>
          <div className="flex gap-2">
            {TIPOS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTipo(t.id)}
                className={
                  "flex-1 rounded-nx-sm border px-3 py-2 text-body-sm transition-colors " +
                  (tipo === t.id
                    ? "border-nx-evo bg-nx-evo/10 text-nx-evo"
                    : "border-nx-border text-nx-on-surface-variant hover:bg-nx-container-high")
                }
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {erro && <p className="mt-4 text-body-sm text-nx-danger">{erro}</p>}

        <div className="mt-6 flex justify-end gap-2">
          <ButtonNx variant="ghost" onClick={onClose} disabled={salvando}>
            Cancelar
          </ButtonNx>
          <ButtonNx onClick={confirmar} disabled={salvando} leftIcon={<CalendarPlus size={16} />}>
            {salvando ? "Marcando…" : "Marcar e avisar"}
          </ButtonNx>
        </div>
      </div>
    </div>
  );
}
