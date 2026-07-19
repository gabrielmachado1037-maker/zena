import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import apiPaciente from "../../lib/apiPaciente";
import { formatarXp } from "../../lib/ligas";

interface Relatorio {
  id: string;
  percentualGeral: number;
  percentualHidratacao: number;
  percentualRefeicao: number;
  percentualTreino: number;
  melhorSequencia: number;
  pontosTotal: number;
  posicaoFinal: number;
  totalParticipantes: number;
  destaque?: string;
  mensagemNutri?: string;
  ciclo: { numero: number; titulo?: string; dataFim: string };
  top3: { pacienteId: string; pontosCiclo: number; paciente: { nome: string } }[];
}

function BarraPercent({ valor, cor }: { valor: number; cor: string }) {
  return (
    <div className="h-2.5 bg-black/10 rounded-full overflow-hidden">
      <div className="h-full rounded-full" style={{ width: `${valor}%`, background: cor }} />
    </div>
  );
}

function corPercentual(pct: number) {
  if (pct >= 70) return "#16A34A";
  if (pct >= 50) return "#EAB308";
  return "#F87171";
}

const MEDAL = ["🥇", "🥈", "🥉"];

export default function RelatorioCiclo() {
  const { cicloId } = useParams<{ cicloId: string }>();
  const navigate = useNavigate();
  const [rel, setRel] = useState<Relatorio | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!cicloId) return;
    apiPaciente.get(`/ciclos/paciente/${cicloId}/relatorio`)
      .then(r => setRel(r.data))
      .catch(() => setRel(null))
      .finally(() => setLoading(false));
  }, [cicloId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F9F9F7]">
        <div className="text-[#888] text-[14px]">Carregando relatório...</div>
      </div>
    );
  }

  if (!rel) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F9F9F7] p-6">
        <div className="text-[40px] mb-3">📊</div>
        <p className="text-[15px] text-[#555] text-center mb-6">Relatório ainda não disponível.</p>
        <button onClick={() => navigate(-1)}
          className="px-6 py-3 rounded-xl bg-[#7C3AED] text-white text-[14px] font-semibold">
          Voltar
        </button>
      </div>
    );
  }

  const nrStr = String(rel.ciclo.numero).padStart(2, "0");
  const corGeral = corPercentual(rel.percentualGeral);

  return (
    <div className="min-h-screen bg-[#F9F9F7] pb-10">
      <div className="bg-[#7C3AED] px-6 pt-12 pb-8 text-white text-center">
        <div className="text-[28px] mb-1">🏆</div>
        <h1 className="text-[20px] font-bold mb-0.5">Ciclo {nrStr} encerrado!</h1>
        {rel.ciclo.titulo && <p className="text-[13px] text-white/70">{rel.ciclo.titulo}</p>}
        <p className="text-[13px] text-white/60 mt-1">Seu Relatório de Desempenho</p>
      </div>

      <div className="px-4 -mt-4 space-y-4">
        <div className="bg-white rounded-2xl p-6 text-center shadow-sm">
          <div className="text-[64px] font-light leading-none tabular-nums" style={{ color: corGeral }}>
            {rel.percentualGeral}%
          </div>
          <p className="text-[13px] text-[#888] mt-1">de consistência neste ciclo</p>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h3 className="text-[13px] font-bold text-[#333] mb-4">Por categoria</h3>
          <div className="space-y-3">
            {[
              { label: "🍽️ Refeições", val: rel.percentualRefeicao, cor: "#16A34A" },
              { label: "💧 Hidratação", val: rel.percentualHidratacao, cor: "#0EA5E9" },
              { label: "🏃 Atividade",  val: rel.percentualTreino,    cor: "#F97316" },
            ].map(({ label, val, cor }) => (
              <div key={label}>
                <div className="flex justify-between text-[12px] mb-1">
                  <span className="text-[#555]">{label}</span>
                  <span className="font-semibold text-[#333]">{val}%</span>
                </div>
                <BarraPercent valor={val} cor={cor} />
              </div>
            ))}
          </div>
          {rel.destaque && (
            <p className="text-[12px] text-[#7C3AED] font-medium mt-4 bg-[#F0FDF4] rounded-xl p-3">
              {rel.destaque}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: "🔥", label: "Maior sequência", val: `${rel.melhorSequencia} dias` },
            { icon: "⭐", label: "Pontos ganhos",    val: `${formatarXp(rel.pontosTotal)} pts` },
            { icon: "🏅", label: "Posição final",    val: rel.posicaoFinal > 0 ? `${rel.posicaoFinal}º lugar` : "—" },
            { icon: "👥", label: "Participantes",    val: `${rel.totalParticipantes}` },
          ].map(({ icon, label, val }) => (
            <div key={label} className="bg-white rounded-2xl p-4 shadow-sm text-center">
              <div className="text-[22px] mb-1">{icon}</div>
              <div className="text-[16px] font-bold text-[#111]">{val}</div>
              <div className="text-[11px] text-[#888]">{label}</div>
            </div>
          ))}
        </div>

        {rel.top3?.length > 0 && (
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <h3 className="text-[13px] font-bold text-[#333] mb-4">Pódio do ciclo</h3>
            <div className="space-y-2">
              {rel.top3.map((p, i) => (
                <div key={p.pacienteId} className="flex items-center gap-3">
                  <span className="text-[18px] w-7">{MEDAL[i]}</span>
                  <span className="flex-1 text-[13px] text-[#333]">{p.paciente.nome.split(" ")[0]}</span>
                  <span className="text-[12px] font-semibold text-[#888]">{p.pontosCiclo} pts</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {rel.mensagemNutri && (
          <div className="bg-[#F0FDF4] rounded-2xl p-5 shadow-sm">
            <p className="text-[13px] text-[#7C3AED] leading-relaxed">💚 {rel.mensagemNutri}</p>
          </div>
        )}

        <button
          onClick={() => navigate("/paciente/feed")}
          className="w-full py-4 rounded-2xl bg-[#7C3AED] text-white text-[14px] font-bold">
          Voltar ao feed
        </button>
      </div>
    </div>
  );
}
