import { useEffect, useState, useCallback, useRef } from "react";
import { Rss, Heart, Trash2, Plus, X, Lock, Camera, UtensilsCrossed, Dumbbell, Sparkles, ChevronDown, Globe } from "lucide-react";
import api from "../lib/api";
import { Toast, useToast } from "../components/Toast";
import { ComentariosSection } from "../components/ComentariosSection";
import Avatar from "../components/Avatar";

// ─── Types ────────────────────────────────────────────────────────────────────

type Categoria = "REFEICAO" | "TREINO" | "MOMENTO";
type Privacidade = "PUBLICO" | "APENAS_NUTRI";

export interface FeedPost {
  id: string;
  tipo: string;
  categoria: Categoria;
  privacidade: Privacidade;
  autorNutri: boolean;
  mensagem: string;
  fotoUrl: string | null;
  autorAvatarUrl?: string | null;
  curtidas: number;
  criadoEm: string;
  paciente: {
    id: string;
    nome: string;
    pacienteUser?: { fotoUrl?: string | null } | null;
  };
  _count?: { comentarios: number };
}

interface Paciente { id: string; nome: string }

interface FeedResponse {
  posts: FeedPost[];
  total: number;
  page: number;
  pages: number;
}

// ─── Config visual ────────────────────────────────────────────────────────────

export const CAT: Record<Categoria, { label: string; icon: React.FC<{ size?: number; className?: string; style?: React.CSSProperties }>; color: string; bg: string }> = {
  REFEICAO: { label: "Refeição", icon: UtensilsCrossed, color: "#166534", bg: "#DCFCE7" },
  TREINO:   { label: "Treino",   icon: Dumbbell,        color: "#C2410C", bg: "#FEF3C7" },
  MOMENTO:  { label: "Momento",  icon: Sparkles,        color: "#7C3AED", bg: "#F3E8FF" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function tempoRelativo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `há ${d} dia${d > 1 ? "s" : ""}`;
  return `há ${Math.floor(d / 30)} mês`;
}

function getInitials(nome: string) {
  return nome.split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase();
}

const LIKES_KEY = "feed_likes_v2";
function getLikes(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(LIKES_KEY) || "[]")); }
  catch { return new Set(); }
}
function saveLikes(s: Set<string>) {
  localStorage.setItem(LIKES_KEY, JSON.stringify([...s]));
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ─── PostCard ─────────────────────────────────────────────────────────────────

export function PostCard({
  post,
  liked,
  onLike,
  onDelete,
  canDelete = true,
}: {
  post: FeedPost;
  liked: boolean;
  onLike: (id: string, delta: 1 | -1) => void;
  onDelete?: (id: string) => void;
  canDelete?: boolean;
}) {
  const cat = CAT[post.categoria] ?? CAT.MOMENTO;
  const Icon = cat.icon;
  const isPrivate = post.privacidade === "APENAS_NUTRI";

  return (
    <div className="bg-white rounded-2xl shadow-[0_1px_4px_rgba(0,0,0,0.06)] overflow-hidden">
      {/* Foto */}
      {post.fotoUrl && (
        <img
          src={post.fotoUrl}
          alt=""
          className="w-full object-cover"
          style={{ maxHeight: 280 }}
          loading="lazy"
        />
      )}

      <div className="p-4 flex flex-col gap-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <Avatar
              src={post.autorAvatarUrl ?? post.paciente.pacienteUser?.fotoUrl}
              nome={post.paciente.nome}
              tamanho={36}
            />
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <p className="text-[14px] font-semibold text-[#111] leading-tight">
                  {post.paciente.nome.split(" ")[0]}
                </p>
                {post.autorNutri && (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide text-white" style={{ background: "#1B4332" }}>
                    Nutricionista
                  </span>
                )}
                {isPrivate && <Lock size={11} className="text-[#bbb]" />}
              </div>
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold mt-0.5"
                style={{ color: cat.color, backgroundColor: cat.bg }}
              >
                <Icon size={10} /> {cat.label}
              </span>
            </div>
          </div>
          {canDelete && onDelete && (
            <button
              onClick={() => onDelete(post.id)}
              className="w-7 h-7 flex items-center justify-center rounded-full text-[#ccc] hover:text-red-400 hover:bg-red-50 transition-colors flex-shrink-0"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>

        {/* Mensagem */}
        {post.mensagem && (
          <p className="text-[14px] text-[#444] leading-relaxed">{post.mensagem}</p>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-1 border-t border-[#F5F5F3]">
          <button
            onClick={() => onLike(post.id, liked ? -1 : 1)}
            className={`flex items-center gap-1.5 text-[12px] font-medium transition-all active:scale-110 ${liked ? "text-red-500" : "text-[#bbb] hover:text-red-400"}`}
          >
            <Heart size={15} fill={liked ? "currentColor" : "none"} />
            {post.curtidas > 0 && <span>{post.curtidas}</span>}
          </button>
          <span className="text-[11px] text-[#ccc]">{tempoRelativo(post.criadoEm)}</span>
        </div>
      </div>

      <ComentariosSection
        postId={post.id}
        initialCount={post._count?.comentarios ?? 0}
        apiBase="/feed"
        privacidade={post.privacidade}
        isOwnerPaciente={false}
      />
    </div>
  );
}

// ─── Modal criar post ─────────────────────────────────────────────────────────

function ModalCriarPost({
  pacientes,
  onClose,
  onCreate,
}: {
  pacientes: Paciente[];
  onClose: () => void;
  onCreate: (post: FeedPost) => void;
}) {
  const [categoria, setCat]     = useState<Categoria>("MOMENTO");
  const [privacidade, setPriv]  = useState<Privacidade>("PUBLICO");
  const [pacienteId, setPId]    = useState("");
  const [mensagem, setMsg]      = useState("");
  const [foto, setFoto]         = useState<{ file: File; preview: string } | null>(null);
  const [saving, setSaving]     = useState(false);
  const [showList, setShowList] = useState(false);
  const fileRef                 = useRef<HTMLInputElement>(null);
  const { toast, show, hide }   = useToast();
  const listaPac = Array.isArray(pacientes) ? pacientes : [];
  const selectedPac = listaPac.find(p => p.id === pacienteId);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const preview = URL.createObjectURL(file);
    setFoto({ file, preview });
  }

  async function handleSubmit() {
    if (!pacienteId) { show("Selecione um paciente.", "error"); return; }
    if (!mensagem.trim() && !foto) { show("Adicione uma legenda ou foto.", "error"); return; }
    setSaving(true);
    try {
      let fotoBase64: string | undefined;
      if (foto) fotoBase64 = await fileToBase64(foto.file);
      const res = await api.post<FeedPost>("/feed", {
        pacienteId, mensagem: mensagem.trim(), categoria, privacidade,
        ...(fotoBase64 ? { fotoBase64 } : {}),
      });
      onCreate(res.data);
      onClose();
    } catch {
      show("Erro ao publicar.", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm">
      {toast && <Toast message={toast.message} type={toast.type} onClose={hide} />}
      <div className="bg-white w-full md:max-w-md md:rounded-2xl rounded-t-3xl shadow-2xl max-h-[92vh] overflow-y-auto">
        {/* Handle bar mobile */}
        <div className="w-10 h-1 bg-[#E0E0DE] rounded-full mx-auto mt-3 md:hidden" />
        <div className="p-5">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-[17px] font-bold text-[#111]">Nova publicação</h2>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-[#F5F5F3] text-[#666]">
              <X size={16} />
            </button>
          </div>

          {/* Paciente */}
          <p className="text-[11px] font-semibold text-[#bbb] uppercase tracking-wide mb-2">Paciente</p>
          <div className="relative mb-4">
            <button
              onClick={() => setShowList(s => !s)}
              className="w-full flex items-center justify-between px-3 py-2.5 border border-[#E8E8E8] rounded-xl text-[14px] text-left"
            >
              <span className={selectedPac ? "text-[#111]" : "text-[#bbb]"}>
                {selectedPac?.nome ?? "Selecionar paciente…"}
              </span>
              <ChevronDown size={14} className="text-[#bbb]" />
            </button>
            {showList && (
              <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-[#E8E8E8] rounded-xl shadow-lg z-10 max-h-40 overflow-y-auto">
                {listaPac.map(p => (
                  <button key={p.id} onClick={() => { setPId(p.id); setShowList(false); }}
                    className="w-full text-left px-3 py-2.5 text-[13px] text-[#333] hover:bg-[#F8F8F6] first:rounded-t-xl last:rounded-b-xl"
                  >{p.nome}</button>
                ))}
              </div>
            )}
          </div>

          {/* Categoria */}
          <p className="text-[11px] font-semibold text-[#bbb] uppercase tracking-wide mb-2">Categoria</p>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {(Object.keys(CAT) as Categoria[]).map(k => {
              const c = CAT[k];
              const Icon = c.icon;
              const active = categoria === k;
              return (
                <button key={k} onClick={() => setCat(k)}
                  className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 transition-all ${active ? "border-transparent" : "border-[#F0F0EE] bg-white"}`}
                  style={active ? { backgroundColor: c.bg, borderColor: c.color + "50" } : {}}
                >
                  <Icon size={20} style={{ color: active ? c.color : "#bbb" }} />
                  <span className="text-[11px] font-semibold" style={{ color: active ? c.color : "#bbb" }}>{c.label}</span>
                </button>
              );
            })}
          </div>

          {/* Foto */}
          <p className="text-[11px] font-semibold text-[#bbb] uppercase tracking-wide mb-2">Foto</p>
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
              className="w-full flex items-center justify-center gap-2 py-4 mb-4 rounded-xl border-2 border-dashed border-[#E8E8E8] text-[#bbb] hover:border-[#1B4332] hover:text-[#1B4332] transition-colors">
              <Camera size={18} />
              <span className="text-[13px] font-medium">Adicionar foto</span>
            </button>
          )}

          {/* Legenda */}
          <p className="text-[11px] font-semibold text-[#bbb] uppercase tracking-wide mb-2">Legenda</p>
          <textarea value={mensagem} onChange={e => setMsg(e.target.value)}
            placeholder="Escreva uma conquista ou observação…"
            rows={3}
            className="w-full px-3 py-2.5 border border-[#E8E8E8] rounded-xl text-[13px] text-[#333] placeholder-[#ccc] resize-none focus:outline-none focus:border-[#1B4332] mb-4"
          />

          {/* Privacidade */}
          <div className="flex gap-2 mb-5">
            {([["PUBLICO", "Visível para todos", Globe], ["APENAS_NUTRI", "Só nutricionista", Lock]] as const).map(([v, label, Icon]) => (
              <button key={v} onClick={() => setPriv(v)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border-2 text-[12px] font-medium transition-all ${privacidade === v ? "text-[#1B4332] border-[#1B4332] bg-[#E0F2E9]" : "border-[#E8E8E8] text-[#999]"}`}>
                <Icon size={13} />{label}
              </button>
            ))}
          </div>

          <button onClick={handleSubmit} disabled={saving}
            className="w-full py-3 text-white text-[14px] font-bold rounded-xl disabled:opacity-50 transition-colors"
            style={{ background: "#1B4332" }}>
            {saving ? "Publicando…" : "Publicar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Filtro bar ───────────────────────────────────────────────────────────────

function FiltroBar({ filtro, setFiltro, counts }: {
  filtro: Categoria | "TODOS";
  setFiltro: (f: Categoria | "TODOS") => void;
  counts: Record<string, number>;
}) {
  const items: { key: Categoria | "TODOS"; label: string }[] = [
    { key: "TODOS",    label: "Todos" },
    { key: "REFEICAO", label: "Refeição" },
    { key: "TREINO",   label: "Treino" },
    { key: "MOMENTO",  label: "Momento" },
  ];

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
      {items.map(({ key, label }) => {
        const active = filtro === key;
        const cat = key !== "TODOS" ? CAT[key] : null;
        const Icon = cat?.icon;
        return (
          <button key={key} onClick={() => setFiltro(key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium whitespace-nowrap transition-all flex-shrink-0 ${active ? "text-white shadow-sm" : "bg-white text-[#666] border border-[#E8E8E8]"}`}
            style={active ? { background: cat ? cat.color : "#1B4332" } : {}}
          >
            {Icon && <Icon size={11} />}{label}
          </button>
        );
      })}
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyFeed({ onNew }: { onNew: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center px-6">
      <Rss className="text-[#E0E0DE] mb-3" size={40} />
      <p className="text-[15px] font-medium text-[#999] mb-1">Nenhuma publicação ainda</p>
      <p className="text-[12px] text-[#ccc] mb-6">Celebre as conquistas dos seus pacientes aqui.</p>
      <button onClick={onNew}
        className="flex items-center gap-2 px-5 py-2.5 text-white text-[13px] font-semibold rounded-xl"
        style={{ background: "#1B4332" }}>
        <Plus size={14} /> Criar publicação
      </button>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function Feed() {
  const [posts, setPosts]         = useState<FeedPost[]>([]);
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [loading, setLoading]     = useState(true);
  const [page, setPage]           = useState(1);
  const [pages, setPages]         = useState(1);
  const [likes, setLikes]         = useState<Set<string>>(getLikes);
  const [modal, setModal]         = useState(false);
  const [filtro, setFiltro]       = useState<Categoria | "TODOS">("TODOS");
  const { toast, show, hide }     = useToast();

  const fetchPosts = useCallback(async (p = 1, cat?: string) => {
    setLoading(true);
    try {
      const q = cat && cat !== "TODOS" ? `&categoria=${cat}` : "";
      const res = await api.get<FeedResponse>(`/feed?page=${p}&limit=20${q}`);
      setPosts(prev => p === 1 ? res.data.posts : [...prev, ...res.data.posts]);
      setPages(res.data.pages);
      setPage(p);
    } catch {
      show("Erro ao carregar feed.", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts(1, filtro);
    api.get<{ data: Paciente[] }>("/pacientes?limit=100&status=ativo")
      .then(r => setPacientes(Array.isArray(r.data.data) ? r.data.data : []))
      .catch(() => {});
  }, [fetchPosts, filtro]);

  async function handleLike(id: string, delta: 1 | -1) {
    try {
      const res = await api.post<{ id: string; curtidas: number }>(`/feed/${id}/curtir`, { delta });
      const newLikes = new Set(likes);
      delta === 1 ? newLikes.add(id) : newLikes.delete(id);
      setLikes(newLikes); saveLikes(newLikes);
      setPosts(prev => prev.map(p => p.id === id ? { ...p, curtidas: res.data.curtidas } : p));
    } catch { /* ignore */ }
  }

  async function handleDelete(id: string) {
    try {
      await api.delete(`/feed/${id}`);
      setPosts(prev => prev.filter(p => p.id !== id));
      show("Post removido.");
    } catch { show("Erro ao remover.", "error"); }
  }

  function handleCreated(post: FeedPost) {
    setPosts(prev => [post, ...prev]);
    show("Publicado!");
  }

  const postsVisiveis = posts;

  return (
    <>
      {toast && <Toast message={toast.message} type={toast.type} onClose={hide} />}
      {modal && (
        <ModalCriarPost
          pacientes={pacientes}
          onClose={() => setModal(false)}
          onCreate={handleCreated}
        />
      )}

      {/* ── MOBILE ── */}
      <div className="md:hidden min-h-screen bg-[#F8F8F6] pb-6">
        <div className="px-5 pt-10 pb-4 flex items-center justify-between">
          <h1 className="text-[26px] font-bold text-[#111] tracking-tight">Feed</h1>
          <button onClick={() => setModal(true)}
            className="w-9 h-9 flex items-center justify-center rounded-full text-white shadow-sm"
            style={{ background: "#1B4332" }}>
            <Plus size={16} />
          </button>
        </div>
        <div className="px-5 mb-5">
          <FiltroBar filtro={filtro} setFiltro={setFiltro} counts={{}} />
        </div>
        <div className="px-5 space-y-3">
          {loading && posts.length === 0 ? (
            [1, 2, 3].map(i => <div key={i} className="h-64 bg-white rounded-2xl animate-pulse" />)
          ) : posts.length === 0 ? (
            <EmptyFeed onNew={() => setModal(true)} />
          ) : (
            <>
              {postsVisiveis.map(p => (
                <PostCard key={p.id} post={p} liked={likes.has(p.id)} onLike={handleLike} onDelete={handleDelete} />
              ))}
              {page < pages && (
                <button onClick={() => fetchPosts(page + 1, filtro)} disabled={loading}
                  className="w-full py-3 text-[13px] text-[#999] font-medium disabled:opacity-50">
                  {loading ? "Carregando…" : "Carregar mais"}
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── DESKTOP ── */}
      <div className="hidden md:block bg-[#F8F8F6] min-h-screen p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-[22px] font-bold text-[#111] tracking-tight">Feed</h1>
            <p className="text-[13px] text-[#999] mt-0.5">{posts.length} publicação{posts.length !== 1 ? "ões" : ""}</p>
          </div>
          <button onClick={() => setModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 text-white text-[13px] font-medium rounded-xl transition-colors"
            style={{ background: "#1B4332" }}>
            <Plus size={14} /> Nova publicação
          </button>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Feed */}
          <div className="col-span-2">
            <div className="mb-5">
              <FiltroBar filtro={filtro} setFiltro={setFiltro} counts={{}} />
            </div>
            {loading && posts.length === 0 ? (
              <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-72 bg-white rounded-2xl animate-pulse" />)}</div>
            ) : posts.length === 0 ? (
              <EmptyFeed onNew={() => setModal(true)} />
            ) : (
              <div className="space-y-4">
                {postsVisiveis.map(p => (
                  <PostCard key={p.id} post={p} liked={likes.has(p.id)} onLike={handleLike} onDelete={handleDelete} />
                ))}
                {page < pages && (
                  <button onClick={() => fetchPosts(page + 1, filtro)} disabled={loading}
                    className="w-full py-3 text-[13px] text-[#999] font-medium disabled:opacity-50">
                    {loading ? "Carregando…" : "Carregar mais"}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <StatsCard posts={posts} />
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Stats ────────────────────────────────────────────────────────────────────

function StatsCard({ posts }: { posts: FeedPost[] }) {
  const counts = posts.reduce((acc, p) => {
    const k = p.categoria ?? "MOMENTO";
    return { ...acc, [k]: (acc[k] ?? 0) + 1 };
  }, {} as Record<string, number>);
  const totalLikes = posts.reduce((a, p) => a + p.curtidas, 0);
  const comFoto    = posts.filter(p => p.fotoUrl).length;

  return (
    <div className="bg-white rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-5">
      <p className="text-[13px] font-semibold text-[#111] mb-4">Resumo</p>
      <div className="space-y-3">
        {(Object.keys(CAT) as Categoria[]).map(k => {
          const c = CAT[k];
          const Icon = c.icon;
          return (
            <div key={k} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon size={14} style={{ color: c.color }} />
                <span className="text-[12px] text-[#666]">{c.label}</span>
              </div>
              <span className="text-[12px] font-bold tabular-nums px-2 py-0.5 rounded-full"
                style={{ color: c.color, backgroundColor: c.bg }}>
                {counts[k] ?? 0}
              </span>
            </div>
          );
        })}
        <div className="pt-2 border-t border-[#F5F5F3] space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Heart size={13} className="text-red-400" />
              <span className="text-[12px] text-[#666]">Total de curtidas</span>
            </div>
            <span className="text-[12px] font-bold text-[#333] tabular-nums">{totalLikes}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Camera size={13} className="text-[#bbb]" />
              <span className="text-[12px] text-[#666]">Com foto</span>
            </div>
            <span className="text-[12px] font-bold text-[#333] tabular-nums">{comFoto}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
