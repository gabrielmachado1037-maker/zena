import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight, Check, X, Menu, Star, Flame, Trophy, Target, Award, TrendingUp,
  Smartphone, Monitor, FileText, ShieldCheck, Clock, Sparkles,
  Zap, ChevronDown, ChevronRight, Users, BellRing, Home, PencilLine, BarChart3, User,
  type LucideIcon,
} from "lucide-react";
import { usePacienteAuth } from "../../contexts/PacienteAuthContext";
import { NexvelLogo } from "../onboarding/components/NexvelLogo";
import { LeagueEmblem } from "../../components/ui-nx";
import { PrimaryBtn } from "./components/shared";
import { DashboardPreview } from "./DashboardPreview";

const CADASTRO = "/cadastro";

/* ─────────────────────────── página ─────────────────────────── */
export default function NutriLanding() {
  const navigate = useNavigate();
  const { token: pacienteToken, loading: authLoading } = usePacienteAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  // Porta de entrada (/) — quem já está logado não fica na landing: vai direto pra sua área.
  const nutriToken = typeof localStorage !== "undefined" ? localStorage.getItem("zena_token") : null;
  const redireciona = !authLoading && (!!pacienteToken || !!nutriToken);
  useEffect(() => {
    if (authLoading) return;
    if (pacienteToken) navigate("/paciente/feed", { replace: true });
    else if (nutriToken) navigate("/app/dashboard", { replace: true });
  }, [authLoading, pacienteToken, nutriToken, navigate]);

  const irCadastro = () => navigate(CADASTRO);
  const irSecao = (id: string) => {
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (authLoading || redireciona) return <div className="min-h-[100dvh] w-full bg-[#080A08]" />;

  const NAV = [
    { id: "como-funciona", label: "Como funciona" },
    { id: "recursos", label: "Recursos" },
    { id: "beneficios", label: "Benefícios" },
    { id: "planos", label: "Planos" },
    { id: "faq", label: "FAQ" },
  ];

  return (
    <div className="min-h-[100dvh] w-full bg-[#080A08] text-white [scroll-behavior:smooth]">
      {/* ── Header sticky (respeita o notch via safe-area) ── */}
      <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#080A08]/85 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-3 px-5 py-3.5 lg:px-8">
          <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} aria-label="Nexvel" className="shrink-0">
            <NexvelLogo className="h-[26px]" />
          </button>
          <nav className="hidden items-center gap-7 lg:flex">
            {NAV.map((n) => (
              <button key={n.id} onClick={() => irSecao(n.id)}
                className="text-body-sm font-medium text-[#A1A1AA] transition-colors hover:text-white">
                {n.label}
              </button>
            ))}
          </nav>
          {/* ações desktop */}
          <div className="hidden items-center gap-3 lg:flex">
            <button onClick={() => navigate("/login")}
              className="text-body-sm font-medium text-[#A1A1AA] transition-colors hover:text-white">
              Entrar
            </button>
            <button onClick={() => navigate("/login-paciente")}
              className="inline-flex items-center rounded-full border border-white/15 bg-white/[0.03] px-4 py-1.5 text-body-sm font-semibold text-white transition-colors hover:border-nx-evo/50 hover:text-nx-evo">
              Sou paciente
            </button>
            <PrimaryBtn onClick={irCadastro} className="h-10 px-5 text-body-sm">Comece grátis</PrimaryBtn>
          </div>
          {/* ações mobile: "Sou paciente" (pílula) sempre visível + menu */}
          <div className="flex items-center gap-2 lg:hidden">
            <button onClick={() => navigate("/login-paciente")}
              className="inline-flex items-center rounded-full border border-white/15 bg-white/[0.03] px-3.5 py-1.5 text-body-sm font-semibold text-white transition-colors hover:border-nx-evo/50 hover:text-nx-evo active:scale-[0.98]">
              Sou paciente
            </button>
            <button onClick={() => setMenuOpen((v) => !v)} aria-label="Menu"
              className="grid size-10 place-items-center rounded-lg text-white">
              {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>
        {menuOpen && (
          <div className="border-t border-white/[0.06] bg-[#080A08] px-5 py-4 lg:hidden">
            <nav className="flex flex-col gap-1">
              {NAV.map((n) => (
                <button key={n.id} onClick={() => irSecao(n.id)}
                  className="rounded-lg px-2 py-2.5 text-left text-body-md font-medium text-[#A1A1AA] hover:bg-white/[0.04] hover:text-white">
                  {n.label}
                </button>
              ))}
              <div className="my-1 h-px bg-white/[0.06]" />
              <button onClick={() => { setMenuOpen(false); navigate("/login-paciente"); }}
                className="rounded-lg px-2 py-2.5 text-left text-body-md font-medium text-[#A1A1AA] hover:bg-white/[0.04] hover:text-white">
                Sou paciente
              </button>
              <button onClick={() => { setMenuOpen(false); navigate("/login"); }}
                className="rounded-lg px-2 py-2.5 text-left text-body-md font-medium text-[#A1A1AA] hover:bg-white/[0.04] hover:text-white">
                Entrar como nutricionista
              </button>
              <PrimaryBtn onClick={irCadastro} className="mt-2 h-12 w-full">Comece grátis</PrimaryBtn>
            </nav>
          </div>
        )}
      </header>

      <main>
        <Hero onCadastro={irCadastro} onEntrar={() => navigate("/login")} />
        <TrustBar />
        <Problema />
        <ComoFunciona />
        <Recursos />
        <Beneficios />
        <Relatorios />
        <Validacao />
        <Planos onCadastro={irCadastro} />
        <Faq />
        <CtaFinal onCadastro={irCadastro} />
      </main>

      <Footer />
    </div>
  );
}

/* ─────────────────────────── utilitários ─────────────────────────── */
function Reveal({ children, delay = 0, className = "" }: { children: ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function Section({ id, children, className = "" }: { id?: string; children: ReactNode; className?: string }) {
  return (
    <section id={id} className={`mx-auto max-w-[1200px] px-5 py-16 lg:px-8 lg:py-24 ${className}`}>
      {children}
    </section>
  );
}

function GreenGlow({ className = "" }: { className?: string }) {
  return (
    <div className={`pointer-events-none absolute -z-10 ${className}`}
      style={{ background: "radial-gradient(50% 50% at 50% 50%, rgba(124,255,91,0.14), transparent 72%)" }} />
  );
}

/* ─────────────────────────── Hero ─────────────────────────── */
function Hero({ onCadastro, onEntrar }: { onCadastro: () => void; onEntrar: () => void }) {
  return (
    <div className="relative overflow-hidden border-b border-white/[0.05]">
      <GreenGlow className="left-1/2 top-[-140px] h-[560px] w-[900px] -translate-x-1/2" />
      <div className="mx-auto grid max-w-[1200px] items-center gap-14 px-5 pb-14 pt-12 lg:grid-cols-[1fr_1.12fr] lg:gap-8 lg:px-8 lg:pb-24 lg:pt-16">
        {/* copy */}
        <Reveal className="max-w-xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-nx-evo/25 bg-nx-evo/[0.07] px-3 py-1 text-label-md font-semibold text-nx-evo">
            <Zap className="size-3.5" /> Para nutricionistas
          </span>
          <h1 className="mt-5 text-[34px] font-extrabold leading-[1.07] tracking-tight text-balance sm:text-[42px] lg:text-[50px]">
            Faça seus pacientes seguirem o plano{" "}
            <span className="text-nx-evo">com mais consistência.</span>
          </h1>
          <p className="mt-6 text-body-lg leading-relaxed text-[#B4B4BB]">
            O Nexvel aumenta a adesão ao tratamento através da gamificação. Enquanto seus pacientes
            evoluem com missões, desafios e ligas, você acompanha tudo em tempo real e chega à consulta
            sabendo exatamente quem está evoluindo e quem precisa da sua atenção.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <PrimaryBtn onClick={onCadastro} className="h-14 w-full px-8 text-body-lg sm:w-auto">
              Começar gratuitamente <ArrowRight className="size-5" />
            </PrimaryBtn>
            <button onClick={onEntrar}
              className="inline-flex h-14 w-full items-center justify-center rounded-xl border border-white/12 bg-white/[0.02] px-7 text-body-lg font-semibold text-white transition-colors hover:border-white/25 hover:bg-white/[0.05] active:scale-[0.98] sm:w-auto">
              Entrar
            </button>
          </div>
          <div className="mt-5 flex items-center gap-2 text-body-sm">
            <div className="flex gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => <Star key={i} className="size-4 text-nx-gold" fill="#F8C84B" strokeWidth={0} />)}
            </div>
            <span className="font-medium text-[#B4B4BB]">Mais adesão. Mais resultados. Mais pacientes.</span>
          </div>
        </Reveal>

        {/* visual: laptop + telefone SEMPRE lado a lado (como a referência),
            escalando como uma imagem única — a proporção nunca quebra nem empilha. */}
        <Reveal delay={0.12} className="w-full">
          <HeroVisual />
        </Reveal>
      </div>
    </div>
  );
}

/* Composição laptop + telefone que escala como UMA imagem só: mantém a proporção
   lado a lado em qualquer largura (nunca empilha nem estica o telefone). */
function HeroVisual() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const DW = 660, DH = 470;
  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const upd = () => setScale(Math.min(1, el.clientWidth / DW));
    upd();
    const ro = new ResizeObserver(upd);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={wrapRef} className="relative mx-auto w-full max-w-[600px]" style={{ height: DH * scale }}>
      <div className="absolute left-0 top-0 origin-top-left" style={{ width: DW, height: DH, transform: `scale(${scale})` }}>
        <div className="absolute left-0 top-0" style={{ width: 484 }}>
          <Laptop><DashboardPreview /></Laptop>
        </div>
        <div className="absolute bottom-0 right-0" style={{ width: 202 }}>
          <PhoneHero />
        </div>
      </div>
    </div>
  );
}

/* Moldura de laptop (tela + base) que abraça o dashboard. */
function Laptop({ children }: { children: ReactNode }) {
  return (
    <div className="relative">
      <div className="pointer-events-none absolute -inset-8 -z-10"
        style={{ background: "radial-gradient(58% 46% at 55% 12%, rgba(124,255,91,0.18), transparent 72%)" }} />
      {/* tela */}
      <div className="rounded-[16px] border border-white/[0.1] bg-[#0B0F0C] p-2 shadow-[0_30px_70px_-25px_rgba(0,0,0,0.85)]">
        {children}
      </div>
      {/* base / dobradiça */}
      <div className="mx-auto h-2.5 w-[112%] max-w-none -translate-x-[5.3%] rounded-b-[10px] border-x border-b border-white/[0.08] bg-gradient-to-b from-[#141814] to-[#0A0D0A]" />
      <div className="mx-auto h-1 w-[24%] rounded-b-lg bg-[#0A0D0A]" />
    </div>
  );
}

/* Telefone do hero — app do paciente (Liga + medições), fiel à tela real. */
function PhoneFrame({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`overflow-hidden rounded-[26px] border border-white/[0.14] bg-[#0B0F0C] p-1.5 shadow-[0_24px_55px_-12px_rgba(0,0,0,0.8)] ${className}`}>
      <div className="overflow-hidden rounded-[20px] bg-[#0A0D0A]">
        <div className="mx-auto mt-1.5 h-1 w-12 rounded-full bg-white/15" />
        {children}
      </div>
    </div>
  );
}

const MOODS: [string, string][] = [["😄", "Ótimo"], ["🙂", "Bom"], ["😐", "Neutro"], ["😕", "Difícil"], ["😣", "Péssimo"]];
const NAV_PACIENTE: [LucideIcon, string, boolean][] = [
  [Home, "Início", true], [PencilLine, "Registro", false], [Trophy, "Desafios", false], [BarChart3, "Ranking", false], [User, "Perfil", false],
];

function RingMissao({ feitas, total }: { feitas: number; total: number }) {
  const r = 15, c = 2 * Math.PI * r, off = c * (1 - feitas / total);
  return (
    <div className="relative grid size-11 shrink-0 place-items-center">
      <svg viewBox="0 0 40 40" className="size-full -rotate-90">
        <circle cx="20" cy="20" r={r} fill="none" stroke="#ffffff14" strokeWidth="4" />
        <circle cx="20" cy="20" r={r} fill="none" stroke="#7CFF5B" strokeWidth="4" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off} />
      </svg>
      <span className="absolute text-[10px] font-extrabold text-white">{feitas}<span className="text-[7px] text-[#8b8b93]">/{total}</span></span>
    </div>
  );
}

function PhoneHero() {
  return (
    <PhoneFrame>
      <div className="space-y-2 p-2.5">
        {/* header */}
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[13px] font-extrabold leading-none text-white">Olá, Lucas</p>
            <p className="mt-1 text-[8px] text-[#8b8b93]">Bora começar o dia?</p>
          </div>
          <span className="grid size-6 place-items-center rounded-full bg-nx-container text-[8px] font-bold text-white">L</span>
        </div>
        {/* humor */}
        <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-2">
          <p className="mb-1.5 text-[6px] font-bold uppercase tracking-wide text-[#8b8b93]">Como você está hoje?</p>
          <div className="grid grid-cols-5 gap-1">
            {MOODS.map(([e, l]) => (
              <div key={l} className="flex flex-col items-center gap-0.5 rounded-md border border-white/[0.06] py-1">
                <span className="text-[11px] leading-none">{e}</span>
                <span className="text-[5px] text-[#8b8b93]">{l}</span>
              </div>
            ))}
          </div>
        </div>
        {/* sequência */}
        <div className="flex items-center gap-2 rounded-xl border border-nx-streak/25 bg-nx-streak/[0.06] p-2.5">
          <Flame className="size-5 shrink-0 text-nx-streak" />
          <div className="leading-tight">
            <p className="text-[13px] font-extrabold text-white">12 <span className="text-[8px] font-semibold text-[#8b8b93]">dias de sequência</span></p>
            <p className="text-[7px] text-[#8b8b93]">Sua chama está acesa 🔥</p>
          </div>
        </div>
        {/* sua liga */}
        <div className="rounded-xl border border-nx-gold/25 bg-gradient-to-b from-nx-gold/[0.1] to-transparent p-2.5">
          <div className="flex items-center gap-2">
            <LeagueEmblem liga="Ouro" size={26} />
            <div className="leading-tight">
              <p className="text-[6px] font-bold uppercase tracking-wide text-[#8b8b93]">Sua liga</p>
              <p className="text-[11px] font-extrabold text-white">Ouro II</p>
            </div>
            <span className="ml-auto text-[12px] font-extrabold tabular-nums text-nx-gold">2.460 <span className="text-[7px] font-semibold">XP</span></span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full w-[72%] rounded-full bg-nx-gold" /></div>
          <p className="mt-1 text-[7px] text-[#8b8b93]">Faltam 340 XP pra Ouro I</p>
        </div>
        {/* missão de hoje */}
        <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-2.5">
          <div className="flex items-center gap-3">
            <RingMissao feitas={3} total={4} />
            <div className="min-w-0 flex-1">
              <p className="text-[6px] font-bold uppercase tracking-wide text-[#8b8b93]">Missão de hoje</p>
              <p className="text-[11px] font-extrabold text-white">1 missão pra fechar</p>
              <span className="mt-1 inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/[0.04] px-1.5 py-0.5 text-[6.5px] font-bold text-white"><Trophy className="size-2 text-nx-gold" /> #1 na liga</span>
            </div>
          </div>
          <button className="mt-2.5 flex w-full items-center justify-center gap-1 rounded-lg bg-nx-evo py-1.5 text-[9px] font-bold text-nx-on-evo">Continuar missões <ChevronRight className="size-3" /></button>
        </div>
      </div>
      {/* bottom nav */}
      <div className="flex items-center justify-around border-t border-white/[0.06] px-1 py-1.5">
        {NAV_PACIENTE.map(([I, l, active]) => (
          <div key={l} className={`flex flex-col items-center gap-0.5 ${active ? "text-nx-evo" : "text-[#6b6b73]"}`}>
            <I className="size-3.5" />
            <span className="text-[5px] font-medium">{l}</span>
          </div>
        ))}
      </div>
    </PhoneFrame>
  );
}

/* ─────────────────────────── Trust bar ─────────────────────────── */
function TrustBar() {
  const items = [
    { icon: Smartphone, t: "Funciona no iPhone" },
    { icon: Smartphone, t: "Funciona no Android" },
    { icon: Monitor, t: "Dashboard Web" },
    { icon: FileText, t: "Relatórios em PDF" },
    { icon: ShieldCheck, t: "Dados protegidos pela LGPD" },
  ];
  return (
    <div className="border-b border-white/[0.05] bg-[#0A0D0A]">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-center gap-x-8 gap-y-3 px-5 py-5 lg:px-8">
        {items.map((i) => (
          <div key={i.t} className="flex items-center gap-2 text-body-sm font-medium text-[#B4B4BB]">
            <i.icon className="size-4 text-nx-evo" strokeWidth={2} /> {i.t}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────── Problema ─────────────────────────── */
function Problema() {
  const cards = [
    "Você só descobre semanas depois que ele abandonou o tratamento.",
    "Vira refém do WhatsApp, cobrando paciente por paciente.",
    "Sem dados reais, você nunca sabe exatamente onde ele perdeu a consistência.",
    "Na consulta seguinte, tenta reconstruir tudo pela memória.",
  ];
  return (
    <div className="relative overflow-hidden border-b border-white/[0.05] bg-[#0A0D0A]">
      <GreenGlow className="left-[-160px] top-1/2 h-[440px] w-[560px] -translate-y-1/2 opacity-50" />
      <Section>
        <Reveal className="mx-auto max-w-3xl text-center">
          <h2 className="text-[28px] font-extrabold leading-tight tracking-tight text-balance sm:text-[36px]">
            Você monta o plano perfeito.{" "}
            <span className="text-nx-evo">O paciente desaparece depois da consulta.</span>
          </h2>
        </Reveal>

        <Reveal delay={0.05}>
          <div className="mx-auto mt-12 grid max-w-4xl gap-4 sm:grid-cols-2">
            {cards.map((c) => (
              <div key={c} className="flex items-start gap-3.5 rounded-2xl border border-white/[0.06] bg-[#0E120E] p-5">
                <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-nx-evo/10">
                  <X className="size-4 text-nx-evo/80" strokeWidth={2.5} />
                </span>
                <p className="text-body-md leading-relaxed text-[#B4B4BB]">{c}</p>
              </div>
            ))}
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <p className="mx-auto mt-10 max-w-xl text-center text-body-lg font-bold text-white sm:text-[22px]">
            Menos adesão. Menores resultados. <span className="text-nx-evo">Mais cancelamentos.</span>
          </p>
        </Reveal>
      </Section>
    </div>
  );
}

/* ─────────────────────────── Como funciona ─────────────────────────── */
function ComoFunciona() {
  const passos = [
    { n: 1, icon: Users, t: "Cadastre o paciente e envie um convite individual." },
    { n: 2, icon: Smartphone, t: "Ele instala o aplicativo e começa sua evolução com missões, XP, desafios e ligas." },
    { n: 3, icon: TrendingUp, t: "Acompanhe em tempo real quem está evoluindo e quem precisa da sua atenção." },
    { n: 4, icon: BellRing, t: "Chegue à próxima consulta com um relatório inteligente e uma visão completa da evolução do paciente." },
  ];
  return (
    <Section id="como-funciona">
      <Reveal>
        <SectionHeading
          titulo={<>O Nexvel transforma <span className="text-nx-evo">consistência em resultado.</span></>}
          sub="Através da gamificação, o paciente mantém o hábito de registrar sua evolução todos os dias. Enquanto isso, você acompanha tudo em tempo real e toma decisões baseadas em dados, não em suposições."
        />
      </Reveal>

      <Reveal delay={0.05}>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {passos.map((p) => (
            <div key={p.n} className="relative rounded-2xl border border-white/[0.06] bg-[#0E120E] p-5">
              <div className="flex items-center gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-nx-evo text-body-sm font-extrabold text-nx-on-evo">{p.n}</span>
                <p.icon className="size-5 text-nx-evo/70" />
              </div>
              <p className="mt-4 text-body-md leading-relaxed text-[#B4B4BB]">{p.t}</p>
            </div>
          ))}
        </div>
      </Reveal>
    </Section>
  );
}

function ChecklistCard({ titulo, icon: Icon, itens }: { titulo: string; icon: LucideIcon; itens: string[] }) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[#0E120E] p-6">
      <div className="mb-4 flex items-center gap-2.5">
        <span className="grid size-8 place-items-center rounded-lg bg-nx-evo/10"><Icon className="size-4 text-nx-evo" /></span>
        <h3 className="text-body-lg font-bold text-white">{titulo}</h3>
      </div>
      <ul className="grid gap-2.5 sm:grid-cols-2">
        {itens.map((i) => (
          <li key={i} className="flex items-center gap-2 text-body-sm text-[#B4B4BB]">
            <Check className="size-4 shrink-0 text-nx-evo" strokeWidth={2.5} /> {i}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ─────────────────────────── Recursos (gamificação) ─────────────────────────── */
function Recursos() {
  const tiles: { icon: LucideIcon; t: string }[] = [
    { icon: Target, t: "Missões" }, { icon: Flame, t: "Desafios" }, { icon: Zap, t: "XP" },
    { icon: Trophy, t: "Ligas" }, { icon: Award, t: "Sequências" }, { icon: TrendingUp, t: "Evolução real" },
  ];
  return (
    <div className="relative overflow-hidden border-y border-white/[0.05] bg-[#0A0D0A]">
      <GreenGlow className="right-[-120px] top-[-80px] h-[420px] w-[520px]" />
      <Section id="recursos">
        <Reveal>
          <SectionHeading
            titulo={<>Gamificação que <span className="text-nx-evo">gera resultados</span></>}
            sub="Mais do que registrar: o Nexvel transforma o acompanhamento numa jornada motivadora que aumenta a adesão e entrega resultado real."
          />
        </Reveal>

        <Reveal delay={0.05}>
          <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {tiles.map((t) => (
              <div key={t.t} className="flex flex-col items-center gap-3 rounded-2xl border border-white/[0.06] bg-[#0E120E] px-4 py-6 text-center transition-colors hover:border-nx-evo/25">
                <span className="grid size-12 place-items-center rounded-xl bg-nx-evo/10"><t.icon className="size-6 text-nx-evo" /></span>
                <span className="text-body-sm font-semibold text-white">{t.t}</span>
              </div>
            ))}
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="mt-10 grid gap-4 lg:grid-cols-3">
            <MiniLiga />
            <MiniRanking />
            <MiniEvolucao />
          </div>
        </Reveal>
      </Section>
    </div>
  );
}

function MockCard({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-[#0B0F0C] p-5">
      <p className="mb-4 text-body-sm font-bold text-white">{titulo}</p>
      {children}
    </div>
  );
}

function MiniLiga() {
  return (
    <MockCard titulo="Liga & recompensas">
      <div className="rounded-xl border border-nx-gold/25 bg-gradient-to-b from-nx-gold/[0.12] to-transparent p-4 text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-nx-gold/20"><Trophy className="size-7 text-nx-gold" /></span>
        <p className="mt-3 text-body-lg font-extrabold text-white">Liga Ouro</p>
        <p className="text-body-sm text-nx-gold">2.460 XP · 3º no ranking</p>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
          <div className="h-full w-[72%] rounded-full bg-nx-gold" />
        </div>
        <p className="mt-2 text-label-md text-[#8b8b93]">Faltam 340 XP para a Liga Diamante</p>
      </div>
    </MockCard>
  );
}

function MiniRanking() {
  const linhas = [
    { n: 1, nome: "Ana Silva", xp: "3.240", me: false },
    { n: 2, nome: "Pedro A.", xp: "2.680", me: false },
    { n: 3, nome: "Você", xp: "2.460", me: true },
    { n: 4, nome: "Carla L.", xp: "2.180", me: false },
  ];
  return (
    <MockCard titulo="Ranking entre pacientes">
      <div className="space-y-2">
        {linhas.map((l) => (
          <div key={l.n} className={`flex items-center gap-3 rounded-lg border px-3 py-2 ${l.me ? "border-nx-evo/40 bg-nx-evo/[0.08]" : "border-white/[0.06] bg-white/[0.02]"}`}>
            <span className={`text-body-sm font-extrabold ${l.n === 1 ? "text-nx-gold" : l.me ? "text-nx-evo" : "text-[#8b8b93]"}`}>{l.n}º</span>
            <span className={`text-body-sm font-semibold ${l.me ? "text-nx-evo" : "text-white"}`}>{l.nome}</span>
            <span className="ml-auto text-body-sm tabular-nums text-[#B4B4BB]">{l.xp} XP</span>
          </div>
        ))}
      </div>
    </MockCard>
  );
}

function MiniEvolucao() {
  const pct = 85, r = 46, c = 2 * Math.PI * r, off = c * (1 - pct / 100);
  return (
    <MockCard titulo="Evolução do paciente">
      <div className="flex flex-col items-center py-2">
        <div className="relative grid size-[128px] place-items-center">
          <svg viewBox="0 0 120 120" className="size-full -rotate-90">
            <circle cx="60" cy="60" r={r} fill="none" stroke="#ffffff14" strokeWidth="10" />
            <circle cx="60" cy="60" r={r} fill="none" stroke="#7CFF5B" strokeWidth="10" strokeLinecap="round"
              strokeDasharray={c} strokeDashoffset={off} />
          </svg>
          <div className="absolute text-center">
            <p className="text-[26px] font-extrabold leading-none text-white">{pct}%</p>
            <p className="text-label-md text-[#8b8b93]">adesão</p>
          </div>
        </div>
        <div className="mt-4 grid w-full grid-cols-2 gap-2 text-center">
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] py-2">
            <p className="text-body-md font-bold text-white">24/25</p>
            <p className="text-label-md text-[#8b8b93]">registros</p>
          </div>
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] py-2">
            <p className="text-body-md font-bold text-nx-evo">16 🔥</p>
            <p className="text-label-md text-[#8b8b93]">sequência</p>
          </div>
        </div>
      </div>
    </MockCard>
  );
}

/* ─────────────────────────── Benefícios ─────────────────────────── */
function Beneficios() {
  const nutri = [
    "Mais adesão ao tratamento",
    "Menos abandono entre consultas",
    "Acompanhe toda a evolução em um único painel",
    "Identifique rapidamente pacientes em risco",
    "Relatórios inteligentes prontos para cada consulta",
    "Decisões baseadas em dados reais",
  ];
  const paciente = [
    "Mais motivação para seguir o plano",
    "Missões diárias que incentivam a consistência",
    "XP, ligas e desafios que tornam a evolução visível",
    "Sensação constante de progresso",
    "Hábitos que geram resultados duradouros",
  ];
  return (
    <Section id="beneficios">
      <Reveal>
        <SectionHeading
          titulo={<>Tudo o que você precisa para <span className="text-nx-evo">aumentar a adesão dos seus pacientes.</span></>}
        />
      </Reveal>
      <Reveal delay={0.08}>
        <div className="mt-12 grid gap-4 lg:grid-cols-2">
          <ChecklistCard titulo="Para o nutricionista" icon={Monitor} itens={nutri} />
          <ChecklistCard titulo="Para o paciente" icon={Trophy} itens={paciente} />
        </div>
      </Reveal>
    </Section>
  );
}

/* ─────────────────────────── Relatórios ─────────────────────────── */
function Relatorios() {
  return (
    <div className="relative overflow-hidden border-y border-white/[0.05] bg-[#0A0D0A]">
      <Section>
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <Reveal>
            <SectionHeading
              alinhar="left"
              titulo={<>Chegue à consulta <span className="text-nx-evo">sabendo exatamente o que aconteceu.</span></>}
              sub="O Nexvel analisa automaticamente o comportamento do paciente e gera um relatório inteligente com os principais padrões do tratamento. Em poucos minutos, você identifica onde houve evolução, onde a consistência caiu e quais pontos precisam ser trabalhados na próxima consulta."
            />
            {/* selo de valor — discreto, não compete com o título */}
            <div className="mt-7 flex items-start gap-3 rounded-xl border border-nx-evo/15 bg-nx-evo/[0.04] p-4">
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-nx-evo/12">
                <Clock className="size-4 text-nx-evo" />
              </span>
              <p className="text-body-sm leading-relaxed text-[#B4B4BB]">
                Economize tempo na análise e conduza consultas com{" "}
                <span className="font-semibold text-white">decisões baseadas em dados, não em memória.</span>
              </p>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <ReportMock />
          </Reveal>
        </div>
      </Section>
    </div>
  );
}

function ReportMock() {
  const achados: { t: ReactNode; bom?: boolean }[] = [
    { t: <>Almoço ignorado <span className="font-semibold text-white">8 vezes</span> no mês</> },
    { t: <>Meta de água atingida em <span className="font-semibold text-white">17 de 30</span> dias</> },
    { t: <>Treino realizado em <span className="font-semibold text-white">21 de 30</span> dias</> },
    { t: <>Maior sequência: <span className="font-semibold text-white">16 dias</span></>, bom: true },
    { t: <>Aderência aumentou <span className="font-semibold text-nx-evo">14%</span> em relação ao mês anterior</>, bom: true },
    { t: <>Principais padrões de comportamento identificados</> },
  ];
  return (
    <div className="relative">
      <GreenGlow className="inset-0" />
      <div className="rounded-2xl border border-white/[0.08] bg-[#0E120E] p-5 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.7)]">
        {/* cabeçalho do relatório */}
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
          <div className="flex items-center gap-2">
            <FileText className="size-4 text-nx-evo" />
            <p className="text-body-sm font-bold text-white">Relatório Mensal — Ana Souza</p>
          </div>
          <span className="rounded-md bg-nx-evo/10 px-2 py-0.5 text-label-md font-semibold text-nx-evo">PDF</span>
        </div>
        {/* achados */}
        <ul className="mt-4 space-y-2.5">
          {achados.map((a, i) => (
            <li key={i} className="flex items-start gap-2.5 text-body-sm text-[#B4B4BB]">
              <span className={`mt-[7px] size-1.5 shrink-0 rounded-full ${a.bom ? "bg-nx-evo" : "bg-nx-outline"}`} />
              <span className="leading-relaxed">{a.t}</span>
            </li>
          ))}
        </ul>
        {/* resumo inteligente (parece análise por IA) */}
        <div className="mt-5 rounded-lg border border-nx-evo/15 bg-nx-evo/[0.05] p-3.5">
          <p className="flex items-center gap-1.5 text-label-md font-bold uppercase tracking-wide text-nx-evo">
            <Sparkles className="size-3.5" /> Resumo inteligente
          </p>
          <p className="mt-1.5 text-body-sm leading-relaxed text-[#B4B4BB]">
            Nas últimas duas semanas, a paciente apresentou melhora na aderência alimentar, porém
            reduziu a frequência dos treinos e apresentou maior dificuldade em manter a hidratação
            aos finais de semana.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────── Validação (honesta) ─────────────────────────── */
function Validacao() {
  const padroes = ["Refeições ignoradas", "Dias sem treino", "Hidratação insuficiente", "Queda de aderência", "Evolução do comportamento"];
  return (
    <Section>
      <Reveal>
        <div className="rounded-3xl border border-white/[0.07] bg-gradient-to-b from-[#0E120E] to-[#0A0D0A] p-8 text-center lg:p-12">
          <span className="mx-auto inline-flex items-center gap-2 rounded-full border border-nx-evo/25 bg-nx-evo/[0.07] px-3 py-1 text-label-md font-semibold text-nx-evo">
            <ShieldCheck className="size-3.5" /> Feito com nutricionistas
          </span>
          <h2 className="mx-auto mt-5 max-w-3xl text-[26px] font-extrabold leading-tight tracking-tight sm:text-[32px]">
            Criado para resolver <span className="text-nx-evo">o maior desafio da profissão:</span> a baixa adesão do paciente ao tratamento.
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-body-lg leading-relaxed text-[#B4B4BB]">
            O Nexvel foi desenvolvido em conjunto com nutricionistas para aumentar o engajamento do paciente
            através da gamificação e dar a você uma visão muito mais completa do comportamento dele. Em poucos
            minutos de análise, é possível identificar padrões como:
          </p>
          <div className="mx-auto mt-7 flex max-w-3xl flex-wrap justify-center gap-2.5">
            {padroes.map((p) => (
              <span key={p} className="rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-body-sm font-medium text-[#B4B4BB]">{p}</span>
            ))}
          </div>
        </div>
      </Reveal>
    </Section>
  );
}

/* ─────────────────────────── Planos ─────────────────────────── */
function Planos({ onCadastro }: { onCadastro: () => void }) {
  const recursos = [
    "Pacientes ilimitados", "Dashboard completo", "Gamificação completa", "Relatórios em PDF com resumo inteligente",
    "Ligas, ranking e desafios", "Notificações inteligentes", "Planos personalizados por paciente", "Suporte e atualizações",
  ];
  return (
    <div className="relative overflow-hidden border-y border-white/[0.05] bg-[#0A0D0A]">
      <GreenGlow className="left-1/2 top-[-60px] h-[420px] w-[700px] -translate-x-1/2" />
      <Section id="planos">
        <Reveal>
          <SectionHeading
            titulo={<>Um plano. <span className="text-nx-evo">Tudo incluso.</span></>}
            sub="Comece com 14 dias grátis, sem cartão. Cancele quando quiser."
          />
        </Reveal>
        <Reveal delay={0.05}>
          <div className="mx-auto mt-10 max-w-lg rounded-3xl border border-nx-evo/25 bg-gradient-to-b from-nx-evo/[0.06] to-[#0B0F0C] p-8 shadow-nx-evo">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-body-md font-semibold text-white">Nexvel Pro</p>
                <p className="text-label-md text-[#8b8b93]">Para o seu consultório</p>
              </div>
              <span className="rounded-full bg-nx-evo/12 px-3 py-1 text-label-md font-bold text-nx-evo">14 dias grátis</span>
            </div>
            <div className="mt-5 flex items-end gap-1">
              <span className="text-[46px] font-extrabold leading-none text-white">R$149</span>
              <span className="mb-1 text-body-md text-[#8b8b93]">/mês</span>
            </div>
            <p className="mt-1 text-body-sm text-[#8b8b93]">ou R$1.490/ano — <span className="text-nx-evo">2 meses grátis</span></p>

            <ul className="mt-6 grid gap-2.5">
              {recursos.map((r) => (
                <li key={r} className="flex items-center gap-2.5 text-body-sm text-[#B4B4BB]">
                  <span className="grid size-5 shrink-0 place-items-center rounded-full bg-nx-evo/15"><Check className="size-3 text-nx-evo" strokeWidth={3} /></span>
                  {r}
                </li>
              ))}
            </ul>

            <PrimaryBtn onClick={onCadastro} className="mt-7 h-14 w-full text-body-lg">
              Começar gratuitamente <ArrowRight className="size-5" />
            </PrimaryBtn>
            <p className="mt-3 text-center text-body-sm text-[#8b8b93]">Sem cartão de crédito • Cancele quando quiser</p>
          </div>
        </Reveal>
      </Section>
    </div>
  );
}

/* ─────────────────────────── FAQ ─────────────────────────── */
function Faq() {
  const itens = [
    { q: "Meu paciente vai usar mesmo?", a: "A gamificação existe justamente para aumentar o engajamento diário — missões, ligas e sequências fazem o paciente querer voltar sozinho, sem você cobrar." },
    { q: "Preciso entender de tecnologia?", a: "Não. O cadastro do paciente leva poucos minutos e o painel foi feito para ser simples e direto." },
    { q: "Funciona no iPhone e no Android?", a: "Sim, nos dois. O app roda direto no navegador do celular (pode ser instalado como aplicativo) e você tem o dashboard no computador." },
    { q: "Meus dados estão seguros?", a: "Sim. O Nexvel segue a LGPD, com dados protegidos e consentimento do paciente no cadastro." },
    { q: "Posso cancelar?", a: "Sim, quando quiser — sem multa e sem burocracia. O teste de 14 dias não pede cartão." },
  ];
  const [aberto, setAberto] = useState<number | null>(0);
  return (
    <Section id="faq">
      <Reveal>
        <SectionHeading titulo={<>Perguntas <span className="text-nx-evo">frequentes</span></>} sub="" />
      </Reveal>
      <Reveal delay={0.05}>
        <div className="mx-auto mt-10 max-w-2xl space-y-3">
          {itens.map((it, i) => {
            const on = aberto === i;
            return (
              <div key={it.q} className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0E120E]">
                <button onClick={() => setAberto(on ? null : i)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left">
                  <span className="text-body-md font-semibold text-white">{it.q}</span>
                  <ChevronDown className={`size-5 shrink-0 text-nx-evo transition-transform ${on ? "rotate-180" : ""}`} />
                </button>
                {on && <p className="px-5 pb-5 text-body-sm leading-relaxed text-[#B4B4BB]">{it.a}</p>}
              </div>
            );
          })}
        </div>
      </Reveal>
    </Section>
  );
}

/* ─────────────────────────── CTA final ─────────────────────────── */
function CtaFinal({ onCadastro }: { onCadastro: () => void }) {
  return (
    <Section>
      <Reveal>
        <div className="relative overflow-hidden rounded-3xl border border-nx-evo/20 bg-gradient-to-b from-[#0E120E] to-[#0A0D0A] p-10 text-center lg:p-16">
          <GreenGlow className="left-1/2 top-[-40px] h-[360px] w-[620px] -translate-x-1/2" />
          <h2 className="mx-auto max-w-2xl text-[28px] font-extrabold leading-tight tracking-tight sm:text-[36px]">
            Seu paciente pode estar abandonando a dieta hoje.{" "}
            <span className="text-nx-evo">Você só ainda não sabe.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-body-lg text-[#B4B4BB]">
            Comece gratuitamente, acompanhe tudo em tempo real e entregue consultas muito mais inteligentes.
          </p>
          <div className="mt-8 flex justify-center">
            <PrimaryBtn onClick={onCadastro} className="h-14 px-9 text-body-lg">
              Começar gratuitamente <ArrowRight className="size-5" />
            </PrimaryBtn>
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-body-sm text-[#8b8b93]">
            {["Sem cartão de crédito", "14 dias grátis", "Cancele quando quiser"].map((t) => (
              <span key={t} className="flex items-center gap-1.5"><Check className="size-4 text-nx-evo" strokeWidth={2.5} /> {t}</span>
            ))}
          </div>
        </div>
      </Reveal>
    </Section>
  );
}

/* ─────────────────────────── Footer ─────────────────────────── */
function Footer() {
  return (
    <footer className="border-t border-white/[0.06] bg-[#0A0D0A]">
      <div className="mx-auto flex max-w-[1200px] flex-col items-center justify-between gap-6 px-5 py-10 lg:flex-row lg:px-8">
        <NexvelLogo className="h-6" />
        <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          {[["Sou paciente", "/login-paciente"], ["Termos", "/termos"], ["Privacidade", "/privacidade"]].map(([l, href]) => (
            <a key={l} href={href} className="text-body-sm text-[#8b8b93] transition-colors hover:text-white">{l}</a>
          ))}
          <a href="mailto:contato@nexvel.tech" className="text-body-sm text-[#8b8b93] transition-colors hover:text-white">contato@nexvel.tech</a>
          <span className="inline-flex items-center gap-1.5 text-body-sm text-[#8b8b93]"><ShieldCheck className="size-4 text-nx-evo/70" /> LGPD</span>
        </nav>
      </div>
      <div className="border-t border-white/[0.05] py-5 text-center text-label-md text-[#6b6b73]">
        © {new Date().getFullYear()} Nexvel. Todos os direitos reservados.
      </div>
    </footer>
  );
}

/* ─────────────────────────── heading compartilhado ─────────────────────────── */
function SectionHeading({ titulo, sub, alinhar = "center" }: { titulo: ReactNode; sub?: ReactNode; alinhar?: "center" | "left" }) {
  const center = alinhar === "center";
  return (
    <div className={center ? "mx-auto max-w-2xl text-center" : "max-w-xl"}>
      <h2 className="text-[28px] font-extrabold leading-tight tracking-tight sm:text-[34px]">{titulo}</h2>
      {sub && <p className={`mt-4 text-body-lg leading-relaxed text-[#B4B4BB] ${center ? "mx-auto" : ""}`}>{sub}</p>}
    </div>
  );
}
