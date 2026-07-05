import { useMemo, useState } from "react";
import type { Conversa } from "../../lib/mensagens";
import InboxItem from "./InboxItem";

interface Props {
  conversas: Conversa[];
  ativaId: string | null;
  onSelect: (id: string) => void;
  loading?: boolean;
}

// Coluna esquerda — Inbox (w-320px, glass-panel). Busca + filtro "só não lidas".
export default function InboxList({ conversas, ativaId, onSelect, loading }: Props) {
  const [busca, setBusca] = useState("");
  const [soNaoLidas, setSoNaoLidas] = useState(false);

  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return conversas.filter((c) => {
      if (soNaoLidas && c.naoLidoCount === 0) return false;
      if (q && !c.nome.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [conversas, busca, soNaoLidas]);

  return (
    <div className="w-[320px] flex-shrink-0 flex flex-col glass-panel rounded-xl overflow-hidden">
      <div className="p-4 border-b border-nx-primary-container/10 bg-nx-surface">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-headline-md text-nx-on-surface">Inbox</h2>
          <button
            onClick={() => setSoNaoLidas((s) => !s)}
            title="Filtrar não lidas"
            className={`transition-colors ${soNaoLidas ? "text-nx-primary" : "text-nx-on-surface-variant hover:text-nx-primary"}`}
          >
            <span className="material-symbols-outlined" style={soNaoLidas ? { fontVariationSettings: "'FILL' 1" } : undefined}>
              filter_list
            </span>
          </button>
        </div>
        <div className="relative">
          <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-nx-on-surface-variant text-[18px]">
            search
          </span>
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar paciente..."
            className="w-full bg-nx-container-high border-none rounded-lg pl-9 pr-3 py-2 text-body-sm text-nx-on-surface focus:ring-1 focus:ring-nx-primary placeholder:text-nx-on-surface-variant/50"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto hide-scrollbar px-2 py-2 flex flex-col gap-1">
        {loading ? (
          <p className="text-body-sm text-nx-on-surface-variant text-center mt-6">Carregando…</p>
        ) : filtradas.length === 0 ? (
          <p className="text-body-sm text-nx-on-surface-variant text-center mt-6">
            {soNaoLidas ? "Nenhuma conversa não lida." : "Nenhuma conversa."}
          </p>
        ) : (
          filtradas.map((c) => (
            <InboxItem key={c.id} conversa={c} ativo={c.id === ativaId} onClick={() => onSelect(c.id)} />
          ))
        )}
      </div>
    </div>
  );
}
