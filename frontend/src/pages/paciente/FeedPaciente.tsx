import { useEffect, useState, useRef } from "react";
import { Heart, Lock, Globe, Plus, X, Camera, UtensilsCrossed, Dumbbell, Sparkles } from "lucide-react";
import api from "../../lib/api";
import { usePacienteAuth } from "../../contexts/PacienteAuthContext";
import { CAT, tempoRelativo, type FeedPost } from "../Feed";

type Categoria = "REFEICAO" | "TREINO" | "MOMENTO";
type Privacidade = "PUBLICO" | "APENAS_NUTRI";

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

// ─── PostCard paciente ────────────────────────────────────────────────────────

function PostCard({ post, liked, onLike, euMesmoNome }: {
  post: FeedPost;
  liked: boolean;
  onLike: (id: string) => void;
  euMesmoNome?: string;
}) {
  const cat = CAT[post.categoria as Categoria] ?? CAT.MOMENTO;
  const Icon = cat.icon;
  const isPrivate = post.privacidade === "APENAS_NUTRI";
  const euMesmo = post.paciente.nome === euMesmoNome;

  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-[#F0F0EE]">
      {post.fotoUrl && (
        <img src={post.fotoUrl} alt="" className="w-full object-cover" style={{ maxHeight: 260 }} loading="lazy" />
      )}
      <div className="p-4 flex flex-col gap-3">
        <div className="flex items-center gap-2.5">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[12px] font-bold flex-shrink-0"
            style={{ background: euMesmo ? "#1B4332" : cat.color }}
          >
            {getInitials(post.paciente.nome)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="text-[14px] font-semibold text-[#111]">
                {euMesmo ? `${post.paciente.nome.split(" ")[0]} (você)` : post.paciente.nome.split(" ")[0]}
              </p>
              {post.autorNutri && (
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide text-white" style={{ background: "#1B4332" }}>
                  Nutricionista
                </span>
              )}
              {isPrivate && <Lock size={11} className="text-[#bbb]" />}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold"
                style={{ color: cat.color, backgroundColor: cat.bg }}
              >
                <Icon size={9} /> {cat.label}
              </span>
              <span className="text-[11px] text-[#ccc]">{tempoRelativo(post.criadoEm)}</span>
            </div>
          </div>
        </div>
        {post.mensagem && (
          <p className="text-[14px] text-[#444] leading-relaxed">{post.mensagem}</p>
        )}
        <div className="flex items-center pt-1 border-t border-[#F5F5F3]">
          <button
            onClick={() => onLike(post.id)}
            className={`flex items-center gap-1.5 text-[12px] font-medium transition-all active:scale-110 ${
              liked ? "text-red-500" : "text-[#bbb] hover:text-red-400"
            }`}
          >
            <Heart size={15} fill={liked ? "currentColor" : "none"} />
            {post.curtidas > 0 && <span>{post.curtidas}</span>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal novo post ──────────────────────────────────────────────────────────

function ModalNovoPost({ token, onClose, onCreate }: {
  token: string;
  onClose: () => void;
  onCreate: (post: FeedPost) => void;
}) {
  const [categoria, setCat]    = useState<Categoria>("MOMENTO");
  const [privacidade, setPriv] = useState<Privacidade>("PUBLICO");
  const [mensagem, setMsg]     = useState("");
  const [foto, setFoto]        = useState<{ file: File; preview: string } | null>(null);
  const [saving, setSaving]    = useState(false);
  const [error, setError]      = useState("");
  const fileRef                = useRef<HTMLInputElement>(null);

  const CatIcons: Record<Categoria, React.FC<{ size?: number; style?: React.CSSProperties }>> = {
    REFEICAO: UtensilsCrossed,
    TREINO: Dumbbell,
    MOMENTO: Sparkles,
  };

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFoto({ file, preview: URL.createObjectURL(file) });
  }

  async function handleSubmit() {
    if (!mensagem.trim() && !foto) { setError("Adicione uma legenda ou foto."); return; }
    setError(""); setSaving(true);
    try {
      let fotoBase64: string | undefined;
      if (foto) fotoBase64 = await fileToBase64(foto.file);
      const { data } = await api.post<FeedPost>(
        "/paciente-app/feed",
        { mensagem: mensagem.trim(), categoria, privacidade, ...(fotoBase64 ? { fotoBase64 } : {}) },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      onCreate(data);
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.error || "Erro ao publicar.");
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white w-full rounded-t-3xl shadow-2xl max-h-[92vh] overflow-y-auto">
        <div className="w-10 h-1 bg-[#E0E0DE] rounded-full mx-auto mt-3" />
        <div className="p-5">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-[17px] font-bold text-[#111]">Compartilhar</h2>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-[#F5F5F3]">
              <X size={16} className="text-[#666]" />
            </button>
          </div>

          {/* Categoria */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {(Object.keys(CAT) as Categoria[]).map(k => {
              const c = CAT[k];
              const CIcon = CatIcons[k];
              const active = categoria === k;
              return (
                <button key={k} onClick={() => setCat(k)}
                  className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 transition-all ${active ? "border-transparent" : "border-[#F0F0EE] bg-white"}`}
                  style={active ? { backgroundColor: c.bg, borderColor: c.color + "50" } : {}}>
                  <CIcon size={20} style={{ color: active ? c.color : "#bbb" }} />
                  <span className="text-[11px] font-semibold" style={{ color: active ? c.color : "#bbb" }}>{c.label}</span>
                </button>
              );
            })}
          </div>

          {/* Foto */}
          <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />
          {foto ? (
            <div className="relative mb-4 rounded-xl overflow-hidden">
              <img src={foto.preview} alt="" className="w-full object-cover rounded-xl" style={{ maxHeight: 200 }} />
              <button onClick={() => setFoto(null)}
                className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center rounded-full bg-black/50 text-white">
                <X size={14} />
              </button>
            </div>
          ) : (
            <button onClick={() => fileRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 py-4 mb-4 rounded-xl border-2 border-dashed border-[#E0E0DE] text-[#bbb] hover:border-[#1B4332] hover:text-[#1B4332] transition-colors">
              <Camera size={18} />
              <span className="text-[13px] font-medium">Adicionar foto</span>
            </button>
          )}

          {/* Legenda */}
          <textarea value={mensagem} onChange={e => setMsg(e.target.value)}
            placeholder="Conta uma conquista de hoje…"
            rows={3}
            className="w-full px-3 py-2.5 border border-[#E8E8E8] rounded-xl text-[13px] text-[#333] placeholder-[#ccc] resize-none focus:outline-none focus:border-[#1B4332] mb-4"
          />

          {/* Privacidade */}
          <div className="flex gap-2 mb-4">
            <button onClick={() => setPriv("PUBLICO")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border-2 text-[12px] font-medium transition-all ${
                privacidade === "PUBLICO" ? "border-[#1B4332] text-[#1B4332] bg-[#E0F2E9]" : "border-[#E8E8E8] text-[#999]"
              }`}>
              <Globe size={13} />Visível para todos
            </button>
            <button onClick={() => setPriv("APENAS_NUTRI")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border-2 text-[12px] font-medium transition-all ${
                privacidade === "APENAS_NUTRI" ? "border-[#1B4332] text-[#1B4332] bg-[#E0F2E9]" : "border-[#E8E8E8] text-[#999]"
              }`}>
              <Lock size={13} />Só minha nutri
            </button>
          </div>

          {error && <p className="text-red-500 text-[12px] mb-3">{error}</p>}

          <button onClick={handleSubmit} disabled={saving}
            className="w-full py-3 text-white text-[14px] font-bold rounded-xl disabled:opacity-50"
            style={{ background: "#1B4332" }}>
            {saving ? "Publicando…" : "Publicar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

const LIKES_KEY = "feed_pac_likes_v1";
function getLikes(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(LIKES_KEY) || "[]")); }
  catch { return new Set(); }
}
function saveLikes(s: Set<string>) { localStorage.setItem(LIKES_KEY, JSON.stringify([...s])); }

export default function FeedPaciente() {
  const { paciente, token } = usePacienteAuth();
  const [posts, setPosts]   = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [likes, setLikes]   = useState<Set<string>>(getLikes);

  const authHeader = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    api.get<FeedPost[]>("/paciente-app/feed", { headers: authHeader })
      .then(r => setPosts(r.data))
      .finally(() => setLoading(false));
  }, []);

  function handleLike(id: string) {
    api.post(`/paciente-app/feed/${id}/curtir`, {}, { headers: authHeader });
    const newLikes = new Set(likes);
    if (newLikes.has(id)) {
      newLikes.delete(id);
      setPosts(p => p.map(post => post.id === id ? { ...post, curtidas: Math.max(0, post.curtidas - 1) } : post));
    } else {
      newLikes.add(id);
      setPosts(p => p.map(post => post.id === id ? { ...post, curtidas: post.curtidas + 1 } : post));
    }
    setLikes(newLikes); saveLikes(newLikes);
  }

  return (
    <>
      {showModal && token && (
        <ModalNovoPost token={token} onClose={() => setShowModal(false)} onCreate={p => setPosts(prev => [p, ...prev])} />
      )}

      <div className="px-5 pt-10 pb-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-[24px] font-bold text-[#111]">Feed</h1>
            <p className="text-[13px] text-[#999]">Conquistas do consultório</p>
          </div>
          <button onClick={() => setShowModal(true)}
            className="w-10 h-10 rounded-full flex items-center justify-center text-white shadow-sm"
            style={{ background: "#1B4332" }}>
            <Plus size={18} />
          </button>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="bg-white rounded-2xl animate-pulse h-64" />)}
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-[#bbb] text-[14px] mb-4">Nenhuma publicação ainda.</p>
            <button onClick={() => setShowModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-[13px] font-semibold mx-auto"
              style={{ background: "#1B4332" }}>
              <Plus size={14} />Publicar
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {posts.map(post => (
              <PostCard key={post.id} post={post} liked={likes.has(post.id)} onLike={handleLike} euMesmoNome={paciente?.nome} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
