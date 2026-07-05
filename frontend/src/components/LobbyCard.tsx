import { useEffect, useState } from "react";
import { ChevronRight, Trophy } from "lucide-react";
import { useNavigate } from "react-router-dom";
import apiPaciente from "../lib/apiPaciente";

interface Participante {
  pacienteId: string;
  pontosCiclo: number;
  posicaoAtual: number;
  paciente: { id: string; nome: string; fotoPerfilUrl?: string };
}

interface CicloAtual {
  ciclo: {
    id: string;
    numero: number;
    titulo?: string;
    dataFim: string;
    premioDescricao?: string;
    premioTipo: string;
    status: string;
    percentual: number;
    diasRestantes: number;
  } | null;
  ranking_top5: Participante[];
  minha_posicao?: { pontosCiclo: number; posicaoAtual: number } | null;
  total_participantes: number;
  encerramento_recente?: {
    cicloId: string;
    ciclo: { numero: number };
    vencedor?: { nome: string } | null;
    mensagem?: string;
  } | null;
}

const MEDAL = ["🥇", "🥈", "🥉"];

export default function LobbyCard() {
  const [data, setData] = useState<CicloAtual | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    apiPaciente.get("/ciclos/paciente/atual")
      .then(r => setData(r.data))
      .catch(() => {});
  }, []);

  if (!data) return null;

  // Encerramento recente (sem ciclo ativo)
  if (!data.ciclo && data.encerramento_recente) {
    const enc = data.encerramento_recente;
    return (
      <div className="mx-3 mb-4 rounded-2xl p-4 border-2"
        style={{ background: "#F5F3FF", borderColor: "#7C3AED" }}>
        <div className="text-[15px] font-bold text-[#111] mb-1">
          🎉 Ciclo {String(enc.ciclo.numero).padStart(2, "0")} encerrado!
        </div>
        {enc.vencedor && (
          <div className="text-[13px] text-[#555] mb-3">
            👑 Vencedor: <strong>{enc.vencedor.nome}</strong>
          </div>
        )}
        <button
          onClick={() => navigate(`/paciente/relatorio/${enc.cicloId}`)}
          className="flex items-center gap-1 text-[12px] font-semibold text-[#7C3AED]">
          Ver seu relatório <ChevronRight size={13} />
        </button>
      </div>
    );
  }

  if (!data.ciclo) return null;

  const { ciclo, ranking_top5 } = data;
  const status = ciclo.status;
  const nrStr = String(ciclo.numero).padStart(2, "0");

  const colors: Record<string, { bg: string; border: string; titulo: string }> = {
    ativo:       { bg: "#F0FDF4", border: "#7C3AED", titulo: "#7C3AED" },
    aquecimento: { bg: "#FFFBEB", border: "#F59E0B", titulo: "#92400E" },
    encerrado:   { bg: "#F5F3FF", border: "#7C3AED", titulo: "#5B21B6" },
  };
  const c = colors[status] ?? colors.ativo;
  const isAquecimento = status === "aquecimento";

  return (
    <div className="mx-3 mb-4 rounded-2xl p-4 border-2"
      style={{ background: c.bg, borderColor: c.border }}>

      <div className="flex items-center gap-2 mb-3">
        <Trophy size={16} color={c.titulo} />
        <span className="text-[14px] font-bold" style={{ color: c.titulo }}>
          Ciclo {nrStr}{ciclo.titulo ? ` — ${ciclo.titulo}` : ""}
        </span>
        {isAquecimento && ciclo.diasRestantes <= 1 && (
          <span className="ml-auto px-2 py-0.5 rounded-full text-[10px] font-bold text-white"
            style={{ background: "#F59E0B" }}>
            ÚLTIMAS HORAS
          </span>
        )}
      </div>

      <div className="mb-2">
        <div className="flex justify-between text-[11px] text-[#888] mb-1">
          <span>{ciclo.percentual}% concluído</span>
          <span>Faltam {ciclo.diasRestantes} dia{ciclo.diasRestantes !== 1 ? "s" : ""}</span>
        </div>
        <div className="h-2 bg-black/10 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all"
            style={{ width: `${ciclo.percentual}%`, background: c.border }} />
        </div>
      </div>

      {isAquecimento && (
        <p className="text-[12px] font-medium mb-3" style={{ color: c.titulo }}>
          Ainda dá tempo de subir no ranking! Faça seu check-in de hoje →
        </p>
      )}

      {ranking_top5.length > 0 && (
        <div className="mb-3 space-y-1">
          {ranking_top5.map((p, i) => (
            <div key={p.pacienteId} className="flex items-center gap-2">
              <span className="text-[13px] w-5">{MEDAL[i] ?? `${i + 1}.`}</span>
              <span className="flex-1 text-[12px] text-[#333] truncate">{p.paciente.nome.split(" ")[0]}</span>
              <span className="text-[12px] font-semibold text-[#555]">{p.pontosCiclo} pts</span>
            </div>
          ))}
        </div>
      )}

      {ciclo.premioDescricao && (
        <div className="text-[11px] text-[#888] mb-2">
          🏅 Prêmio: {ciclo.premioDescricao}
        </div>
      )}

      <button
        onClick={() => navigate("/paciente/ranking")}
        className="flex items-center gap-1 text-[12px] font-semibold"
        style={{ color: c.titulo }}>
        Ver ranking completo <ChevronRight size={13} />
      </button>
    </div>
  );
}
