import { useEffect, useState, useRef } from "react";
import { Heart, Plus, X, Camera, Globe, Lock } from "lucide-react";
import api from "../../lib/api";
import { usePacienteAuth } from "../../contexts/PacienteAuthContext";
import { tempoRelativo, type FeedPost } from "../Feed";
import { ComentariosSection } from "../../components/ComentariosSection";

type Categoria = "REFEICAO" | "TREINO" | "MOMENTO";

const CAT_EMOJI: Record<Categoria, string> = { REFEICAO: "🍽️", TREINO: "💪", MOMENTO: "✨" };
const CAT_LABEL: Record<Categoria, string> = { REFEICAO: "Refeição", TREINO: "Treino", MOMENTO: "Momento" };
const CAT_COLOR: Record<Categoria, string> = { REFEICAO: "#166534", TREINO: "#C2410C", MOMENTO: "#7C3AED" };
const CAT_BG:    Record<Categoria, string> = { REFEICAO: "#DCFCE7", TREINO: "#FEF3C7", MOMENTO: "#F3E8FF" };

const LIKES_KEY = "feed_pac_likes_v2";
function getLikes(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(LIKES_KEY) || "[]")); }
  catch { return new Set(); }
}
function saveLikes(s: Set<string>) { localStorage.setItem(LIKES_KEY, JSON.stringify([...s])); }

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function getInitials(nome: string) {
  return nome.split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase();
}

function Avatar({ nome, fotoUrl, size = 40, bg = "#52B788" }: {
  nome: string; fotoUrl?: string | null; size?: number; bg?: string;
}) {
  if (fotoUrl) return (
    <img src={fotoUrl} alt={nome} className="rounded-full object-cover flex-shrink-0"
      style={{ width: size, height: size }} />
  );
  return (
    <div className="rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
      style={{ width: size, height: size, background: bg, fontSize: size * 0.36 }}>
      {getInitials(nome)}
    </div>
  );
}

// ─── PostCard ────────────────────────────────────────────────────────────────

function PostCard({ post, liked, onLike, authHeader, meuPacienteId }: {
  post: FeedPost;
  liked: boolean;
  onLike: (id: string) => void;
  authHeader: Record<string, string>;
  meuPacienteId?: string;
}) {
  const cat = post.categoria as Categoria;
  const autorNome = post.paciente.nome;
  const autorFoto = post.paciente.pacienteUser?.fotoUrl;
  const isNutri = post.autorNutri;
  const isPrivate = post.privacidade === "APENAS_NUTRI";
  const euMesmo = post.paciente.id === meuPacienteId;

  return (
    <div className="bg-white rounded-2xl mx-3 mb-2 overflow-hidden"
      style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>

      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-2">
        <Avatar nome={autorNome} fotoUrl={isNutri ? null : autorFoto}
          bg={isNutri ? "#1B4332" : "#52B788"} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[14px] font-bold text-[#111]">
              {euMesmo && !isNutri ? "Você" : autorNome.split(" ")[0]}
            </span>
            {isNutri && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white"
                style={{ background: "#1B4332" }}>
                Nutricionista
              </span>
            )}
            {isPrivate && (
              <span className="flex items-center gap-0.5 text-[10px] text-[#bbb]">
                <Lock size={9} /> Privado
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
              style={{ color: CAT_COLOR[cat] ?? "#666", background: CAT_BG[cat] ?? "#F5F5F3" }}>
              {CAT_EMOJI[cat]} {CAT_LABEL[cat]}
            </span>
            <span className="text-[11px] text-[#bbb]">{tempoRelativo(post.criadoEm)}</span>
          </div>
        </div>
      </div>

      {/* Foto */}
      {post.fotoUrl && (
        <div className="px-3 pb-2">
          <img src={post.fotoUrl} alt="post" className="w-full rounded-xl object-cover"
            style={{ aspectRatio: "4/3" }} />
        </div>
      )}

      {/* Legenda */}
      {post.mensagem && (
        <p className="px-4 pb-3 text-[14px] text-[#333] leading-relaxed">{post.mensagem}</p>
      )}

      {/* Footer */}
      <div className="flex items-center gap-4 px-4 py-3 border-t border-[#F5F5F3]">
        <button
          onClick={() => onLike(post.id)}
          className={`flex items-center gap-1.5 text-[13px] font-medium transition-all active:scale-110 ${
            liked ? "text-red-500" : "text-[#bbb] hover:text-red-400"
          }`}
        >
          <Heart size={16} fill={liked ? "currentColor" : "none"} />
          {post.curtidas > 0 && <span>{post.curtidas}</span>}
        </button>
      </div>

      {/* Comentários */}
      <ComentariosSection
        postId={post.id}
        initialCount={post._count?.comentarios ?? 0}
        apiBase="/paciente-app/feed"
        authHeader={authHeader}
        privacidade={post.privacidade}
        isOwnerPaciente={isPrivate && post.paciente.id === meuPacienteId}
      />
    </div>
  );
}

// ─── Bottom Sheet Modal ────────────────────────────────────────────────────────

function ModalNovoPost({ token, onClose, onCreate }: {
  token: string;
  onClose: () => void;
  onCreate: (p: FeedPost) => void;
}) {
  const [cat, setCat]           = useState<Categoria>("MOMENTO");
  const [mensagem, setMensagem] = useState("");
  const [priv, setPriv]         = useState<"PUBLICO" | "APENAS_NUTRI">("PUBLICO");
  const [fotoBase64, setFoto]   = useState<string | null>(null);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState("");
  const fileRef                 = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFoto(await fileToBase64(f));
  }

  async function handleSubmit() {
    if (!mensagem.trim() && !fotoBase64) { setError("Adicione uma legenda ou foto."); return; }
    setSaving(true); setError("");
    try {
      const res = await api.post<FeedPost>("/paciente-app/feed",
        { mensagem: mensagem.trim(), categoria: cat, privacidade: priv, fotoBase64 },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      onCreate(res.data);
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.error || "Erro ao publicar.");
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-t-3xl w-full max-h-[92vh] overflow-y-auto pb-10">
        <div className="w-10 h-1 bg-[#E0E0E0] rounded-full mx-auto mt-3 mb-5" />

        <div className="px-5">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-[18px] font-bold text-[#111]">Nova publicação</h2>
            <button onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-[#F5F5F3]">
              <X size={16} className="text-[#666]" />
            </button>
          </div>

          {/* Categoria */}
          <p className="text-[11px] font-semibold text-[#888] uppercase tracking-wide mb-3">Categoria</p>
          <div className="grid grid-cols-3 gap-2 mb-5">
            {(["REFEICAO", "TREINO", "MOMENTO"] as Categoria[]).map(c => (
              <button key={c} onClick={() => setCat(c)}
                className={`flex flex-col items-center gap-1 py-4 rounded-2xl border-2 transition-all ${
                  cat === c ? "border-[#1B4332] bg-[#F0FAF5]" : "border-[#F0F0EE] bg-white"
                }`}>
                <span className="text-[28px]">{CAT_EMOJI[c]}</span>
                <span className="text-[12px] font-semibold"
                  style={{ color: cat === c ? "#1B4332" : "#888" }}>
                  {CAT_LABEL[c]}
                </span>
              </button>
            ))}
          </div>

          {/* Foto */}
          {fotoBase64 ? (
            <div className="relative rounded-2xl overflow-hidden mb-4" style={{ aspectRatio: "4/3" }}>
              <img src={fotoBase64} alt="preview" className="w-full h-full object-cover" />
              <button onClick={() => setFoto(null)}
                className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center rounded-full bg-black/50 text-white">
                <X size={14} />
              </button>
            </div>
          ) : (
            <button onClick={() => fileRef.current?.click()}
              className="w-full border-2 border-dashed border-[#D0D0D0] rounded-2xl flex flex-col items-center gap-2 py-8 mb-4 text-[#bbb] hover:border-[#1B4332] hover:text-[#1B4332] transition-colors">
              <Camera size={28} />
              <span className="text-[13px] font-medium">Adicionar foto</span>
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/*" capture="environment"
            className="hidden" onChange={handleFile} />

          {/* Legenda */}
          <textarea
            value={mensagem}
            onChange={e => setMensagem(e.target.value)}
            placeholder="Como foi? Conte para o consultório… ✨"
            rows={3}
            className="w-full px-4 py-3 rounded-2xl border border-[#E8E8E8] text-[14px] text-[#333] placeholder-[#bbb] resize-none focus:outline-none focus:border-[#1B4332] mb-4"
          />

          {/* Privacidade */}
          <div className="flex items-center justify-between p-4 rounded-2xl border border-[#E8E8E8] mb-5">
            <div className="flex items-center gap-2">
              {priv === "PUBLICO"
                ? <Globe size={18} style={{ color: "#1B4332" }} />
                : <Lock size={18} style={{ color: "#B45309" }} />}
              <div>
                <p className="text-[13px] font-semibold text-[#111]">
                  {priv === "PUBLICO" ? "Todos do consultório" : "Só minha nutricionista"}
                </p>
                <p className="text-[11px] text-[#999]">
                  Toque para {priv === "PUBLICO" ? "deixar privado" : "tornar público"}
                </p>
              </div>
            </div>
            <button
              onClick={() => setPriv(p => p === "PUBLICO" ? "APENAS_NUTRI" : "PUBLICO")}
              className="relative w-12 h-6 rounded-full transition-all flex-shrink-0"
              style={{ background: priv === "PUBLICO" ? "#1B4332" : "#D0D0D0" }}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${
                priv === "PUBLICO" ? "left-7" : "left-1"
              }`} />
            </button>
          </div>

          {error && <p className="text-red-400 text-[13px] mb-3">{error}</p>}

          <button onClick={handleSubmit} disabled={saving}
            className="w-full py-4 rounded-2xl text-white text-[15px] font-bold disabled:opacity-50"
            style={{ background: "#1B4332" }}>
            {saving ? "Publicando…" : "Publicar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function FeedPaciente() {
  const { paciente, token } = usePacienteAuth();
  const [posts, setPosts]       = useState<FeedPost[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [likes, setLikes]       = useState<Set<string>>(getLikes);

  const authHeader = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    api.get<FeedPost[]>("/paciente-app/feed", { headers: authHeader })
      .then(r => setPosts(r.data))
      .finally(() => setLoading(false));
  }, []);

  function handleLike(id: string) {
    setLikes(prev => {
      const next = new Set(prev);
      const wasLiked = next.has(id);
      wasLiked ? next.delete(id) : next.add(id);
      saveLikes(next);
      setPosts(ps => ps.map(p =>
        p.id === id ? { ...p, curtidas: Math.max(0, p.curtidas + (wasLiked ? -1 : 1)) } : p
      ));
      api.post(`/paciente-app/feed/${id}/curtir`, {}, { headers: authHeader }).catch(() => null);
      return next;
    });
  }

  return (
    <>
      {showModal && token && (
        <ModalNovoPost token={token} onClose={() => setShowModal(false)}
          onCreate={p => setPosts(prev => [p, ...prev])} />
      )}

      <div className="pt-4 pb-4">
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-2xl mx-3 animate-pulse" style={{ height: 280 }} />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
            <div className="text-6xl mb-4">🌱</div>
            <p className="text-[18px] font-bold text-[#111] mb-2">Seja o primeiro a compartilhar!</p>
            <p className="text-[14px] text-[#999] mb-8 leading-relaxed">
              Registre suas refeições, treinos e momentos especiais com o consultório.
            </p>
            <button onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl text-white text-[14px] font-bold"
              style={{ background: "#1B4332" }}>
              <Plus size={16} /> Criar publicação
            </button>
          </div>
        ) : (
          posts.map(post => (
            <PostCard
              key={post.id}
              post={post}
              liked={likes.has(post.id)}
              onLike={handleLike}
              authHeader={authHeader}
              meuPacienteId={paciente?.id}
            />
          ))
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => setShowModal(true)}
        className="fixed right-4 z-40 w-14 h-14 rounded-full flex items-center justify-center text-white shadow-lg transition-transform active:scale-95"
        style={{ background: "#1B4332", bottom: "84px" }}
      >
        <Plus size={24} />
      </button>
    </>
  );
}
