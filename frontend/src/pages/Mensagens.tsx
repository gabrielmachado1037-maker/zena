import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { MessagesSquare, Search } from "lucide-react";
import { getConversas, formatHoraLista, type Conversa } from "../lib/mensagens";
import Avatar from "../components/mensagens/Avatar";

type Filtro = "todas" | "nao_lidas" | "arquivadas";

// Central de Conversas (nutricionista) — lista estilo WhatsApp Business: todas as conversas
// ordenadas pela mensagem mais recente. Tocar abre o chat em tela cheia (/app/mensagens/:id).
export default function Mensagens() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [conversas, setConversas] = useState<Conversa[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todas");

  // Deep-link legado ?paciente=<id> → abre direto a conversa.
  const alvoInicial = searchParams.get("paciente");
  useEffect(() => {
    if (alvoInicial) navigate(`/app/mensagens/${alvoInicial}`, { replace: true });
  }, [alvoInicial, navigate]);

  useEffect(() => {
    let vivo = true;
    getConversas()
      .then((cs) => vivo && setConversas(cs))
      .catch(() => {})
      .finally(() => vivo && setLoading(false));
    return () => { vivo = false; };
  }, []);

  const totalNaoLidas = useMemo(() => conversas.filter((c) => c.naoLidoCount > 0).length, [conversas]);

  const lista = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return conversas.filter((c) => {
      if (filtro === "nao_lidas" && c.naoLidoCount === 0) return false;
      if (filtro === "arquivadas") return false; // arquivamento chega em versão futura
      if (termo && !c.nome.toLowerCase().includes(termo)) return false;
      return true;
    });
  }, [conversas, busca, filtro]);

  const CHIPS: { key: Filtro; label: string }[] = [
    { key: "todas", label: "Todas" },
    { key: "nao_lidas", label: totalNaoLidas > 0 ? `Não lidas (${totalNaoLidas})` : "Não lidas" },
    { key: "arquivadas", label: "Arquivadas" },
  ];

  return (
    <div className="px-5 py-4 md:px-8 md:py-6">
      <h1 className="text-headline-md font-bold text-nx-on-surface mb-4 px-1">Mensagens</h1>

      {/* Busca */}
      <div className="flex items-center gap-2 rounded-nx-md bg-nx-container border border-nx-border px-3 py-2.5 mb-3">
        <Search size={18} className="text-nx-outline shrink-0" />
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar paciente…"
          className="flex-1 bg-transparent text-body-md text-nx-on-surface placeholder:text-nx-outline focus:outline-none"
        />
      </div>

      {/* Filtros */}
      <div className="flex gap-2 mb-4 overflow-x-auto hide-scrollbar">
        {CHIPS.map((c) => (
          <button
            key={c.key}
            onClick={() => setFiltro(c.key)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-label-md font-medium transition-colors ${
              filtro === c.key
                ? "bg-nx-evo text-nx-on-evo"
                : "bg-nx-container text-nx-on-surface-variant border border-nx-border hover:text-nx-on-surface"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Lista */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-nx-md bg-nx-container/60" />
          ))}
        </div>
      ) : filtro === "arquivadas" ? (
        <EstadoVazio texto="Arquivamento de conversas chega em uma próxima versão." />
      ) : lista.length === 0 ? (
        <EstadoVazio texto={busca ? "Nenhum paciente encontrado." : "Nenhuma conversa ainda."} />
      ) : (
        <div className="divide-y divide-nx-border/60 rounded-nx-lg border border-nx-border bg-nx-surface overflow-hidden">
          {lista.map((c) => (
            <button
              key={c.id}
              onClick={() => navigate(`/app/mensagens/${c.id}`)}
              className="w-full flex items-center gap-3 px-3 py-3 text-left hover:bg-nx-surface-hover transition-colors"
            >
              <div className="relative shrink-0">
                <Avatar url={c.avatarUrl} nome={c.nome} className="w-12 h-12 rounded-full" />
                {c.online && (
                  <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-nx-surface bg-nx-evo" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="flex-1 truncate font-semibold text-nx-on-surface">{c.nome}</p>
                  <span className={`text-label-sm shrink-0 ${c.naoLidoCount > 0 ? "text-nx-evo" : "text-nx-outline"}`}>
                    {formatHoraLista(c.ultimaAtividade)}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className={`flex-1 truncate text-body-sm ${c.naoLidoCount > 0 ? "text-nx-on-surface" : "text-nx-on-surface-variant"}`}>
                    {c.previa}
                  </p>
                  {c.naoLidoCount > 0 && (
                    <span className="shrink-0 min-w-[20px] h-5 px-1.5 grid place-items-center rounded-full bg-nx-evo text-nx-on-evo text-[11px] font-bold">
                      {c.naoLidoCount > 99 ? "99+" : c.naoLidoCount}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function EstadoVazio({ texto }: { texto: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-nx-lg border border-nx-border bg-nx-surface py-16 text-nx-on-surface-variant">
      <MessagesSquare size={40} className="mb-3 text-nx-outline" />
      <p className="text-body-md">{texto}</p>
    </div>
  );
}
