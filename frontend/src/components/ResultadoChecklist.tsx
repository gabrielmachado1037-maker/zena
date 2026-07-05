interface Props {
  pontosGanhos: number;
  posicaoAtual?: number | null;
  totalParticipantes?: number | null;
  onClose: () => void;
}

export default function ResultadoChecklist({ pontosGanhos, posicaoAtual, totalParticipantes, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-sm mx-4 bg-white rounded-3xl p-7 text-center shadow-2xl">
        <div className="text-[40px] mb-2">✨</div>
        <h2 className="text-[18px] font-bold text-[#111] mb-1">Check-in enviado!</h2>

        <div className="text-[52px] font-light text-[#7C3AED] leading-none mb-1 tabular-nums">
          +{pontosGanhos}
        </div>
        <p className="text-[13px] text-[#888] mb-4">pontos ganhos hoje</p>

        {posicaoAtual != null && totalParticipantes != null && (
          <div className="bg-[#F0FDF4] rounded-xl p-3 mb-5">
            <p className="text-[13px] text-[#7C3AED] font-medium">
              📊 Você está em <strong>{posicaoAtual}º lugar</strong> de {totalParticipantes} participantes
            </p>
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full py-3 rounded-xl bg-[#7C3AED] text-white text-[14px] font-semibold">
          Fechar
        </button>
      </div>
    </div>
  );
}
