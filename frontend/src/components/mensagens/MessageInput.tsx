import { useLayoutEffect, useRef, useState } from "react";
import { RESPOSTAS_RAPIDAS } from "../../lib/mensagens";

interface Props {
  valor: string;
  onChange: (v: string) => void;
  onEnviar: (anexoBase64?: string) => void;
  disabled?: boolean;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

// Barra de input: attach_file (anexa imagem com preview), <textarea> com auto-resize,
// botão "Rápidas" (respostas prontas) e botão send.
export default function MessageInput({ valor, onChange, onEnviar, disabled }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [rapidasAberto, setRapidasAberto] = useState(false);
  const [anexo, setAnexo] = useState<string | null>(null);

  // Auto-resize: replica `this.style.height = 'auto'; = scrollHeight` do mockup.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [valor]);

  function enviar() {
    if (disabled) return;
    if (!valor.trim() && !anexo) return;
    onEnviar(anexo ?? undefined);
    setAnexo(null);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      enviar();
    }
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f && f.type.startsWith("image/")) setAnexo(await fileToBase64(f));
    e.target.value = "";
  }

  return (
    <div className="p-4 bg-nx-surface border-t border-nx-border">
      {anexo && (
        <div className="mb-2 flex items-center gap-2">
          <div className="relative">
            <img src={anexo} alt="Anexo" className="h-16 w-16 rounded-lg object-cover border border-nx-border" />
            <button
              onClick={() => setAnexo(null)}
              aria-label="Remover anexo"
              className="absolute -top-1.5 -right-1.5 bg-nx-container-high rounded-full p-0.5 text-nx-on-surface-variant hover:text-nx-danger border border-nx-surface"
            >
              <span className="material-symbols-outlined text-[16px] leading-none">close</span>
            </button>
          </div>
          <span className="text-label-sm text-nx-on-surface-variant">Imagem anexada</span>
        </div>
      )}
      <div className="flex items-end gap-3 bg-nx-container-high rounded-xl p-2 focus-within:ring-1 focus-within:ring-nx-evo transition-all">
        <button
          onClick={() => fileRef.current?.click()}
          title="Anexar imagem"
          className="p-2 text-nx-on-surface-variant hover:text-nx-evo transition-colors mb-1 rounded-full hover:bg-nx-surface-hover"
        >
          <span className="material-symbols-outlined">attach_file</span>
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />

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
            className="p-2 text-nx-evo hover:text-nx-evo-2 bg-nx-evo/10 rounded-full transition-colors flex items-center justify-center gap-1 text-label-md px-3"
          >
            <span className="material-symbols-outlined text-[18px]">bolt</span>
            <span className="hidden md:inline">Rápidas</span>
          </button>
          <button
            onClick={enviar}
            disabled={disabled}
            className="p-2 bg-nx-evo text-nx-on-evo rounded-full hover:bg-nx-evo-2 transition-colors disabled:opacity-40"
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
                    className="w-full text-left px-4 py-2 text-body-sm text-nx-on-surface hover:bg-nx-surface-hover transition-colors"
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
