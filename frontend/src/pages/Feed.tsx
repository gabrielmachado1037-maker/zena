import { useEffect, useState, useCallback } from "react";
import { Rss, Heart, Trash2, Plus, X, ChevronDown } from "lucide-react";
import api from "../lib/api";
import { Toast, useToast } from "../components/Toast";

// ─── Types ────────────────────────────────────────────────────────────────────

type TipoPost = "META_BATIDA" | "PESO_ALCANCADO" | "CONQUISTA";

interface FeedPost {
  id: string;
  tipo: TipoPost;
  mensagem: string;
  curtidas: number;
  criadoEm: string;
  paciente: { id: string; nome: string };
}

interface Paciente {
  id: string;
  nome: string;
}

interface FeedResponse {
  posts: FeedPost[];
  total: number;
  page: number;
  pages: number;
}

// ─── Config visual por tipo ───────────────────────────────────────────────────

const TIPO: Record<TipoPost, { label: string; emoji: string; color: string; bg: string }> = {
  META_BATIDA:    { label: "Meta Batida",    emoji: "🎯", color: "#1C4A2E", bg: "#F0F7F2" },
  PESO_ALCANCADO: { label: "Peso Alcançado", emoji: "⚖️", color: "#2563EB", bg: "#EFF6FF" },
  CONQUISTA:      { label: "Conquista",      emoji: "🏆", color: "#B45309", bg: "#FFFBEB" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function tempoRelativo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min  = Math.floor(diff / 60000);
  if (min < 1)  return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24)   return `há ${h}h`;
  const d = Math.floor(h / 24);
  if (d < 30)   return `há ${d} dia${d > 1 ? "s" : ""}`;
  const m = Math.floor(d / 30);
  return `há ${m} mês${m > 1 ? "es" : ""}`;
}

function getInitials(nome: string) {
  return nome.split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase();
}

const LIKES_KEY = "feed_likes_v1";
function getLikes(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(LIKES_KEY) || "[]")); }
  catch { return new Set(); }
}
function saveLikes(s: Set<string>) {
  localStorage.setItem(LIKES_KEY, JSON.stringify([...s]));
}

// ─── Card ─────────────────────────────────────────────────────────────────────

function PostCard({
  post,
  liked,
  onLike,
  onDelete,
}: {
  post: FeedPost;
  liked: boolean;
  onLike: (id: string, delta: 1 | -1) => void;
  onDelete: (id: string) => void;
}) {
  const t = TIPO[post.tipo] ?? TIPO.CONQUISTA;

  return (
    <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-4 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-white text-[13px] font-bold flex-shrink-0"
            style={{ backgroundColor: t.color }}
          >
            {getInitials(post.paciente.nome)}
          </div>
          <div>
            <p className="text-[14px] font-semibold text-[#111] leading-tight">
              {post.paciente.nome.split(" ")[0]}
            </p>
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold mt-0.5"
              style={{ color: t.color, backgroundColor: t.bg }}
            >
              {t.emoji} {t.label}
            </span>
          </div>
        </div>
        <button
          onClick={() => onDelete(post.id)}
          className="w-7 h-7 flex items-center justify-center rounded-full text-[#ccc] hover:text-red-400 hover:bg-red-50 transition-colors flex-shrink-0"
        >
          <Trash2 size={13} />
        </button>
      </div>

      {/* Mensagem */}
      <p className="text-[14px] text-[#444] leading-relaxed">{post.mensagem}</p>

      {/* Footer */}
      <div className="flex items-center justify-between pt-1 border-t border-[#F5F5F3]">
        <button
          onClick={() => onLike(post.id, liked ? -1 : 1)}
          className={`flex items-center gap-1.5 text-[12px] font-medium transition-colors ${
            liked ? "text-red-500" : "text-[#bbb] hover:text-red-400"
          }`}
        >
          <Heart size={14} fill={liked ? "currentColor" : "none"} />
          {post.curtidas > 0 && <span>{post.curtidas}</span>}
        </button>
        <span className="text-[11px] text-[#ccc]">{tempoRelativo(post.criadoEm)}</span>
      </div>
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
  const [tipo, setTipo]       = useState<TipoPost>("CONQUISTA");
  const [pacienteId, setPId]  = useState("");
  const [mensagem, setMsg]    = useState("");
  const [saving, setSaving]   = useState(false);
  const [showList, setShowList] = useState(false);
  const { toast, show, hide }  = useToast();

  const listaPacientes = Array.isArray(pacientes) ? pacientes : [];
  const selectedPac = listaPacientes.find(p => p.id === pacienteId);

  async function handleSubmit() {
    if (!pacienteId) { show("Selecione um paciente.", "error"); return; }
    if (!mensagem.trim()) { show("Escreva uma mensagem.", "error"); return; }
    setSaving(true);
    try {
      const res = await api.post<FeedPost>("/feed", { tipo, pacienteId, mensagem: mensagem.trim() });
      onCreate(res.data);
      onClose();
    } catch {
      show("Erro ao publicar.", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40">
      {toast && <Toast message={toast.message} type={toast.type} onClose={hide} />}
      <div className="bg-white w-full md:max-w-md md:rounded-2xl rounded-t-2xl p-5 shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[17px] font-semibold text-[#111]">Nova conquista</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-[#F5F5F3] text-[#666]">
            <X size={16} />
          </button>
        </div>

        {/* Tipo */}
        <p className="text-[11px] font-semibold text-[#bbb] uppercase tracking-wide mb-2">Tipo</p>
        <div className="flex gap-2 mb-4">
          {(Object.keys(TIPO) as TipoPost[]).map(k => {
            const t = TIPO[k];
            const active = tipo === k;
            return (
              <button
                key={k}
                onClick={() => setTipo(k)}
                className={`flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl border text-center transition-all ${
                  active ? "border-transparent" : "border-[#F0F0EE] bg-white text-[#999]"
                }`}
                style={active ? { backgroundColor: t.bg, borderColor: t.color + "40", color: t.color } : {}}
              >
                <span className="text-[18px]">{t.emoji}</span>
                <span className="text-[10px] font-semibold leading-tight">{t.label}</span>
              </button>
            );
          })}
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
              {listaPacientes.map(p => (
                <button
                  key={p.id}
                  onClick={() => { setPId(p.id); setShowList(false); }}
                  className="w-full text-left px-3 py-2.5 text-[13px] text-[#333] hover:bg-[#F8F8F6] first:rounded-t-xl last:rounded-b-xl"
                >
                  {p.nome}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Mensagem */}
        <p className="text-[11px] font-semibold text-[#bbb] uppercase tracking-wide mb-2">Mensagem</p>
        <textarea
          value={mensagem}
          onChange={e => setMsg(e.target.value)}
          placeholder={`Ex: ${TIPO[tipo].emoji} ${
            tipo === "META_BATIDA"    ? "Bateu a meta de 4 check-ins semanais!" :
            tipo === "PESO_ALCANCADO" ? "Atingiu o peso desejado de 65 kg!" :
            "Completou 30 dias de acompanhamento!"
          }`}
          rows={3}
          className="w-full px-3 py-2.5 border border-[#E8E8E8] rounded-xl text-[13px] text-[#333] placeholder-[#ccc] resize-none focus:outline-none focus:border-[#1C4A2E] mb-5"
        />

        <button
          onClick={handleSubmit}
          disabled={saving}
          className="w-full py-3 bg-[#1C4A2E] text-white text-[14px] font-semibold rounded-xl hover:bg-[#2D6A4F] disabled:opacity-50 transition-colors"
        >
          {saving ? "Publicando…" : "Publicar conquista"}
        </button>
      </div>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function Feed() {
  const [posts, setPosts]       = useState<FeedPost[]>([]);
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [loading, setLoading]   = useState(true);
  const [page, setPage]         = useState(1);
  const [pages, setPages]       = useState(1);
  const [likes, setLikes]       = useState<Set<string>>(getLikes);
  const [modal, setModal]       = useState(false);
  const [filtro, setFiltro]     = useState<TipoPost | "TODOS">("TODOS");
  const { toast, show, hide }   = useToast();

  const fetchPosts = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const res = await api.get<FeedResponse>(`/feed?page=${p}&limit=20`);
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
    fetchPosts(1);
    api.get<{ data: Paciente[] }>("/pacientes?limit=50&status=ativo")
      .then(r => setPacientes(Array.isArray(r.data.data) ? r.data.data : []))
      .catch(() => {});
  }, [fetchPosts]);

  async function handleLike(id: string, delta: 1 | -1) {
    try {
      const res = await api.post<{ id: string; curtidas: number }>(`/feed/${id}/curtir`, { delta });
      const newLikes = new Set(likes);
      delta === 1 ? newLikes.add(id) : newLikes.delete(id);
      setLikes(newLikes);
      saveLikes(newLikes);
      setPosts(prev => prev.map(p => p.id === id ? { ...p, curtidas: res.data.curtidas } : p));
    } catch { /* silently ignore */ }
  }

  async function handleDelete(id: string) {
    try {
      await api.delete(`/feed/${id}`);
      setPosts(prev => prev.filter(p => p.id !== id));
      show("Post removido.");
    } catch {
      show("Erro ao remover.", "error");
    }
  }

  function handleCreated(post: FeedPost) {
    setPosts(prev => [post, ...prev]);
    show("Conquista publicada!");
  }

  const postsVisiveis = filtro === "TODOS" ? posts : posts.filter(p => p.tipo === filtro);
  const totalFiltrado = posts.filter(p => filtro === "TODOS" || p.tipo === filtro).length;

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
      <div className="md:hidden min-h-screen bg-[#F8F8F6] pb-24">
        <MobileFeed
          posts={postsVisiveis}
          loading={loading}
          likes={likes}
          filtro={filtro}
          setFiltro={setFiltro}
          onLike={handleLike}
          onDelete={handleDelete}
          onNew={() => setModal(true)}
          hasMore={page < pages}
          onMore={() => fetchPosts(page + 1)}
        />
      </div>

      {/* ── DESKTOP ── */}
      <div className="hidden md:block bg-[#F8F8F6] min-h-screen p-8">
        <DesktopFeed
          posts={postsVisiveis}
          loading={loading}
          likes={likes}
          filtro={filtro}
          setFiltro={setFiltro}
          onLike={handleLike}
          onDelete={handleDelete}
          onNew={() => setModal(true)}
          total={totalFiltrado}
          hasMore={page < pages}
          onMore={() => fetchPosts(page + 1)}
          pacientes={pacientes}
          onCreated={handleCreated}
        />
      </div>
    </>
  );
}

// ─── Filtro bar ───────────────────────────────────────────────────────────────

function FiltroBar({
  filtro,
  setFiltro,
  counts,
}: {
  filtro: TipoPost | "TODOS";
  setFiltro: (f: TipoPost | "TODOS") => void;
  counts: Record<string, number>;
}) {
  const items: { key: TipoPost | "TODOS"; label: string; emoji: string }[] = [
    { key: "TODOS",          label: "Todos",   emoji: "✨" },
    { key: "META_BATIDA",    label: "Metas",   emoji: "🎯" },
    { key: "PESO_ALCANCADO", label: "Peso",    emoji: "⚖️" },
    { key: "CONQUISTA",      label: "Prêmios", emoji: "🏆" },
  ];

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
      {items.map(({ key, label, emoji }) => {
        const active = filtro === key;
        const count  = key === "TODOS" ? Object.values(counts).reduce((a, b) => a + b, 0) : counts[key] ?? 0;
        return (
          <button
            key={key}
            onClick={() => setFiltro(key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium whitespace-nowrap transition-all flex-shrink-0 ${
              active
                ? "bg-[#1C4A2E] text-white shadow-sm"
                : "bg-white text-[#666] border border-[#E8E8E8]"
            }`}
          >
            {emoji} {label}
            {count > 0 && (
              <span className={`text-[10px] font-bold ${active ? "text-white/70" : "text-[#bbb]"}`}>
                {count}
              </span>
            )}
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
      <p className="text-[15px] font-medium text-[#999] mb-1">Nenhuma conquista ainda</p>
      <p className="text-[12px] text-[#ccc] mb-6">Celebre as conquistas dos seus pacientes aqui.</p>
      <button
        onClick={onNew}
        className="flex items-center gap-2 px-5 py-2.5 bg-[#1C4A2E] text-white text-[13px] font-semibold rounded-xl"
      >
        <Plus size={14} /> Criar conquista
      </button>
    </div>
  );
}

// ─── Mobile layout ────────────────────────────────────────────────────────────

function MobileFeed({
  posts, loading, likes, filtro, setFiltro,
  onLike, onDelete, onNew, hasMore, onMore,
}: {
  posts: FeedPost[];
  loading: boolean;
  likes: Set<string>;
  filtro: TipoPost | "TODOS";
  setFiltro: (f: TipoPost | "TODOS") => void;
  onLike: (id: string, delta: 1 | -1) => void;
  onDelete: (id: string) => void;
  onNew: () => void;
  hasMore: boolean;
  onMore: () => void;
}) {
  const counts = posts.reduce((acc, p) => ({ ...acc, [p.tipo]: (acc[p.tipo] ?? 0) + 1 }), {} as Record<string, number>);

  return (
    <div>
      <div className="px-5 pt-10 pb-4 flex items-center justify-between">
        <h1 className="text-[26px] font-semibold text-[#111] tracking-tight">Feed</h1>
        <button
          onClick={onNew}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-[#1C4A2E] text-white shadow-sm"
        >
          <Plus size={16} />
        </button>
      </div>

      <div className="px-5 mb-5">
        <FiltroBar filtro={filtro} setFiltro={setFiltro} counts={counts} />
      </div>

      <div className="px-5 space-y-3">
        {loading && posts.length === 0 ? (
          [1,2,3].map(i => (
            <div key={i} className="h-32 bg-white rounded-2xl animate-pulse" />
          ))
        ) : posts.length === 0 ? (
          <EmptyFeed onNew={onNew} />
        ) : (
          <>
            {posts.map(p => (
              <PostCard
                key={p.id}
                post={p}
                liked={likes.has(p.id)}
                onLike={onLike}
                onDelete={onDelete}
              />
            ))}
            {hasMore && (
              <button
                onClick={onMore}
                disabled={loading}
                className="w-full py-3 text-[13px] text-[#999] font-medium hover:text-[#666] disabled:opacity-50"
              >
                {loading ? "Carregando…" : "Carregar mais"}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Desktop layout ───────────────────────────────────────────────────────────

function DesktopFeed({
  posts, loading, likes, filtro, setFiltro,
  onLike, onDelete, onNew, total, hasMore, onMore, pacientes, onCreated,
}: {
  posts: FeedPost[];
  loading: boolean;
  likes: Set<string>;
  filtro: TipoPost | "TODOS";
  setFiltro: (f: TipoPost | "TODOS") => void;
  onLike: (id: string, delta: 1 | -1) => void;
  onDelete: (id: string) => void;
  onNew: () => void;
  total: number;
  hasMore: boolean;
  onMore: () => void;
  pacientes: Paciente[];
  onCreated: (post: FeedPost) => void;
}) {
  const counts = posts.reduce((acc, p) => ({ ...acc, [p.tipo]: (acc[p.tipo] ?? 0) + 1 }), {} as Record<string, number>);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-[22px] font-semibold text-[#111] tracking-tight">Feed de conquistas</h1>
          <p className="text-[13px] text-[#999] mt-0.5">{total} publicação{total !== 1 ? "ões" : ""}</p>
        </div>
        <button
          onClick={onNew}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#1C4A2E] text-white text-[13px] font-medium rounded-xl hover:bg-[#2D6A4F] transition-colors"
        >
          <Plus size={14} /> Nova conquista
        </button>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Feed (2/3) */}
        <div className="col-span-2">
          <div className="mb-5">
            <FiltroBar filtro={filtro} setFiltro={setFiltro} counts={counts} />
          </div>

          {loading && posts.length === 0 ? (
            <div className="space-y-4">
              {[1,2,3].map(i => <div key={i} className="h-36 bg-white rounded-2xl animate-pulse" />)}
            </div>
          ) : posts.length === 0 ? (
            <EmptyFeed onNew={onNew} />
          ) : (
            <div className="space-y-4">
              {posts.map(p => (
                <PostCard
                  key={p.id}
                  post={p}
                  liked={likes.has(p.id)}
                  onLike={onLike}
                  onDelete={onDelete}
                />
              ))}
              {hasMore && (
                <button
                  onClick={onMore}
                  disabled={loading}
                  className="w-full py-3 text-[13px] text-[#999] font-medium hover:text-[#666] disabled:opacity-50"
                >
                  {loading ? "Carregando…" : "Carregar mais"}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Painel lateral (1/3) */}
        <div className="space-y-4">
          <QuickPost pacientes={pacientes} onCreated={onCreated} />
          <StatsCard posts={posts} />
        </div>
      </div>
    </div>
  );
}

// ─── Quick post (desktop sidebar) ────────────────────────────────────────────

function QuickPost({
  pacientes,
  onCreated,
}: {
  pacientes: Paciente[];
  onCreated: (post: FeedPost) => void;
}) {
  const [tipo, setTipo]      = useState<TipoPost>("CONQUISTA");
  const [pacienteId, setPId] = useState("");
  const [mensagem, setMsg]   = useState("");
  const [saving, setSaving]  = useState(false);
  const [showList, setShowList] = useState(false);
  const { toast, show, hide } = useToast();

  const listaPac = Array.isArray(pacientes) ? pacientes : [];
  const selectedPac = listaPac.find(p => p.id === pacienteId);

  async function handleSubmit() {
    if (!pacienteId) { show("Selecione um paciente.", "error"); return; }
    if (!mensagem.trim()) { show("Escreva uma mensagem.", "error"); return; }
    setSaving(true);
    try {
      const res = await api.post<FeedPost>("/feed", { tipo, pacienteId, mensagem: mensagem.trim() });
      onCreated(res.data);
      setPId(""); setMsg(""); setTipo("CONQUISTA");
      show("Publicado!");
    } catch {
      show("Erro ao publicar.", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-5">
      {toast && <Toast message={toast.message} type={toast.type} onClose={hide} />}
      <p className="text-[14px] font-semibold text-[#111] mb-4">Publicar conquista</p>

      {/* Tipo */}
      <div className="flex gap-1.5 mb-4">
        {(Object.keys(TIPO) as TipoPost[]).map(k => {
          const t = TIPO[k];
          const active = tipo === k;
          return (
            <button
              key={k}
              onClick={() => setTipo(k)}
              title={t.label}
              className={`flex-1 py-2 rounded-lg text-[15px] transition-all ${
                active ? "shadow-sm" : "bg-[#F8F8F6]"
              }`}
              style={active ? { backgroundColor: t.bg, outline: `2px solid ${t.color}30` } : {}}
            >
              {t.emoji}
            </button>
          );
        })}
      </div>

      {/* Paciente */}
      <div className="relative mb-3">
        <button
          onClick={() => setShowList(s => !s)}
          className="w-full flex items-center justify-between px-3 py-2 border border-[#E8E8E8] rounded-lg text-[13px] text-left"
        >
          <span className={selectedPac ? "text-[#111]" : "text-[#ccc]"}>
            {selectedPac?.nome ?? "Paciente…"}
          </span>
          <ChevronDown size={12} className="text-[#ccc]" />
        </button>
        {showList && (
          <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-[#E8E8E8] rounded-xl shadow-lg z-10 max-h-36 overflow-y-auto">
            {listaPac.map(p => (
              <button
                key={p.id}
                onClick={() => { setPId(p.id); setShowList(false); }}
                className="w-full text-left px-3 py-2 text-[12px] text-[#333] hover:bg-[#F8F8F6] first:rounded-t-xl last:rounded-b-xl"
              >
                {p.nome}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Mensagem */}
      <textarea
        value={mensagem}
        onChange={e => setMsg(e.target.value)}
        placeholder="Escreva a conquista…"
        rows={3}
        className="w-full px-3 py-2 border border-[#E8E8E8] rounded-lg text-[12px] text-[#333] placeholder-[#ccc] resize-none focus:outline-none focus:border-[#1C4A2E] mb-3"
      />

      <button
        onClick={handleSubmit}
        disabled={saving}
        className="w-full py-2.5 bg-[#1C4A2E] text-white text-[13px] font-semibold rounded-xl hover:bg-[#2D6A4F] disabled:opacity-50 transition-colors"
      >
        {saving ? "Publicando…" : "Publicar"}
      </button>
    </div>
  );
}

// ─── Stats card ───────────────────────────────────────────────────────────────

function StatsCard({ posts }: { posts: FeedPost[] }) {
  const counts = posts.reduce((acc, p) => ({ ...acc, [p.tipo]: (acc[p.tipo] ?? 0) + 1 }), {} as Record<string, number>);
  const totalLikes = posts.reduce((acc, p) => acc + p.curtidas, 0);

  return (
    <div className="bg-white rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-5">
      <p className="text-[13px] font-semibold text-[#111] mb-4">Resumo</p>
      <div className="space-y-3">
        {(Object.keys(TIPO) as TipoPost[]).map(k => {
          const t = TIPO[k];
          const count = counts[k] ?? 0;
          return (
            <div key={k} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[14px]">{t.emoji}</span>
                <span className="text-[12px] text-[#666]">{t.label}</span>
              </div>
              <span
                className="text-[12px] font-bold tabular-nums px-2 py-0.5 rounded-full"
                style={{ color: t.color, backgroundColor: t.bg }}
              >
                {count}
              </span>
            </div>
          );
        })}
        <div className="pt-2 border-t border-[#F5F5F3] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Heart size={13} className="text-red-400" />
            <span className="text-[12px] text-[#666]">Total de curtidas</span>
          </div>
          <span className="text-[12px] font-bold text-[#333] tabular-nums">{totalLikes}</span>
        </div>
      </div>
    </div>
  );
}
