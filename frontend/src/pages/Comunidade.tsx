import { useState } from "react";
import { Search, Heart, MessageCircle, Megaphone, Trophy, Loader2, Send } from "lucide-react";
import { useFetch } from "../hooks/useFetch";
import { useAuth } from "../contexts/AuthContext";
import api from "../lib/api";
import Avatar from "../components/Avatar";
import {
  autorDoPost, badgeDoPost, tempoRelativo, filtrarBusca, isMural,
} from "../lib/comunidade";
import type { FeedPost, FeedResp, Engajador } from "../lib/comunidade";

/* ───────── primitivos ───────── */
function Card({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return <div className={`rounded-2xl bg-nx-surface border border-white/5 ${className}`}>{children}</div>;
}
function StateBox({ loading, error, empty, onRetry, children, minH = "h-28", emptyText = "Sem dados" }: {
  loading: boolean; error: string | null; empty?: boolean; onRetry?: () => void;
  children: React.ReactNode; minH?: string; emptyText?: string;
}) {
  if (loading) return <div className={`${minH} animate-pulse rounded-xl bg-nx-container/60`} aria-busy="true" />;
  if (error)
    return (
      <div className={`${minH} flex flex-col items-center justify-center gap-2 text-center`}>
        <p className="text-body-sm text-nx-error">{error}</p>
        {onRetry && <button onClick={onRetry} className="text-label-md text-nx-primary hover:underline">Tentar de novo</button>}
      </div>
    );
  if (empty) return <div className={`${minH} flex items-center justify-center text-body-sm text-nx-outline`}>{emptyText}</div>;
  return <>{children}</>;
}

/* ───────── página ───────── */
export default function Comunidade() {
  const { nutricionista } = useAuth();
  const nutriNome = nutricionista?.nome ?? "Nutricionista";

  const [semana, setSemana] = useState(false);
  const [busca, setBusca] = useState("");
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const [delta, setDelta] = useState<Record<string, number>>({});

  const feed = useFetch<FeedResp>(`/feed${semana ? "?semana=1" : ""}`);
  const engaj = useFetch<Engajador[]>("/feed/engajadores");

  const posts = filtrarBusca(feed.data?.posts ?? [], busca);

  async function curtir(p: FeedPost) {
    const jaCurtiu = !!liked[p.id];
    const d = jaCurtiu ? -1 : 1;
    setLiked((s) => ({ ...s, [p.id]: !jaCurtiu }));
    setDelta((s) => ({ ...s, [p.id]: (s[p.id] || 0) + d }));
    try {
      await api.post(`/feed/${p.id}/curtir`, { delta: d });
    } catch {
      setLiked((s) => ({ ...s, [p.id]: jaCurtiu }));
      setDelta((s) => ({ ...s, [p.id]: (s[p.id] || 0) - d }));
    }
  }

  return (
    <div className="flex min-h-screen bg-nx-bg-lowest text-nx-on-surface font-sans">
      <main className="flex-1 min-w-0 px-4 md:px-6 py-6 pb-24 lg:pb-6">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-headline-md text-nx-on-surface">Comunidade Nexvel</h1>
            <p className="text-body-sm text-nx-on-surface-variant mt-0.5">Conquistas e marcos dos seus pacientes</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:flex-none">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-nx-outline" />
              <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar..."
                className="w-full sm:w-56 bg-nx-surface border border-white/5 rounded-xl pl-9 pr-3 py-2.5 text-body-sm text-nx-on-surface placeholder:text-nx-outline focus:outline-none focus:ring-1 focus:ring-nx-primary" />
            </div>
            <button onClick={() => setSemana((v) => !v)}
              className={`shrink-0 rounded-xl px-4 py-2.5 text-body-sm font-medium border transition-colors ${
                semana ? "bg-nx-primary-container text-nx-on-primary-container border-transparent" : "bg-nx-surface border-white/5 text-nx-on-surface-variant hover:text-nx-on-surface"
              }`}>
              Semana
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
          {/* Feed central */}
          <section className="lg:col-span-2 space-y-4">
            <StateBox loading={feed.loading} error={feed.error} onRetry={feed.refetch}
              empty={posts.length === 0}
              emptyText={busca ? "Nenhuma publicação encontrada" : "Sem publicações ainda"} minH="h-56">
              {posts.map((p) => (
                <PostCard key={p.id} p={p} nutriNome={nutriNome}
                  curtidas={p.curtidas + (delta[p.id] || 0)} liked={!!liked[p.id]} onCurtir={() => curtir(p)} />
              ))}
            </StateBox>
          </section>

          {/* Sidebar direita */}
          <div className="space-y-4">
            <MuralNutri onPublicado={feed.refetch} />

            {/* Top Engajadores */}
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <Trophy size={18} className="text-nx-secondary" />
                <h3 className="text-body-md font-semibold">Top Engajadores</h3>
              </div>
              <StateBox loading={engaj.loading} error={engaj.error} onRetry={engaj.refetch}
                empty={(engaj.data?.length ?? 0) === 0} emptyText="Sem dados" minH="h-24">
                <ol className="space-y-3">
                  {engaj.data?.map((e, i) => (
                    <li key={e.pacienteId} className="flex items-center gap-3">
                      <span className={`text-label-md w-4 shrink-0 ${i === 0 ? "text-nx-secondary" : "text-nx-outline"}`}>{i + 1}º</span>
                      <Avatar src={e.foto} nome={e.nome} tamanho={34} />
                      <div className="flex-1 min-w-0">
                        <p className="text-body-sm font-medium truncate">{e.nome}</p>
                        <p className="text-label-sm text-nx-outline">{e.posts} publicações</p>
                      </div>
                      <span className="flex items-center gap-1 text-label-md text-nx-secondary shrink-0">
                        <Heart size={13} className="fill-current" /> {e.curtidas}
                      </span>
                    </li>
                  ))}
                </ol>
              </StateBox>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

/* ───────── card de post ───────── */
function PostCard({ p, nutriNome, curtidas, liked, onCurtir }: {
  p: FeedPost; nutriNome: string; curtidas: number; liked: boolean; onCurtir: () => void;
}) {
  const autor = autorDoPost(p, nutriNome);
  const badge = badgeDoPost(p);
  const mural = isMural(p);
  return (
    <Card className={`p-5 ${mural ? "border-nx-primary-container/30" : ""}`}>
      <div className="flex items-center gap-3 mb-3">
        {mural ? (
          <div className="grid place-items-center size-10 rounded-full bg-nx-primary-container/20 text-nx-primary shrink-0"><Megaphone size={18} /></div>
        ) : (
          <Avatar src={autor.foto} nome={autor.nome} tamanho={40} />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-body-md font-semibold truncate">{autor.nome}</p>
          <p className="text-label-sm text-nx-outline">{tempoRelativo(p.criadoEm)}</p>
        </div>
        <span className="text-label-sm font-semibold rounded-full px-2.5 py-1 shrink-0"
          style={{ color: badge.cor, background: `${badge.cor}1f` }}>
          {badge.label}
        </span>
      </div>

      <p className="text-body-md text-nx-on-surface leading-relaxed">{p.mensagem}</p>

      {p.fotoUrl && (
        <img src={p.fotoUrl} alt="" className="mt-3 rounded-xl w-full max-h-80 object-cover border border-white/5" loading="lazy" />
      )}

      <div className="flex items-center gap-5 mt-4 pt-3 border-t border-white/5">
        <button onClick={onCurtir} className={`flex items-center gap-1.5 text-body-sm transition-colors ${liked ? "text-nx-error" : "text-nx-on-surface-variant hover:text-nx-error"}`}>
          <Heart size={17} className={liked ? "fill-current" : ""} /> {curtidas}
        </button>
        <span className="flex items-center gap-1.5 text-body-sm text-nx-on-surface-variant">
          <MessageCircle size={17} /> {p._count.comentarios}
        </span>
      </div>
    </Card>
  );
}

/* ───────── Mural da Nutri (publica com confirmação) ───────── */
function MuralNutri({ onPublicado }: { onPublicado: () => void }) {
  const [texto, setTexto] = useState("");
  const [confirmando, setConfirmando] = useState(false);
  const [publicando, setPublicando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function publicar() {
    setPublicando(true); setErro(null);
    try {
      await api.post("/feed/mural", { mensagem: texto.trim() });
      setTexto(""); setConfirmando(false);
      onPublicado();
    } catch (e: any) {
      setErro(e?.response?.data?.error ?? "Erro ao publicar");
    } finally {
      setPublicando(false);
    }
  }

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-3">
        <Megaphone size={18} className="text-nx-primary" />
        <h3 className="text-body-md font-semibold">Mural da Nutri</h3>
      </div>
      <textarea value={texto} onChange={(e) => { setTexto(e.target.value); setConfirmando(false); }}
        rows={3} placeholder="Escreva um aviso para a comunidade..."
        className="w-full bg-nx-container border border-nx-primary-container/10 rounded-xl px-3 py-2.5 text-body-sm text-nx-on-surface placeholder:text-nx-outline focus:outline-none focus:ring-1 focus:ring-nx-primary resize-none" />

      {erro && <p className="text-nx-error text-body-sm mt-2">{erro}</p>}

      {!confirmando ? (
        <button onClick={() => setConfirmando(true)} disabled={!texto.trim()}
          className="w-full mt-3 flex items-center justify-center gap-2 rounded-xl bg-nx-primary-container text-nx-on-primary-container py-2.5 text-body-sm font-semibold hover:bg-[#8b46f5] disabled:opacity-50 transition-colors">
          <Send size={15} /> Publicar no Mural
        </button>
      ) : (
        <div className="mt-3">
          <p className="text-body-sm text-nx-on-surface-variant mb-2">Publicar este aviso para toda a comunidade?</p>
          <div className="flex gap-2">
            <button onClick={() => setConfirmando(false)} disabled={publicando}
              className="flex-1 rounded-xl border border-white/10 py-2.5 text-body-sm text-nx-on-surface-variant hover:text-nx-on-surface transition-colors">
              Cancelar
            </button>
            <button onClick={publicar} disabled={publicando}
              className="flex-1 rounded-xl bg-nx-primary-container text-nx-on-primary-container py-2.5 text-body-sm font-bold hover:bg-[#8b46f5] disabled:opacity-60 transition-colors flex items-center justify-center gap-2">
              {publicando ? <Loader2 size={15} className="animate-spin" /> : null} Confirmar
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}
