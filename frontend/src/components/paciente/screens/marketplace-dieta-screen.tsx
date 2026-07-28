import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Utensils, Droplets, Moon } from "lucide-react";
import { verDieta, type DietaResp } from "@/lib/parceria";

export function MarketplaceDietaScreen() {
  const navigate = useNavigate();
  const [dieta, setDieta] = useState<DietaResp | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    verDieta().then(setDieta).catch(() => { /* guard trata */ }).finally(() => setCarregando(false));
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
        <h1 className="text-headline-lg text-nx-on-surface">Minha dieta</h1>
        {dieta && <p className="mt-0.5 text-body-md text-nx-on-surface-variant">Plano com {dieta.parceiroNome}</p>}
      </header>

      {carregando ? (
        <div className="flex justify-center py-16"><div className="size-8 animate-spin rounded-full border-2 border-nx-evo border-t-transparent" /></div>
      ) : !dieta ? null : (
        <>
          <section className="space-y-2">
            <h3 className="px-1 text-label-md uppercase tracking-wide text-nx-on-surface-variant">Refeições do dia</h3>
            {dieta.planoRefeicoes && dieta.planoRefeicoes.length > 0 ? (
              dieta.planoRefeicoes.map((r) => (
                <div key={r.key} className="flex items-center gap-3 rounded-nx-lg border border-nx-border bg-nx-surface px-4 py-3.5">
                  <span className="grid size-10 shrink-0 place-items-center rounded-nx-md bg-nx-evo/15 text-nx-evo"><Utensils className="size-5" /></span>
                  <span className="text-body-md font-semibold text-nx-on-surface">{r.label}</span>
                </div>
              ))
            ) : (
              <div className="rounded-nx-lg border border-nx-border bg-nx-surface p-6 text-center">
                <p className="text-body-md text-nx-on-surface-variant">Seu nutricionista ainda não montou o plano de refeições.</p>
              </div>
            )}
          </section>

          <section className="grid grid-cols-2 gap-3">
            <div className="rounded-nx-lg border border-nx-border bg-nx-surface p-4">
              <Droplets className="size-5 text-nx-water" />
              <p className="mt-2 text-headline-md font-extrabold tabular-nums text-nx-on-surface">
                {dieta.aguaMetaMl ? `${(dieta.aguaMetaMl / 1000).toLocaleString("pt-BR")} L` : "—"}
              </p>
              <p className="text-label-sm text-nx-on-surface-variant">Meta de água</p>
            </div>
            <div className="rounded-nx-lg border border-nx-border bg-nx-surface p-4">
              <Moon className="size-5 text-nx-brand" />
              <p className="mt-2 text-headline-md font-extrabold tabular-nums text-nx-on-surface">
                {dieta.sonoMetaHoras ? `${dieta.sonoMetaHoras}h` : "—"}
              </p>
              <p className="text-label-sm text-nx-on-surface-variant">Meta de sono</p>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
