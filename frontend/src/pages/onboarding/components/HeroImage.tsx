import { ImageIcon } from "lucide-react";

/**
 * Área hero do slide de boas-vindas (topo full-bleed).
 *
 * ▸ COMO TROCAR A IMAGEM: passe `src` com a foto do atleta (recomendado:
 *   importe de `src/assets/onboarding-hero.jpg` e passe aqui). Sem `src`,
 *   mostramos um placeholder com o glow verde da marca + o "N" angular.
 *   Ex.:  import heroSrc from "../../../assets/onboarding-hero.jpg";
 *         <HeroImage src={heroSrc} />
 */
export function HeroImage({ src }: { src?: string }) {
  return (
    <div className="relative w-full overflow-hidden bg-[#0A0A0A]" style={{ height: "clamp(260px, 44vh, 500px)" }}>
      {src ? (
        <img src={src} alt="Atleta Nexvel" className="size-full object-cover" style={{ objectPosition: "50% 22%" }} />
      ) : (
        <>
          {/* glow verde radial (atmosfera da marca) */}
          <div
            className="absolute inset-0"
            style={{ background: "radial-gradient(115% 80% at 64% 42%, rgba(124,255,91,0.30), rgba(124,255,91,0.06) 46%, transparent 72%)" }}
          />
          {/* "X" de marca ao fundo */}
          <div className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
            <img
              src="/nexvel-x-512.png"
              alt=""
              className="w-2/5 max-w-[180px]"
              style={{ opacity: 0.34, filter: "drop-shadow(0 0 14px rgba(124,255,91,0.4))" }}
            />
          </div>
          {/* legenda discreta de placeholder */}
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/40">
            <ImageIcon className="size-8" strokeWidth={1.5} />
            <span className="text-label-md uppercase tracking-widest">Foto do atleta aqui</span>
          </div>
        </>
      )}
      {/* fade pro fundo da página — transição sem costura pro conteúdo */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-28"
        style={{ background: "linear-gradient(to top, #0A0A0A 8%, transparent)" }}
      />
    </div>
  );
}
