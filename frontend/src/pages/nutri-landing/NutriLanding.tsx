import { useNavigate, Link } from "react-router-dom";
import { BarChart3, Trophy, Users, ShieldCheck, Star, ArrowRight, type LucideIcon } from "lucide-react";
import Avatar from "../../components/Avatar";
import { ProLogo, PrimaryBtn } from "./components/shared";
import { DashboardPreview } from "./DashboardPreview";

const BENEFICIOS = [
  { icon: BarChart3, titulo: "Acompanhe tudo em tempo real", desc: "Veja aderência, hábitos, evolução e insights importantes de cada paciente." },
  { icon: Trophy, titulo: "Gamificação que gera resultados", desc: "Ligas, desafios e recompensas que impulsionam consistência e motivação." },
  { icon: Users, titulo: "Comunicação que aproxima", desc: "Envie mensagens, oriente e mantenha seus pacientes sempre engajados." },
  { icon: ShieldCheck, titulo: "Segurança e privacidade", desc: "Dados protegidos com tecnologia avançada e total privacidade." },
];

/** TELA 1 — Landing / entrada da área do nutricionista (NEXVEL NUTRITION PRO). */
export default function NutriLanding() {
  const navigate = useNavigate();
  return (
    <div className="relative min-h-[100dvh] w-full overflow-hidden bg-[#0A0A0A] text-white">
      {/* glow verde no topo */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[420px]"
        style={{ background: "radial-gradient(60% 100% at 72% 0%, rgba(124,255,91,0.12), transparent 70%)" }} />

      <div className="relative mx-auto max-w-[1440px] px-6 py-10 lg:px-12">
        <header className="mb-10"><ProLogo /></header>

        <div className="grid items-start gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Coluna esquerda */}
          <div className="max-w-xl">
            <h1 className="text-[40px] font-extrabold leading-[1.08] tracking-tight text-white text-balance lg:text-[46px]">
              A evolução dos seus pacientes, em um <span className="text-nx-evo">novo nível.</span>
            </h1>
            <p className="mt-5 max-w-lg text-body-lg leading-relaxed text-[#A1A1AA]">
              A plataforma completa para nutricionistas que querem acompanhar, gamificar e gerar resultados reais na vida dos seus pacientes.
            </p>

            <div className="mt-9 space-y-6">
              {BENEFICIOS.map((b) => <Feature key={b.titulo} {...b} />)}
            </div>

            <SocialProof />
          </div>

          {/* Coluna direita — preview do dashboard */}
          <div className="lg:pt-2">
            <DashboardPreview />
          </div>
        </div>

        {/* CTA central */}
        <div className="mt-14 flex flex-col items-center gap-4">
          <PrimaryBtn onClick={() => navigate("/login")} className="h-14 px-10 text-body-lg">
            Entrar na plataforma <ArrowRight className="size-5" />
          </PrimaryBtn>
          <p className="text-body-md text-[#A1A1AA]">
            Já tem uma conta?{" "}
            <Link to="/login" className="font-bold text-nx-evo hover:text-nx-evo-2">Entrar</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function Feature({ icon: Icon, titulo, desc }: { icon: LucideIcon; titulo: string; desc: string }) {
  return (
    <div className="flex items-start gap-4">
      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-nx-evo/10">
        <Icon className="size-5 text-nx-evo" strokeWidth={2} />
      </span>
      <div>
        <h3 className="text-body-lg font-bold text-white">{titulo}</h3>
        <p className="mt-1 max-w-md text-body-md leading-snug text-[#A1A1AA]">{desc}</p>
      </div>
    </div>
  );
}

function SocialProof() {
  const nomes = ["Marcos", "Julia", "Rafael", "Camila"];
  return (
    <div className="mt-10 rounded-2xl border border-white/[0.06] bg-[#111311] p-5">
      <p className="text-body-md text-[#A1A1AA]">
        Mais de <span className="font-bold text-white">2.500 nutricionistas</span> já confiam na Nexvel
      </p>
      <div className="mt-4 flex items-center gap-4">
        <div className="flex -space-x-2.5">
          {nomes.map((n) => (
            <span key={n} className="rounded-full ring-2 ring-[#111311]"><Avatar nome={n} tamanho={34} /></span>
          ))}
        </div>
        <div>
          <div className="flex gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className="size-4 text-nx-gold" fill="#F8C84B" strokeWidth={0} />
            ))}
          </div>
          <p className="mt-0.5 text-body-sm text-[#A1A1AA]"><span className="font-semibold text-white">4.9/5</span> na avaliação dos nutricionistas</p>
        </div>
      </div>
    </div>
  );
}
