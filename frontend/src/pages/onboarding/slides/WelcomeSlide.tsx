import { HeroImage } from "../components/HeroImage";
import { NexvelLogo } from "../components/NexvelLogo";
import { PrimaryButton, OutlineButton } from "../components/OnbButtons";
import heroImg from "../../../assets/onboarding-hero.jpg";

/** Slide 1 — boas-vindas. */
export function WelcomeSlide({ onStart, onLogin }: { onStart: () => void; onLogin: () => void }) {
  return (
    <div className="flex min-h-full flex-col">
      <HeroImage src={heroImg} />

      {/* Conteúdo */}
      <div className="flex flex-1 flex-col px-6 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <NexvelLogo className="-mt-3 h-[38px]" />

        <h1 className="mt-4 text-[32px] font-extrabold leading-[1.06] tracking-tight text-white text-balance">
          Transforme hábitos em <span className="text-nx-evo">resultados.</span>
        </h1>

        <p className="mt-3 max-w-[34ch] text-body-md leading-relaxed text-[#A1A1AA]">
          A plataforma que une acompanhamento nutricional, gamificação e evolução diária para você chegar mais longe.
        </p>

        {/* Ações */}
        <div className="mt-auto space-y-2.5 pt-6">
          <PrimaryButton onClick={onStart}>Começar</PrimaryButton>
          <OutlineButton onClick={onLogin}>Já tenho uma conta</OutlineButton>
        </div>

        {/* Prova social */}
        <div className="mt-5 flex items-center gap-3">
          <div className="flex -space-x-3">
            {["#3f3f46", "#52525b", "#3f3f46"].map((c, i) => (
              <span
                key={i}
                className="size-9 rounded-full ring-2 ring-[#0A0A0A]"
                style={{ background: `radial-gradient(circle at 35% 30%, #6b7280, ${c})` }}
                aria-hidden="true"
              />
            ))}
          </div>
          <p className="text-body-sm leading-snug text-[#A1A1AA]">
            <span className="font-bold text-nx-evo">+25 mil</span> hábitos registrados<br />e milhares de vidas transformadas.
          </p>
        </div>
      </div>
    </div>
  );
}
