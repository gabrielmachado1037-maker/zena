import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, UserCheck, Stethoscope, ChevronRight } from "lucide-react";
import { NexvelLogo } from "../onboarding/components/NexvelLogo";

/**
 * Porta de entrada do PACIENTE (B2C). Duas escolhas antes de criar conta:
 *  - "Já tenho nutricionista" → cadastro por código de convite (fluxo B2B existente).
 *  - "Quero contratar" → cadastro avulso → marketplace de parceiros.
 */
export default function PacienteComecar() {
  const navigate = useNavigate();
  return (
    <div className="flex min-h-[100dvh] w-full justify-center bg-black">
      <div className="relative flex w-full max-w-[440px] flex-col bg-[#0A0A0A] px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))]">
        <header className="flex items-center justify-between py-2">
          <button
            type="button" onClick={() => navigate("/")} aria-label="Voltar"
            className="grid size-10 place-items-center rounded-full text-[#A1A1AA] transition-colors hover:bg-white/5 hover:text-white active:scale-95"
          >
            <ArrowLeft className="size-5" />
          </button>
          <Link to="/login" className="text-body-sm font-medium text-[#A1A1AA] transition-colors hover:text-nx-evo">
            Área da nutricionista
          </Link>
        </header>

        <div className="mt-8">
          <NexvelLogo className="h-[30px]" />
          <h1 className="mt-8 text-[30px] font-extrabold leading-tight tracking-tight text-white">
            Como você quer <span className="text-nx-evo">começar?</span>
          </h1>
          <p className="mt-2 text-body-md text-[#A1A1AA]">Escolha o caminho que combina com você.</p>

          <div className="mt-8 space-y-3">
            <ChoiceCard
              icon={<UserCheck className="size-6" />}
              title="Já tenho nutricionista"
              subtitle="Recebi um código de convite dela"
              onClick={() => navigate("/login-paciente?tab=register")}
            />
            <ChoiceCard
              icon={<Stethoscope className="size-6" />}
              title="Quero contratar um nutricionista"
              subtitle="Escolha um dos nossos especialistas parceiros"
              onClick={() => navigate("/paciente-cadastro")}
              destaque
            />
          </div>

          <p className="mt-8 text-center text-body-sm text-[#A1A1AA]">
            Já tem uma conta?{" "}
            <Link to="/login-paciente" className="font-bold text-nx-evo transition-colors hover:text-nx-evo-2">Entrar</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function ChoiceCard({ icon, title, subtitle, onClick, destaque }: {
  icon: React.ReactNode; title: string; subtitle: string; onClick: () => void; destaque?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={
        "flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition-colors " +
        (destaque
          ? "border-nx-evo/40 bg-nx-evo/[0.08] hover:bg-nx-evo/[0.14]"
          : "border-white/[0.08] bg-[#141414] hover:bg-white/[0.06]")
      }
    >
      <span className={"grid size-12 shrink-0 place-items-center rounded-xl " + (destaque ? "bg-nx-evo/20 text-nx-evo" : "bg-white/[0.06] text-white")}>
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-body-lg font-bold text-white">{title}</span>
        <span className="block text-body-sm text-[#A1A1AA]">{subtitle}</span>
      </span>
      <ChevronRight className="size-5 shrink-0 text-[#A1A1AA]" />
    </button>
  );
}
