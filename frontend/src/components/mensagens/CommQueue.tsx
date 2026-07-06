import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { Conversa } from "../../lib/mensagens";
import { SEGMENTOS, noSegmento, type Segmento, type Situacao } from "../../lib/comunicacao";
import Avatar from "./Avatar";

interface Props {
  conversas: Conversa[]; // já ordenadas por prioridade
  situacoes: Record<string, Situacao>;
  ativaId: string | null;
  onSelect: (id: string) => void;
  loading: boolean;
}

// Uma cor, uma função — pontinho e texto do motivo seguem o tom da situação.
const DOT: Record<Situacao["tone"], string> = {
  water: "bg-nx-water",
  gold: "bg-nx-gold",
  danger: "bg-nx-danger",
  evo: "bg-nx-evo",
  streak: "bg-nx-streak",
  neutral: "bg-nx-outline",
};
const INK: Record<Situacao["tone"], string> = {
  water: "text-nx-water",
  gold: "text-nx-gold",
  danger: "text-nx-danger",
  evo: "text-nx-evo",
  streak: "text-nx-streak",
  neutral: "text-nx-on-surface-variant",
};

/** Coluna esquerda — a fila de comunicação: quem precisa de um toque, em ordem de urgência. */
export default function CommQueue({ conversas, situacoes, ativaId, onSelect, loading }: Props) {
  const [busca, setBusca] = useState("");
  const [seg, setSeg] = useState<Segmento>("todos");

  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return conversas.filter((c) => {
      const s = situacoes[c.id];
      if (!s || !noSegmento(seg, s)) return false;
      if (q && !c.nome.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [conversas, situacoes, busca, seg]);

  // Contagem de "precisam de você agora" (responder + em risco) para o subtítulo.
  const urgentes = useMemo(
    () => conversas.filter((c) => (situacoes[c.id]?.prioridade ?? 9) <= 1).length,
    [conversas, situacoes],
  );

  return (
    <div className="flex w-[340px] flex-shrink-0 flex-col overflow-hidden rounded-nx-lg border border-nx-border bg-nx-surface">
      <div className="border-b border-nx-border p-5">
        <h1 className="text-headline-lg text-nx-on-surface">Comunicação</h1>
        <p className="mt-1 text-body-sm text-nx-on-surface-variant">
          {loading
            ? "Carregando…"
            : urgentes > 0
              ? `${urgentes} ${urgentes === 1 ? "pessoa precisa" : "pessoas precisam"} de você agora`
              : "Ninguém urgente — mantenha o ritmo 💚"}
        </p>

        <div className="relative mt-4">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-nx-outline" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar paciente…"
            className="w-full rounded-nx-sm border border-nx-border bg-nx-container py-2.5 pl-9 pr-3 text-body-sm text-nx-on-surface outline-none placeholder:text-nx-outline focus:border-nx-evo/50"
          />
        </div>

        <div className="mt-3 flex gap-1.5">
          {SEGMENTOS.map((s) => (
            <button
              key={s.id}
              onClick={() => setSeg(s.id)}
              className={
                "whitespace-nowrap rounded-full px-2.5 py-1.5 text-label-sm uppercase transition-colors " +
                (seg === s.id
                  ? "bg-nx-evo text-nx-on-evo"
                  : "bg-nx-container-high text-nx-on-surface-variant hover:text-nx-on-surface")
              }
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-1 overflow-y-auto hide-scrollbar p-2">
        {loading ? (
          <p className="mt-8 text-center text-body-sm text-nx-on-surface-variant">Carregando…</p>
        ) : filtradas.length === 0 ? (
          <p className="mt-8 px-4 text-center text-body-sm text-nx-on-surface-variant">
            Nenhum paciente neste filtro.
          </p>
        ) : (
          filtradas.map((c) => {
            const s = situacoes[c.id];
            const ativo = c.id === ativaId;
            return (
              <button
                key={c.id}
                onClick={() => onSelect(c.id)}
                className={
                  "flex items-center gap-3 rounded-nx-md p-3 text-left transition-colors " +
                  (ativo ? "bg-nx-container-high ring-1 ring-nx-evo/40" : "hover:bg-nx-container-high/50")
                }
              >
                <div className="relative flex-shrink-0">
                  <Avatar url={c.avatarUrl} nome={c.nome} className="size-11 rounded-full text-sm" />
                  {c.online && (
                    <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-nx-surface bg-nx-evo" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-body-md font-medium text-nx-on-surface">{c.nome}</span>
                    {c.naoLidoCount > 0 && (
                      <span className="flex size-5 flex-shrink-0 items-center justify-center rounded-full bg-nx-water text-[10px] font-bold text-[#04263f]">
                        {c.naoLidoCount}
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 flex items-center gap-1.5">
                    <span className={"size-1.5 flex-shrink-0 rounded-full " + DOT[s.tone]} />
                    <span className={"truncate text-body-sm " + INK[s.tone]}>{s.motivo}</span>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
