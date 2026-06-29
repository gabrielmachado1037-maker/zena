import { useState } from "react";
import { X } from "lucide-react";
import apiPaciente from "../lib/apiPaciente";

interface Props {
  onClose: () => void;
  onSuccess: (resultado: { pontosGanhos: number; posicaoAtual?: number | null; totalParticipantes?: number | null }) => void;
}

function OpcaoBtn({ val, atual, onSelect, pts }: {
  val: boolean;
  atual: boolean | null;
  onSelect: (v: boolean) => void;
  pts?: number;
}) {
  const ativo = atual === val;
  return (
    <button
      onClick={() => onSelect(val)}
      className={`flex-1 py-3 rounded-xl text-[13px] font-semibold transition-all border-2 ${
        ativo
          ? val
            ? "bg-[#1B4332] text-white border-[#1B4332]"
            : "bg-[#F3F4F6] text-[#888] border-[#E5E7EB]"
          : "bg-white text-[#333] border-[#E5E7EB]"
      }`}>
      {val ? `SIM${pts ? ` +${pts}pts` : ""}` : "NÃO"}
    </button>
  );
}

export default function ChecklistDiario({ onClose, onSuccess }: Props) {
  const [refeicoesOk, setRefeicoesOk] = useState<boolean | null>(null);
  const [aguaOk, setAguaOk] = useState<boolean | null>(null);
  const [treinoOk, setTreinoOk] = useState<boolean | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");

  const hojeStr = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });

  const pontosEstimados = () => {
    let pts = 0;
    if (refeicoesOk) pts += 8;
    if (aguaOk) pts += 6;
    if (treinoOk) pts += 6;
    if (refeicoesOk && aguaOk && treinoOk) pts += 5;
    return pts;
  };

  const pronto = refeicoesOk !== null && aguaOk !== null && treinoOk !== null;

  const enviar = async () => {
    if (!pronto) return;
    setEnviando(true);
    setErro("");
    try {
      const r = await apiPaciente.post("/checklist", {
        refeicoesOk: !!refeicoesOk,
        aguaOk: !!aguaOk,
        treinoOk: !!treinoOk,
      });
      onSuccess(r.data);
    } catch (e: any) {
      if (e?.response?.status === 409) {
        setErro("Você já enviou o check-in de hoje!");
      } else {
        setErro("Erro ao enviar. Tente novamente.");
      }
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-md bg-white rounded-t-3xl p-6 pb-8">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-[16px] font-bold text-[#111]">✅ Check-in de hoje</h2>
          <button onClick={onClose} className="p-1 text-[#999]"><X size={20} /></button>
        </div>
        <p className="text-[12px] text-[#999] mb-5 capitalize">{hojeStr}</p>

        <div className="space-y-4 mb-5">
          <div>
            <p className="text-[13px] text-[#333] mb-2">🍽️ Bati minhas metas de refeições?</p>
            <div className="flex gap-2">
              <OpcaoBtn val={true} atual={refeicoesOk} onSelect={setRefeicoesOk} pts={8} />
              <OpcaoBtn val={false} atual={refeicoesOk} onSelect={setRefeicoesOk} />
            </div>
          </div>
          <div>
            <p className="text-[13px] text-[#333] mb-2">💧 Consumi minha meta de água?</p>
            <div className="flex gap-2">
              <OpcaoBtn val={true} atual={aguaOk} onSelect={setAguaOk} pts={6} />
              <OpcaoBtn val={false} atual={aguaOk} onSelect={setAguaOk} />
            </div>
          </div>
          <div>
            <p className="text-[13px] text-[#333] mb-2">🏃 Fiz minha atividade física?</p>
            <div className="flex gap-2">
              <OpcaoBtn val={true} atual={treinoOk} onSelect={setTreinoOk} pts={6} />
              <OpcaoBtn val={false} atual={treinoOk} onSelect={setTreinoOk} />
            </div>
          </div>
        </div>

        {pronto && (
          <div className="bg-[#F0FDF4] rounded-xl p-3 mb-4 flex items-center justify-between">
            <span className="text-[12px] text-[#1B4332]">Pontos estimados</span>
            <span className="text-[15px] font-bold text-[#1B4332]">+{pontosEstimados()} pts</span>
          </div>
        )}

        {erro && <p className="text-[12px] text-red-500 mb-3 text-center">{erro}</p>}

        <button
          onClick={enviar}
          disabled={!pronto || enviando}
          className="w-full py-4 rounded-2xl text-[15px] font-bold text-white transition-all"
          style={{ background: pronto ? "#1B4332" : "#D1D5DB" }}>
          {enviando ? "Enviando..." : "Enviar check-in →"}
        </button>
      </div>
    </div>
  );
}
