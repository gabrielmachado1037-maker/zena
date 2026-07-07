import { Trophy, TrendingUp, Brain } from "lucide-react";
import { FeatureCard } from "../components/FeatureCard";
import { PaginationDots } from "../components/PaginationDots";
import { PrimaryButton, TextButton } from "../components/OnbButtons";

const BENEFICIOS = [
  { icon: Trophy, titulo: ["Ganhe XP", "e suba de liga"] as [string, string], descricao: "Complete missões diárias e evolua sempre." },
  { icon: TrendingUp, titulo: ["Acompanhe", "sua evolução"] as [string, string], descricao: "Hábitos, fotos, medidas e progresso em um só lugar." },
  { icon: Brain, titulo: ["Seu nutricionista", "acompanha tudo"] as [string, string], descricao: "Orientações personalizadas baseadas no seu desempenho." },
];

/** Slide 2 — benefícios. */
export function BenefitsSlide({
  active, onDot, onLogin, onSignup,
}: {
  active: number; onDot: (i: number) => void; onLogin: () => void; onSignup: () => void;
}) {
  return (
    <div className="flex min-h-full flex-col px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(2rem,env(safe-area-inset-top))]">
      <h1 className="text-[32px] font-extrabold leading-[1.08] tracking-tight text-white text-balance">
        Sua evolução não depende de motivação. <span className="text-nx-evo">Depende de consistência.</span>
      </h1>

      <PaginationDots count={2} active={active} onDot={onDot} className="mt-5" />

      {/* Benefícios */}
      <div className="mt-8 space-y-3">
        {BENEFICIOS.map((b) => (
          <FeatureCard key={b.titulo[0]} icon={b.icon} titulo={b.titulo} descricao={b.descricao} />
        ))}
      </div>

      {/* Ações */}
      <div className="mt-auto pt-8">
        <PrimaryButton onClick={onLogin}>Entrar</PrimaryButton>

        <div className="my-4 flex items-center gap-3">
          <span className="h-px flex-1 bg-white/10" />
          <span className="text-body-sm text-[#A1A1AA]">ou</span>
          <span className="h-px flex-1 bg-white/10" />
        </div>

        <TextButton onClick={onSignup}>Criar conta</TextButton>
      </div>
    </div>
  );
}
