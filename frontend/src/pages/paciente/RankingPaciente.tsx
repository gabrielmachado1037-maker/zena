import { useEffect, useState } from "react";
import { Trophy } from "lucide-react";
import api from "../../lib/api";
import { usePacienteAuth } from "../../contexts/PacienteAuthContext";
import Avatar from "../../components/Avatar";

interface RankingItem {
  posicao: number;
  pacienteId: string;
  nome: string;
  fotoUrl?: string | null;
  pontuacaoTotal: number;
  euMesmo: boolean;
}

interface RankingData {
  ranking: RankingItem[];
  minhaPosicao: RankingItem | null;
}

const BORDER = ["#FFB900", "#9E9E9E", "#CD7F32"];
const LABEL  = ["🥇", "🥈", "🥉"];
const SZ     = [72, 56, 56];

export default function RankingPaciente() {
  const { token } = usePacienteAuth();
  const [data, setData]       = useState<RankingData | null>(null);
  const [periodo, setPeriodo] = useState<"semanal" | "mensal">("semanal");
  const [loading, setLoading] = useState(true);

  const authHeader = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    setLoading(true);
    api.get<RankingData>(`/paciente-app/ranking?periodo=${periodo}`, { headers: authHeader })
      .then(r => setData(r.data))
      .finally(() => setLoading(false));
  }, [periodo]);

  const top3  = data?.ranking?.slice(0, 3) ?? [];
  const resto = data?.ranking?.slice(3)    ?? [];
  const minha = data?.minhaPosicao;

  // pódio: 2º - 1º - 3º
  const podiumOrder = top3.length === 3 ? [top3[1], top3[0], top3[2]] : top3;

  return (
    <div className="pt-4 pb-4">
      {/* Período */}
      <div className="flex gap-2 px-4 mb-6">
        {(["semanal", "mensal"] as const).map(p => (
          <button key={p} onClick={() => setPeriodo(p)}
            className={`flex-1 py-2.5 rounded-2xl text-[13px] font-semibold transition-all ${
              periodo === p ? "text-white" : "text-[#999] bg-white"
            }`}
            style={periodo === p ? { background: "#1B4332" } : {}}>
            {p === "semanal" ? "Esta semana" : "Este mês"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2 px-4">
          {[1,2,3,4].map(i => <div key={i} className="bg-white rounded-2xl h-16 animate-pulse" />)}
        </div>
      ) : top3.length === 0 ? (
        <div className="text-center py-20 px-6">
          <Trophy size={48} className="mx-auto mb-3 text-[#E0E0E0]" />
          <p className="text-[16px] font-semibold text-[#333] mb-1">Ranking ainda não calculado</p>
          <p className="text-[13px] text-[#999]">Continue registrando sua evolução!</p>
        </div>
      ) : (
        <>
          {/* Pódio */}
          <div className="mx-4 mb-6 bg-white rounded-3xl pt-8 pb-6 px-4"
            style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
            <div className="flex items-end justify-center gap-3">
              {podiumOrder.map(item => {
                const ri = item.posicao - 1; // 0,1,2
                const isFirst = item.posicao === 1;
                return (
                  <div key={item.pacienteId} className="flex flex-col items-center gap-1.5">
                    <span className="text-[22px]">{LABEL[ri]}</span>
                    <Avatar nome={item.nome} src={item.fotoUrl} tamanho={SZ[ri]} borda={`3px solid ${BORDER[ri]}`} />
                    <p className="text-[11px] font-bold text-[#111] text-center max-w-[64px] truncate">
                      {item.nome.split(" ")[0]}
                    </p>
                    {item.euMesmo && <span className="text-[9px] font-semibold" style={{ color: "#52B788" }}>você</span>}
                    <p className="text-[11px] font-semibold tabular-nums" style={{ color: BORDER[ri] }}>
                      {item.pontuacaoTotal.toFixed(0)} pts
                    </p>
                    {/* pedestal */}
                    <div className="w-16 rounded-t-xl"
                      style={{
                        height: isFirst ? 48 : 32,
                        background: `${BORDER[ri]}22`,
                        borderTop: `3px solid ${BORDER[ri]}`,
                      }} />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Minha posição se não no top 3 */}
          {minha && minha.posicao > 3 && (
            <div className="mx-4 mb-4 p-4 rounded-2xl border border-[#B7E4C7]"
              style={{ background: "#E0F2E9" }}>
              <p className="text-[11px] font-semibold text-[#2D6A4F] mb-2">Sua posição</p>
              <div className="flex items-center gap-3">
                <span className="text-[28px] font-bold" style={{ color: "#1B4332" }}>#{minha.posicao}</span>
                <Avatar nome={minha.nome} src={minha.fotoUrl} tamanho={36} />
                <div>
                  <p className="text-[14px] font-bold text-[#111]">{minha.nome.split(" ")[0]}</p>
                  <p className="text-[12px]" style={{ color: "#2D6A4F" }}>{minha.pontuacaoTotal.toFixed(0)} pts</p>
                </div>
              </div>
            </div>
          )}

          {/* Lista 4+ */}
          {resto.length > 0 && (
            <div className="px-4 space-y-2">
              {resto.map(item => (
                <div key={item.pacienteId}
                  className={`flex items-center gap-3 px-4 py-3 rounded-2xl bg-white ${
                    item.euMesmo ? "ring-2 ring-[#52B788]" : ""
                  }`}>
                  <span className="w-5 text-center text-[13px] font-bold text-[#bbb]">{item.posicao}</span>
                  <Avatar nome={item.nome} src={item.fotoUrl} tamanho={36} />
                  <p className={`flex-1 text-[14px] font-medium truncate ${item.euMesmo ? "text-[#1B4332]" : "text-[#333]"}`}>
                    {item.nome.split(" ")[0]}
                    {item.euMesmo && <span className="ml-1 text-[11px] font-normal" style={{ color: "#52B788" }}>(você)</span>}
                  </p>
                  <p className="text-[13px] text-[#999] tabular-nums">{item.pontuacaoTotal.toFixed(0)} pts</p>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
