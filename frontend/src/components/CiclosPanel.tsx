import { useEffect, useState } from "react";
import { Plus, Trophy, ChevronRight, AlertTriangle } from "lucide-react";
import api from "../lib/api";

interface Ciclo {
  id: string;
  numero: number;
  titulo?: string;
  dataInicio: string;
  dataFim: string;
  status: string;
  premioDescricao?: string;
  premioTipo: string;
  _count: { participantes: number };
}

interface Participante {
  id: string;
  pontosCiclo: number;
  posicaoAtual: number;
  paciente: { id: string; nome: string };
}

function ProgressBar({ pct }: { pct: number }) {
  return (
    <div className="h-1.5 bg-black/10 rounded-full overflow-hidden">
      <div className="h-full rounded-full bg-[#7C3AED]" style={{ width: `${pct}%` }} />
    </div>
  );
}

function calcPct(inicio: string, fim: string) {
  const total = new Date(fim).getTime() - new Date(inicio).getTime();
  const passado = Date.now() - new Date(inicio).getTime();
  return Math.min(Math.max(Math.round((passado / total) * 100), 0), 100);
}

function diasRestantes(fim: string) {
  return Math.max(Math.ceil((new Date(fim).getTime() - Date.now()) / 86400000), 0);
}

const MEDAL = ["🥇", "🥈", "🥉"];

export default function CiclosPanel() {
  const [ciclos, setCiclos] = useState<Ciclo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [rankingCicloId, setRankingCicloId] = useState<string | null>(null);
  const [ranking, setRanking] = useState<Participante[]>([]);
  const [encerrando, setEncerrando] = useState<string | null>(null);

  const [titulo, setTitulo] = useState("");
  const [dataInicio, setDataInicio] = useState(() => new Date().toISOString().slice(0, 10));
  const [dataFim, setDataFim] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 29); return d.toISOString().slice(0, 10);
  });
  const [premioTipo, setPremioTipo] = useState("reconhecimento");
  const [premioDescricao, setPremioDescricao] = useState("");
  const [criando, setCriando] = useState(false);

  const carregar = () => {
    setLoading(true);
    api.get("/ciclos").then(r => setCiclos(r.data)).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { carregar(); }, []);

  useEffect(() => {
    if (!rankingCicloId) { setRanking([]); return; }
    api.get(`/ciclos/${rankingCicloId}/ranking`).then(r => setRanking(r.data)).catch(() => {});
  }, [rankingCicloId]);

  const criar = async () => {
    setCriando(true);
    try {
      await api.post("/ciclos", {
        titulo: titulo || undefined,
        dataInicio,
        dataFim,
        premioTipo,
        premioDescricao: premioDescricao || undefined,
      });
      setShowModal(false);
      setTitulo("");
      setPremioDescricao("");
      carregar();
    } catch {
      alert("Erro ao criar ciclo.");
    } finally {
      setCriando(false);
    }
  };

  const encerrar = async (cicloId: string) => {
    if (!confirm("Encerrar este ciclo antecipadamente? Os relatórios serão gerados.")) return;
    setEncerrando(cicloId);
    try {
      await api.put(`/ciclos/${cicloId}/encerrar`);
      carregar();
    } catch {
      alert("Erro ao encerrar ciclo.");
    } finally {
      setEncerrando(null);
    }
  };

  const cicloAtivo = ciclos.find(c => c.status === "ativo" || c.status === "aquecimento");
  const ciclosEncerrados = ciclos.filter(c => c.status === "encerrado");

  if (loading) return <div className="p-6 text-center text-[13px] text-[#888]">Carregando ciclos...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-[16px] font-bold text-[#111]">Ciclos de desafio</h2>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1 px-3 py-2 rounded-xl bg-[#7C3AED] text-white text-[12px] font-semibold">
          <Plus size={14} /> Criar ciclo
        </button>
      </div>

      {cicloAtivo ? (
        <div className="bg-[#F0FDF4] rounded-2xl p-5 border-2 border-[#7C3AED]">
          <div className="flex items-center gap-2 mb-2">
            <Trophy size={15} color="#7C3AED" />
            <span className="text-[14px] font-bold text-[#7C3AED]">
              Ciclo {String(cicloAtivo.numero).padStart(2, "0")}
              {cicloAtivo.titulo ? ` — ${cicloAtivo.titulo}` : ""}
            </span>
            <span className="ml-auto text-[11px] text-white bg-[#7C3AED] px-2 py-0.5 rounded-full">
              {cicloAtivo.status === "aquecimento" ? "🔥 Aquecimento" : "✅ Ativo"}
            </span>
          </div>

          <div className="text-[11px] text-[#666] mb-2">
            {new Date(cicloAtivo.dataInicio).toLocaleDateString("pt-BR")} →{" "}
            {new Date(cicloAtivo.dataFim).toLocaleDateString("pt-BR")} •{" "}
            {diasRestantes(cicloAtivo.dataFim)} dias restantes •{" "}
            {cicloAtivo._count.participantes} participantes
          </div>

          <ProgressBar pct={calcPct(cicloAtivo.dataInicio, cicloAtivo.dataFim)} />

          <div className="mt-4">
            <button
              onClick={() => setRankingCicloId(rankingCicloId === cicloAtivo.id ? null : cicloAtivo.id)}
              className="flex items-center gap-1 text-[12px] font-semibold text-[#7C3AED] mb-2">
              Ver ranking completo <ChevronRight size={13} />
            </button>

            {rankingCicloId === cicloAtivo.id && ranking.length > 0 && (
              <div className="space-y-1.5">
                {ranking.slice(0, 10).map((p, i) => (
                  <div key={p.id} className="flex items-center gap-2 text-[12px]">
                    <span className="w-6 text-center">{MEDAL[i] ?? `${i + 1}.`}</span>
                    <span className="flex-1 text-[#333] truncate">{p.paciente.nome}</span>
                    <span className="font-semibold text-[#555]">{p.pontosCiclo} pts</span>
                  </div>
                ))}
                {ranking.length === 0 && (
                  <p className="text-[12px] text-[#888]">Nenhum participante ainda.</p>
                )}
              </div>
            )}
          </div>

          <button
            onClick={() => encerrar(cicloAtivo.id)}
            disabled={encerrando === cicloAtivo.id}
            className="mt-4 flex items-center gap-1 text-[11px] text-red-500 font-medium">
            <AlertTriangle size={12} />
            {encerrando === cicloAtivo.id ? "Encerrando..." : "Encerrar antecipado"}
          </button>
        </div>
      ) : (
        <div className="bg-[#F9F9F7] rounded-2xl p-5 text-center text-[13px] text-[#888]">
          Nenhum ciclo ativo. Crie um novo ciclo para engajar seus pacientes!
        </div>
      )}

      {ciclosEncerrados.length > 0 && (
        <div>
          <h3 className="text-[13px] font-semibold text-[#888] mb-2">Ciclos anteriores</h3>
          <div className="space-y-2">
            {ciclosEncerrados.slice(0, 5).map(c => (
              <div key={c.id} className="bg-white rounded-xl p-4 border border-[#E5E7EB] flex items-center gap-3">
                <span className="text-[13px] font-semibold text-[#333]">
                  Ciclo {String(c.numero).padStart(2, "0")}
                  {c.titulo ? ` — ${c.titulo}` : ""}
                </span>
                <span className="ml-auto text-[11px] text-[#888]">
                  {c._count.participantes} part. • {new Date(c.dataFim).toLocaleDateString("pt-BR")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl">
            <h2 className="text-[17px] font-bold text-[#111] mb-5">Criar novo ciclo</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-[12px] text-[#666] mb-1">Título (opcional)</label>
                <input
                  value={titulo}
                  onChange={e => setTitulo(e.target.value)}
                  placeholder="ex: Desafio de Julho"
                  className="w-full border border-[#E5E7EB] rounded-xl px-3 py-2.5 text-[13px] outline-none focus:border-[#7C3AED]" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] text-[#666] mb-1">Início</label>
                  <input
                    type="date"
                    value={dataInicio}
                    onChange={e => setDataInicio(e.target.value)}
                    className="w-full border border-[#E5E7EB] rounded-xl px-3 py-2.5 text-[13px] outline-none focus:border-[#7C3AED]" />
                </div>
                <div>
                  <label className="block text-[12px] text-[#666] mb-1">Fim</label>
                  <input
                    type="date"
                    value={dataFim}
                    onChange={e => setDataFim(e.target.value)}
                    className="w-full border border-[#E5E7EB] rounded-xl px-3 py-2.5 text-[13px] outline-none focus:border-[#7C3AED]" />
                </div>
              </div>

              <div>
                <label className="block text-[12px] text-[#666] mb-2">Tipo de prêmio</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { v: "reconhecimento", l: "🏅 Reconhecimento" },
                    { v: "consulta",       l: "📅 Consulta grátis" },
                    { v: "ebook",          l: "📖 Ebook" },
                    { v: "custom",         l: "✨ Personalizado" },
                  ].map(({ v, l }) => (
                    <button
                      key={v}
                      onClick={() => setPremioTipo(v)}
                      className={`py-2 rounded-xl text-[12px] font-medium border-2 ${
                        premioTipo === v
                          ? "border-[#7C3AED] bg-[#F0FDF4] text-[#7C3AED]"
                          : "border-[#E5E7EB] text-[#666]"
                      }`}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              {premioTipo !== "reconhecimento" && (
                <div>
                  <label className="block text-[12px] text-[#666] mb-1">Descrição do prêmio</label>
                  <input
                    value={premioDescricao}
                    onChange={e => setPremioDescricao(e.target.value)}
                    placeholder="ex: Consulta de retorno grátis"
                    className="w-full border border-[#E5E7EB] rounded-xl px-3 py-2.5 text-[13px] outline-none focus:border-[#7C3AED]" />
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-3 rounded-xl border border-[#E5E7EB] text-[13px] text-[#666]">
                Cancelar
              </button>
              <button
                onClick={criar}
                disabled={criando || !dataInicio || !dataFim}
                className="flex-1 py-3 rounded-xl bg-[#7C3AED] text-white text-[13px] font-bold disabled:opacity-50">
                {criando ? "Criando..." : "Criar e ativar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
