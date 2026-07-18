import { Link } from "react-router-dom";
import { Download } from "lucide-react";
import { BottomSheetNx } from "@/components/ui-nx";
import { getPlataforma } from "@/lib/pwaInstall";

/**
 * Empurrão de instalação — folha inferior que aparece em momentos positivos
 * (depois de um check-in). A cadência/decisão fica em lib/installStrategy.
 * Dispensar (backdrop, ESC, arraste, "Agora não") conta como "não".
 * Instalar leva ao guia inteligente /instalar.
 */
export function PromptInstalacao({
  open,
  onDispensar,
  onInstalar,
}: {
  open: boolean;
  onDispensar: () => void;
  onInstalar: () => void;
}) {
  const cta = getPlataforma() === "ios" ? "Ver como instalar" : "Instalar o app";

  return (
    <BottomSheetNx open={open} onClose={onDispensar} ariaLabel="Instalar o app">
      <div className="pb-2 text-center">
        <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-nx-evo/15">
          <Download className="size-7 text-nx-evo" />
        </div>
        <h2 className="mt-4 text-headline-md text-nx-on-surface">Deixe o Nexvel na sua tela</h2>
        <p className="mt-1.5 text-body-md text-nx-on-surface-variant">
          Um toque pra voltar amanhã, seus lembretes e a sequência sempre à mão.
        </p>

        <Link
          to="/instalar"
          onClick={onInstalar}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-nx-lg bg-nx-evo py-3.5 text-body-md font-semibold text-[#08130A]"
        >
          <Download className="size-5" /> {cta}
        </Link>
        <button
          type="button"
          onClick={onDispensar}
          className="mt-1 w-full py-3 text-body-sm font-medium text-nx-on-surface-variant"
        >
          Agora não
        </button>
      </div>
    </BottomSheetNx>
  );
}
