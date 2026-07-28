import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Star, ArrowLeft, Stethoscope } from "lucide-react";
import { ButtonNx, ChipNx } from "@/components/ui-nx";
import { listarParceiros, type Parceiro } from "@/lib/parceria";

function Estrelas({ nota }: { nota: number }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="inline-flex">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            className="size-3.5"
            style={{ color: "#F8C84B" }}
            fill={i <= Math.round(nota) ? "#F8C84B" : "transparent"}
          />
        ))}
      </span>
      <span className="text-label-sm font-bold tabular-nums text-nx-on-surface">{nota.toFixed(1)}</span>
    </span>
  );
}

function ParceiroCard({ p, onEscolher }: { p: Parceiro; onEscolher: () => void }) {
  return (
    <article className="rounded-nx-xl border border-nx-border bg-nx-surface p-5 shadow-nx-card">
      <div className="flex items-center gap-4">
        <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-full bg-nx-container-high">
          {p.foto ? (
            <img src={p.foto} alt={p.nome} className="size-full object-cover" />
          ) : (
            <span className="text-headline-md font-bold text-nx-on-surface-variant">{p.nome.charAt(0)}</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-headline-md font-bold text-nx-on-surface">{p.nome}</h2>
          <div className="mt-1"><Estrelas nota={p.avaliacao} /></div>
        </div>
      </div>

      <div className="mt-3">
        <ChipNx tone="evo" icon={<Stethoscope className="size-3" />}>{p.especialidade}</ChipNx>
      </div>
      {p.bio && <p className="mt-3 text-body-sm text-nx-on-surface-variant">{p.bio}</p>}

      <ButtonNx variant="evo" block className="mt-4" onClick={onEscolher}>
        Escolher · R$ 200
      </ButtonNx>
    </article>
  );
}

export function MarketplaceEscolherScreen() {
  const navigate = useNavigate();
  const [parceiros, setParceiros] = useState<Parceiro[] | null>(null);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    listarParceiros().then(setParceiros).catch(() => setErro(true));
  }, []);

  return (
    <div className="space-y-6 px-5 pb-24 pt-7">
      <header>
        <button
          onClick={() => navigate("/paciente/parceria")}
          className="mb-3 inline-flex items-center gap-1.5 text-body-sm font-semibold text-nx-on-surface-variant transition-colors hover:text-nx-on-surface"
        >
          <ArrowLeft className="size-4" /> Voltar
        </button>
        <h1 className="text-headline-lg text-nx-on-surface">Escolha seu nutricionista</h1>
        <p className="mt-0.5 text-body-md text-nx-on-surface-variant">
          Consulta com acompanhamento completo por 30 dias. R$ 200 via Pix.
        </p>
      </header>

      {erro && (
        <div className="rounded-nx-lg border border-nx-danger/30 bg-nx-danger/[0.06] p-5 text-center">
          <p className="text-body-md text-nx-on-surface">Não foi possível carregar os nutricionistas.</p>
        </div>
      )}

      {!parceiros && !erro && (
        <div className="flex justify-center py-16">
          <div className="size-8 animate-spin rounded-full border-2 border-nx-evo border-t-transparent" />
        </div>
      )}

      {parceiros?.length === 0 && (
        <div className="rounded-nx-lg border border-nx-border bg-nx-surface p-8 text-center">
          <p className="text-body-md text-nx-on-surface-variant">Nenhum nutricionista disponível no momento.</p>
        </div>
      )}

      <div className="space-y-4">
        {parceiros?.map((p) => (
          <ParceiroCard key={p.id} p={p} onEscolher={() => navigate(`/paciente/parceria/pagar/${p.id}`)} />
        ))}
      </div>
    </div>
  );
}
