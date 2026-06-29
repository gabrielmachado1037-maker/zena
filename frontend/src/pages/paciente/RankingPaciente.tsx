import { useEffect, useState } from "react";
import { Trophy, Medal } from "lucide-react";
import api from "../../lib/api";
import { usePacienteAuth } from "../../contexts/PacienteAuthContext";

interface RankingItem {
  posicao: number; pacienteId: string; nome: string;
  pontuacaoTotal: number; euMesmo: boolean;
}

interface RankingData {
  ranking: RankingItem[];
  minhaPosicao: RankingItem | null;
}

const medalColors = ["#FFB900", "#9E9E9E", "#CD7F32"];

export default function RankingPaciente() {
  const { token } = usePacienteAuth();
  const [data, setData]       = useState<RankingData | null>(null);
  const [periodo, setPeriodo] = useState<"semanal" | "mensal">("semanal");
  const [loading, setLoading] = useState(true);

  const authHeader = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    setLoading(true);
    api.get<RankingData>(`/paciente-app/ranking?periodo=${periodo}`, { headers: authHeader })
      .then((r) => setData(r.data))
      .finally(() => setLoading(false));
  }, [periodo]);

  const minha = data?.minhaPosicao;

  return (
    <div className="px-5 pt-10 pb-4">
      <h1 className="text-[24px] font-bold text-[#111] mb-1">Ranking</h1>
      <p className="text-[13px] text-[#999] mb-6">Sua posição no consultório</p>

      {/* Período */}
      <div className="flex gap-2 mb-6">
        {(["semanal", "mensal"] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPeriodo(p)}
            className={`flex-1 py-2 rounded-xl text-[13px] font-semibold transition-all ${
              periodo === p ? "text-white" : "text-[#999] bg-[#F5F5F3]"
            }`}
            style={periodo === p ? { background: "#1B4332" } : {}}
          >
            {p === "semanal" ? "Esta semana" : "Este mês"}
          </button>
        ))}
      </div>

      {/* Minha posição em destaque */}
      {minha && (
        <div className="rounded-2xl p-4 mb-5 border border-[#B7E4C7]" style={{ background: "#E0F2E9" }}>
          <p className="text-[12px] font-medium text-[#2D6A4F] mb-1">Sua posição</p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-[36px] font-bold" style={{ color: "#1B4332" }}>#{minha.posicao}</span>
              <div>
                <p className="text-[14px] font-semibold text-[#111]">{minha.nome.split(" ")[0]}</p>
                <p className="text-[12px] text-[#2D6A4F]">{minha.pontuacaoTotal.toFixed(0)} pts</p>
              </div>
            </div>
            <Trophy size={32} style={{ color: minha.posicao <= 3 ? medalColors[minha.posicao - 1] : "#bbb" }} />
          </div>
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-xl px-4 py-3 animate-pulse flex gap-3">
              <div className="w-6 h-6 bg-[#F0F0EE] rounded" />
              <div className="flex-1 h-5 bg-[#F0F0EE] rounded" />
            </div>
          ))}
        </div>
      ) : (data?.ranking?.length ?? 0) === 0 ? (
        <div className="text-center py-12">
          <p className="text-[#bbb] text-[14px]">Ranking ainda não calculado.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {data!.ranking.map((item) => (
            <div
              key={item.pacienteId}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
                item.euMesmo ? "border-[#B7E4C7] bg-white" : "border-transparent bg-white"
              }`}
            >
              <div className="w-7 text-center">
                {item.posicao <= 3 ? (
                  <Medal size={18} style={{ color: medalColors[item.posicao - 1] }} />
                ) : (
                  <span className="text-[13px] font-bold text-[#bbb]">{item.posicao}</span>
                )}
              </div>
              <p className={`flex-1 text-[14px] font-medium ${item.euMesmo ? "text-[#1B4332]" : "text-[#333]"}`}>
                {item.nome.split(" ")[0]}
                {item.euMesmo && <span className="ml-1 text-[11px] text-[#52B788] font-normal">(você)</span>}
              </p>
              <p className="text-[13px] text-[#999] tabular-nums">{item.pontuacaoTotal.toFixed(0)} pts</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
