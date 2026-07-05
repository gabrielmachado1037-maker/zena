import { useState, useRef, useEffect } from "react";
import { MessageCircle, Send } from "lucide-react";
import api from "../lib/api";
import { tempoRelativo } from "../lib/feed";
import Avatar from "./Avatar";

export interface Comentario {
  id: string;
  autorTipo: "NUTRICIONISTA" | "PACIENTE";
  autorNome: string;
  autorAvatarUrl?: string | null;
  texto: string;
  createdAt: string;
}

export function ComentariosSection({
  postId,
  initialCount,
  apiBase,
  authHeader,
  privacidade,
  isOwnerPaciente,
}: {
  postId: string;
  initialCount: number;
  apiBase: string;           // "/feed" | "/paciente-app/feed"
  authHeader?: Record<string, string>;
  privacidade: string;
  isOwnerPaciente: boolean;  // se o viewer é o paciente dono do post privado
}) {
  const [expanded, setExpanded]     = useState(false);
  const [comments, setComments]     = useState<Comentario[]>([]);
  const [loaded, setLoaded]         = useState(false);
  const [loading, setLoading]       = useState(false);
  const [count, setCount]           = useState(initialCount);
  const [texto, setTexto]           = useState("");
  const [sending, setSending]       = useState(false);
  const [error, setError]           = useState("");
  const textareaRef                 = useRef<HTMLTextAreaElement>(null);
  const listRef                     = useRef<HTMLDivElement>(null);

  // paciente não pode comentar em posts privados de outros
  const canComment = privacidade !== "APENAS_NUTRI" || isOwnerPaciente;

  async function load() {
    if (loaded) return;
    setLoading(true);
    try {
      const res = await api.get<Comentario[]>(`${apiBase}/${postId}/comentarios`, {
        headers: authHeader,
      });
      setComments(res.data);
      setCount(res.data.length);
      setLoaded(true);
    } catch { /* silently ignore */ }
    finally { setLoading(false); }
  }

  function toggle() {
    if (!expanded) load();
    setExpanded(e => !e);
  }

  useEffect(() => {
    if (expanded && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [comments, expanded]);

  async function handleSend() {
    const txt = texto.trim();
    if (!txt) return;
    if (txt.length > 500) { setError("Máximo 500 caracteres."); return; }
    setError(""); setSending(true);
    try {
      const res = await api.post<Comentario>(
        `${apiBase}/${postId}/comentarios`,
        { texto: txt },
        { headers: authHeader }
      );
      setComments(prev => [...prev, res.data]);
      setCount(c => c + 1);
      setTexto("");
    } catch (err: any) {
      setError(err?.response?.data?.error || "Erro ao enviar.");
    } finally { setSending(false); }
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="border-t border-[#F0F0EE]">
      {/* Trigger */}
      <button
        onClick={toggle}
        className="flex items-center gap-1.5 px-4 py-2.5 w-full text-left hover:bg-[#FAFAF8] transition-colors"
      >
        <MessageCircle size={14} className={expanded ? "text-[#7C3AED]" : "text-[#bbb]"} />
        <span className={`text-[12px] font-medium ${expanded ? "text-[#7C3AED]" : "text-[#bbb]"}`}>
          {count > 0 ? `${count} comentário${count !== 1 ? "s" : ""}` : "Comentar"}
        </span>
      </button>

      {/* Expanded section */}
      {expanded && (
        <div className="px-4 pb-3">
          {/* Lista */}
          {loading ? (
            <div className="space-y-2 mb-3">
              {[1, 2].map(i => (
                <div key={i} className="flex gap-2 animate-pulse">
                  <div className="w-7 h-7 rounded-full bg-[#F0F0EE] flex-shrink-0" />
                  <div className="flex-1 h-10 bg-[#F0F0EE] rounded-xl" />
                </div>
              ))}
            </div>
          ) : comments.length === 0 ? (
            <p className="text-[12px] text-[#ccc] text-center py-3">
              Nenhum comentário ainda.
            </p>
          ) : (
            <div ref={listRef} className="space-y-3 mb-3 max-h-64 overflow-y-auto pr-1">
              {comments.map(c => (
                <div key={c.id} className="flex gap-2">
                  <Avatar
                    src={c.autorAvatarUrl}
                    nome={c.autorNome}
                    tamanho={28}
                    borda={c.autorTipo === "NUTRICIONISTA" ? "2px solid #7C3AED" : undefined}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                      <span className="text-[12px] font-semibold text-[#111]">
                        {c.autorNome.split(" ")[0]}
                      </span>
                      {c.autorTipo === "NUTRICIONISTA" && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide text-white" style={{ background: "#7C3AED" }}>
                          Nutricionista
                        </span>
                      )}
                      <span className="text-[10px] text-[#ccc]">{tempoRelativo(c.createdAt)}</span>
                    </div>
                    <p className="text-[13px] text-[#444] leading-snug break-words">{c.texto}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Input */}
          {canComment && (
            <div className="flex gap-2 items-end">
              <div className="flex-1 relative">
                <textarea
                  ref={textareaRef}
                  value={texto}
                  onChange={e => { setTexto(e.target.value); setError(""); }}
                  onKeyDown={handleKey}
                  placeholder="Escreva um comentário…"
                  rows={1}
                  maxLength={500}
                  className="w-full px-3 py-2 border border-[#E8E8E8] rounded-xl text-[13px] text-[#333] placeholder-[#ccc] resize-none focus:outline-none focus:border-[#7C3AED] leading-snug"
                  style={{ minHeight: 36 }}
                />
                {texto.length > 400 && (
                  <span className="absolute right-2 bottom-2 text-[10px] text-[#bbb]">
                    {texto.length}/500
                  </span>
                )}
              </div>
              <button
                onClick={handleSend}
                disabled={sending || !texto.trim()}
                className="w-9 h-9 flex items-center justify-center rounded-xl text-white disabled:opacity-40 transition-colors flex-shrink-0"
                style={{ background: "#7C3AED" }}
              >
                <Send size={15} />
              </button>
            </div>
          )}
          {error && <p className="text-[11px] text-red-400 mt-1">{error}</p>}
        </div>
      )}
    </div>
  );
}
