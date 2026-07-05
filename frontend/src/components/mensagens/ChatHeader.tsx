import { useState } from "react";

interface Props {
  nome: string;
  online: boolean;
  busca: string;
  onBusca: (v: string) => void;
  onMarcarLida: () => void;
  onVerPerfil: () => void;
}

// Header do chat: nome + badge Online + busca na conversa (search) + menu (more_vert).
export default function ChatHeader({ nome, online, busca, onBusca, onMarcarLida, onVerPerfil }: Props) {
  const [buscaAberta, setBuscaAberta] = useState(false);
  const [menuAberto, setMenuAberto] = useState(false);

  return (
    <div className="h-16 px-6 border-b border-nx-primary-container/10 bg-nx-surface/80 backdrop-blur-md flex items-center justify-between z-10 relative">
      <div className="flex items-center gap-3 min-w-0">
        <h2 className="text-headline-md text-nx-on-surface truncate">{nome}</h2>
        {online && (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-nx-primary/20 text-nx-primary uppercase tracking-wider flex-shrink-0">
            Online
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {buscaAberta && (
          <input
            autoFocus
            value={busca}
            onChange={(e) => onBusca(e.target.value)}
            placeholder="Buscar na conversa…"
            className="bg-nx-container-high border-none rounded-lg px-3 py-1.5 text-body-sm text-nx-on-surface focus:ring-1 focus:ring-nx-primary placeholder:text-nx-on-surface-variant/50 w-48"
          />
        )}
        <button
          onClick={() => {
            setBuscaAberta((s) => {
              if (s) onBusca("");
              return !s;
            });
          }}
          className={`p-2 transition-colors ${buscaAberta ? "text-nx-primary" : "text-nx-on-surface-variant hover:text-nx-primary"}`}
        >
          <span className="material-symbols-outlined">search</span>
        </button>

        <div className="relative">
          <button
            onClick={() => setMenuAberto((s) => !s)}
            className="p-2 text-nx-on-surface-variant hover:text-nx-primary transition-colors"
          >
            <span className="material-symbols-outlined">more_vert</span>
          </button>
          {menuAberto && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuAberto(false)} />
              <div className="absolute right-0 top-full mt-1 w-56 glass-panel rounded-lg py-1 z-20">
                <button
                  onClick={() => { setMenuAberto(false); onMarcarLida(); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-body-sm text-nx-on-surface hover:bg-[#343342]/50 transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px] text-nx-on-surface-variant">done_all</span>
                  Marcar como lida
                </button>
                <button
                  onClick={() => { setMenuAberto(false); onVerPerfil(); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-body-sm text-nx-on-surface hover:bg-[#343342]/50 transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px] text-nx-on-surface-variant">person</span>
                  Ver perfil completo
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
