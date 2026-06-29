import { useEffect, useState } from "react";
import { Heart, Lock, Globe, Plus, X } from "lucide-react";
import api from "../../lib/api";
import { usePacienteAuth } from "../../contexts/PacienteAuthContext";

interface Post {
  id: string; tipo: string; mensagem: string; curtidas: number;
  privado: boolean; criadoEm: string;
  paciente: { nome: string };
}

export default function FeedPaciente() {
  const { paciente, token } = usePacienteAuth();
  const [posts, setPosts]   = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [privado, setPrivado]   = useState(false);
  const [sending, setSending]   = useState(false);

  const authHeader = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    api.get<Post[]>("/paciente-app/feed", { headers: authHeader })
      .then((r) => setPosts(r.data))
      .finally(() => setLoading(false));
  }, []);

  async function handlePost() {
    if (!mensagem.trim()) return;
    setSending(true);
    try {
      const res = await api.post<Post>("/paciente-app/feed", { mensagem, privado }, { headers: authHeader });
      setPosts((p) => [res.data, ...p]);
      setMensagem(""); setShowForm(false);
    } finally { setSending(false); }
  }

  async function curtir(id: string) {
    await api.post(`/paciente-app/feed/${id}/curtir`, {}, { headers: authHeader });
    setPosts((p) => p.map((post) => post.id === id ? { ...post, curtidas: post.curtidas + 1 } : post));
  }

  const primeiroNome = paciente?.nome.split(" ")[0] ?? "";

  return (
    <div className="px-5 pt-10 pb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[24px] font-bold text-[#111]">Feed</h1>
          <p className="text-[13px] text-[#999]">Conquistas do consultório</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="w-10 h-10 rounded-full flex items-center justify-center text-white"
          style={{ background: "#1B4332" }}
        >
          {showForm ? <X size={18} /> : <Plus size={18} />}
        </button>
      </div>

      {/* Post form */}
      {showForm && (
        <div className="bg-white rounded-2xl p-4 mb-5 border border-[#E0F2E9] shadow-sm">
          <p className="text-[13px] font-semibold text-[#111] mb-3">Compartilhar conquista</p>
          <textarea
            value={mensagem}
            onChange={(e) => setMensagem(e.target.value)}
            placeholder="Conte uma conquista de hoje..."
            rows={3}
            className="w-full text-[14px] text-[#333] placeholder-[#bbb] border-0 resize-none focus:outline-none"
          />
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#F0F0EE]">
            <button
              onClick={() => setPrivado(!privado)}
              className={`flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-full transition-all ${
                privado ? "text-[#1B4332] bg-[#E0F2E9]" : "text-[#999] bg-[#F5F5F3]"
              }`}
            >
              {privado ? <Lock size={13} /> : <Globe size={13} />}
              {privado ? "Só para minha nutri" : "Público no consultório"}
            </button>
            <button
              onClick={handlePost} disabled={sending || !mensagem.trim()}
              className="text-white text-[13px] font-semibold px-4 py-1.5 rounded-full disabled:opacity-50"
              style={{ background: "#1B4332" }}
            >
              {sending ? "Enviando..." : "Publicar"}
            </button>
          </div>
        </div>
      )}

      {/* Posts */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl p-4 animate-pulse">
              <div className="h-3 w-24 bg-[#F0F0EE] rounded mb-3" />
              <div className="h-4 w-full bg-[#F0F0EE] rounded mb-2" />
              <div className="h-4 w-3/4 bg-[#F0F0EE] rounded" />
            </div>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-[#bbb] text-[14px]">Nenhuma conquista ainda.</p>
          <p className="text-[#ccc] text-[12px] mt-1">Seja o primeiro a compartilhar!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => {
            const euMesmo = post.paciente.nome === paciente?.nome;
            return (
              <div key={post.id} className="bg-white rounded-2xl p-4 border border-[#F0F0EE]">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-bold" style={{ background: euMesmo ? "#1B4332" : "#2D6A4F" }}>
                      {post.paciente.nome.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-[13px] font-semibold text-[#111]">
                        {euMesmo ? `${primeiroNome} (você)` : post.paciente.nome.split(" ")[0]}
                      </p>
                      <p className="text-[11px] text-[#bbb]">
                        {new Date(post.criadoEm).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                      </p>
                    </div>
                  </div>
                  {post.privado && <Lock size={13} className="text-[#bbb]" />}
                </div>
                <p className="text-[14px] text-[#333] leading-relaxed mb-3">{post.mensagem}</p>
                <button
                  onClick={() => curtir(post.id)}
                  className="flex items-center gap-1.5 text-[12px] text-[#999] hover:text-red-400 transition-colors"
                >
                  <Heart size={15} />
                  {post.curtidas > 0 && <span>{post.curtidas}</span>}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
