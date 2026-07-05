import { useLayoutEffect, useRef, useState } from "react";
import { RESPOSTAS_RAPIDAS } from "../../lib/mensagens";

interface Props {
  valor: string;
  onChange: (v: string) => void;
  onEnviar: () => void;
  disabled?: boolean;
}

// Barra de input: attach_file (abre seletor de arquivo), <textarea> com auto-resize,
// botão "Rápidas" (respostas prontas) e botão send.
export default function MessageInput({ valor, onChange, onEnviar, disabled }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [rapidasAberto, setRapidasAberto] = useState(false);

  // Auto-resize: replica `this.style.height = 'auto'; = scrollHeight` do mockup.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [valor]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onEnviar();
    }
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) onChange(`${valor}${valor ? " " : ""}[anexo: ${f.name}]`);
    e.target.value = "";
  }

  return (
    <div className="p-4 bg-nx-surface border-t border-nx-primary-container/10">
      <div className="flex items-end gap-3 bg-nx-container-high rounded-xl p-2 focus-within:ring-1 focus-within:ring-nx-primary transition-all">
        <button
          onClick={() => fileRef.current?.click()}
          className="p-2 text-nx-on-surface-variant hover:text-nx-primary transition-colors mb-1 rounded-full hover:bg-[#343342]/50"
        >
          <span className="material-symbols-outlined">attach_file</span>
        </button>
        <input ref={fileRef} type="file" className="hidden" onChange={handleFile} />

        <textarea
          ref={ref}
          value={valor}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          style={{ minHeight: "48px" }}
          placeholder="Digite sua mensagem..."
          className="flex-1 bg-transparent border-none focus:ring-0 text-body-md text-nx-on-surface resize-none py-3 hide-scrollbar max-h-32"
        />

        <div className="flex gap-1 mb-1 relative">
          <button
            title="Respostas Rápidas"
            onClick={() => setRapidasAberto((s) => !s)}
            className="p-2 text-nx-primary hover:text-[#eaddff] bg-nx-primary/10 rounded-full transition-colors flex items-center justify-center gap-1 text-label-md px-3"
          >
            <span className="material-symbols-outlined text-[18px]">bolt</span>
            <span className="hidden md:inline">Rápidas</span>
          </button>
          <button
            onClick={onEnviar}
            disabled={disabled}
            className="p-2 bg-nx-primary-container text-nx-on-primary-container rounded-full hover:bg-nx-primary transition-colors disabled:opacity-40"
          >
            <span className="material-symbols-outlined">send</span>
          </button>

          {rapidasAberto && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setRapidasAberto(false)} />
              <div className="absolute bottom-full right-0 mb-2 w-72 glass-panel rounded-xl py-2 z-20">
                <p className="px-4 py-1 text-label-sm text-nx-on-surface-variant uppercase tracking-wider">
                  Respostas rápidas
                </p>
                {RESPOSTAS_RAPIDAS.map((r) => (
                  <button
                    key={r}
                    onClick={() => { onChange(r); setRapidasAberto(false); ref.current?.focus(); }}
                    className="w-full text-left px-4 py-2 text-body-sm text-nx-on-surface hover:bg-[#343342]/50 transition-colors"
                  >
                    {r}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
