import { useRef, useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { usePacienteAuth } from "../../contexts/PacienteAuthContext";
import { WelcomeSlide } from "./slides/WelcomeSlide";
import { BenefitsSlide } from "./slides/BenefitsSlide";

/**
 * Onboarding do Nexvel (mobile-first, dentro do web app/PWA existente).
 * 2 slides deslizáveis horizontalmente via scroll-snap nativo (sem libs),
 * com indicador de páginas. Boas-vindas → cadastro; login → entrar.
 */
export default function OnboardingScreen() {
  const navigate = useNavigate();
  const { token: pacienteToken, loading: authLoading } = usePacienteAuth();
  const scroller = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  // Quem já está logado não fica preso no onboarding — vai direto pra sua área.
  const nutriToken = typeof localStorage !== "undefined" ? localStorage.getItem("zena_token") : null;
  const redireciona = !authLoading && (!!pacienteToken || !!nutriToken);
  useEffect(() => {
    if (authLoading) return;
    if (pacienteToken) navigate("/paciente/feed", { replace: true });
    else if (nutriToken) navigate("/app/dashboard", { replace: true });
  }, [authLoading, pacienteToken, nutriToken, navigate]);

  const onScroll = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    setActive((prev) => (prev === i ? prev : i));
  }, []);

  const goTo = useCallback((i: number) => {
    const el = scroller.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({ left: i * el.clientWidth, behavior: reduce ? "auto" : "smooth" });
  }, []);

  const irCadastro = () => navigate("/login-paciente?tab=register");
  const irLogin = () => navigate("/login-paciente");

  // Evita flash do onboarding enquanto resolve a sessão / redireciona logado.
  if (authLoading || redireciona) return <div className="min-h-[100dvh] w-full bg-[#0A0A0A]" />;

  return (
    <div className="flex min-h-[100dvh] w-full justify-center bg-black">
      <div className="relative w-full max-w-[440px] overflow-hidden bg-[#0A0A0A]">
        <div
          ref={scroller}
          onScroll={onScroll}
          className="hide-scrollbar flex h-[100dvh] w-full snap-x snap-mandatory overflow-x-auto overflow-y-hidden"
        >
          <section
            aria-label="Boas-vindas" aria-hidden={active !== 0}
            className="h-full w-full shrink-0 snap-center snap-always overflow-y-auto"
          >
            <WelcomeSlide onStart={irCadastro} onLogin={irLogin} />
          </section>

          <section
            aria-label="Benefícios" aria-hidden={active !== 1}
            className="h-full w-full shrink-0 snap-center snap-always overflow-y-auto"
          >
            <BenefitsSlide active={active} onDot={goTo} onLogin={irLogin} onSignup={irCadastro} />
          </section>
        </div>
      </div>
    </div>
  );
}
