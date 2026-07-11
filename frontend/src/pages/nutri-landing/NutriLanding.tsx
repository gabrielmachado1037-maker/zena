import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { TrendingUp, Trophy, MessageCircle, Star, ArrowRight, type LucideIcon } from "lucide-react";
import { usePacienteAuth } from "../../contexts/PacienteAuthContext";
import Avatar from "../../components/Avatar";
import { ProLogo, PrimaryBtn } from "./components/shared";
import { DashboardPreview } from "./DashboardPreview";

/** Resultados (foco no que o nutri alcança — não é lista de funcionalidades). */
const RESULTADOS: { icon: LucideIcon; label: string }[] = [
  { icon: TrendingUp, label: "Mais aderência ao plano" },
  { icon: Trophy, label: "Resultados que aparecem" },
  { icon: MessageCircle, label: "Pacientes mais engajados" },
];

/** TELA 1 — Landing / entrada da área do nutricionista (NEXVEL NUTRITION PRO). */
export default function NutriLanding() {
  const navigate = useNavigate();
  const { token: pacienteToken, loading: authLoading } = usePacienteAuth();

  // Porta de entrada (/) — quem já está logado não fica na landing: vai direto pra sua área.
  const nutriToken = typeof localStorage !== "undefined" ? localStorage.getItem("zena_token") : null;
  const redireciona = !authLoading && (!!pacienteToken || !!nutriToken);
  useEffect(() => {
    if (authLoading) return;
    if (pacienteToken) navigate("/paciente/feed", { replace: true });
    else if (nutriToken) navigate("/app/dashboard", { replace: true });
  }, [authLoading, pacienteToken, nutriToken, navigate]);

  // Evita flash da landing enquanto resolve a sessão / redireciona logado.
  if (authLoading || redireciona) return <div className="min-h-[100dvh] w-full bg-[#0A0A0A]" />;

  return (
    <div className="relative min-h-[100dvh] w-full overflow-hidden bg-[#0A0A0A] text-white">
      {/* glow verde no topo */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[460px]"
        style={{ background: "radial-gradient(58% 100% at 68% 0%, rgba(124,255,91,0.13), transparent 70%)" }} />

      <div className="relative mx-auto max-w-[1440px] px-6 py-10 lg:px-12 lg:py-14">
        <header className="mb-14 lg:mb-20"><ProLogo /></header>

        <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-16">
          {/* Coluna esquerda — a mensagem */}
          <div className="max-w-xl">
            <h1 className="text-[36px] font-extrabold leading-[1.06] tracking-tight text-white text-balance sm:text-[44px] lg:text-[52px]">
              Faça seus pacientes seguirem o plano com{" "}
              <span className="text-nx-evo">mais consistência.</span>
            </h1>

            <p className="mt-6 text-body-lg font-semibold text-white sm:text-[19px]">
              Teste gratuito por <span className="text-nx-evo">14 dias.</span>
            </p>
            <p className="mt-1.5 text-body-md text-[#A1A1AA]">
              Sem cartão de crédito • Cancele quando quiser.
            </p>

            {/* Ações principais */}
            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
              <PrimaryBtn
                onClick={() => navigate("/cadastro")}
                className="h-14 w-full px-8 text-body-lg sm:w-auto"
              >
                Começar teste gratuito <ArrowRight className="size-5" />
              </PrimaryBtn>
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="inline-flex h-14 w-full items-center justify-center rounded-xl border border-white/12 bg-white/[0.02] px-8 text-body-lg font-semibold text-white transition-colors hover:border-white/25 hover:bg-white/[0.05] active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20 sm:w-auto"
              >
                Entrar
              </button>
            </div>

            <SocialProof />
          </div>

          {/* Coluna direita — preview do dashboard */}
          <div className="lg:pt-2">
            <DashboardPreview />
          </div>
        </div>

        {/* Resultados — faixa enxuta, ícones minimalistas */}
        <div className="mt-16 grid gap-4 sm:grid-cols-3 lg:mt-20">
          {RESULTADOS.map((r) => <Resultado key={r.label} {...r} />)}
        </div>
      </div>
    </div>
  );
}

function Resultado({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <div className="flex items-center gap-3.5 rounded-2xl border border-white/[0.06] bg-[#111311] px-5 py-4 transition-colors hover:border-nx-evo/25">
      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-nx-evo/10">
        <Icon className="size-5 text-nx-evo" strokeWidth={2} />
      </span>
      <p className="text-body-lg font-semibold text-white">{label}</p>
    </div>
  );
}

function SocialProof() {
  const nomes = ["Marcos", "Julia", "Rafael", "Camila"];
  return (
    <div className="mt-12 flex flex-wrap items-center gap-x-5 gap-y-3">
      <div className="flex -space-x-2.5">
        {nomes.map((n) => (
          <span key={n} className="rounded-full ring-2 ring-[#0A0A0A]"><Avatar nome={n} tamanho={34} /></span>
        ))}
      </div>
      <div>
        <div className="flex items-center gap-1.5">
          <div className="flex gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className="size-4 text-nx-gold" fill="#F8C84B" strokeWidth={0} />
            ))}
          </div>
          <span className="text-body-sm font-semibold text-white">4.9/5</span>
        </div>
        <p className="mt-0.5 text-body-sm text-[#A1A1AA]">
          Mais de <span className="font-semibold text-white">2.500 nutricionistas</span> já confiam na Nexvel
        </p>
      </div>
    </div>
  );
}
