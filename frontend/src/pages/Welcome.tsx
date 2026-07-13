import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";

/**
 * Tela de entrada premium do Nexvel — "Sua evolução. Nosso jogo."
 * Hero cinematográfico (homem de costas, luz dramática) + partículas verdes,
 * glow volumétrico discreto e gradiente preto para leitura. Dark drench,
 * verde #7CFF5B como único acento. Estilo Apple Fitness / Whoop.
 */

const HERO_ID = "1657800187914-682b18440d50";
const heroSrc = (w: number) =>
  `https://images.unsplash.com/photo-${HERO_ID}?auto=format&fit=crop&w=${w}&q=80`;

/* Campo de partículas verdes que sobem devagar — respeita prefers-reduced-motion. */
function ParticleField({ paused }: { paused: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let w = 0;
    let h = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    type P = { x: number; y: number; r: number; vy: number; a: number; tw: number };
    let parts: P[] = [];

    const seed = () => {
      const count = Math.round((w * h) / 26000); // densidade proporcional à área
      parts = Array.from({ length: Math.max(18, Math.min(60, count)) }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 1.6 + 0.4,
        vy: Math.random() * 0.22 + 0.05,
        a: Math.random() * 0.5 + 0.15,
        tw: Math.random() * Math.PI * 2,
      }));
    };

    const resize = () => {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
    };

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      for (const p of parts) {
        p.y -= p.vy;
        p.tw += 0.02;
        if (p.y < -4) {
          p.y = h + 4;
          p.x = Math.random() * w;
        }
        const flicker = p.a * (0.6 + 0.4 * Math.sin(p.tw));
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(124,255,91,${flicker})`;
        ctx.shadowColor = "rgba(124,255,91,0.8)";
        ctx.shadowBlur = 6;
        ctx.fill();
      }
      ctx.shadowBlur = 0;
      raf = requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener("resize", resize);

    if (paused) {
      // Estado estático acessível: desenha uma vez, sem animar.
      ctx.clearRect(0, 0, w, h);
      for (const p of parts) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(124,255,91,${p.a})`;
        ctx.fill();
      }
    } else {
      raf = requestAnimationFrame(draw);
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [paused]);

  return <canvas ref={ref} className="absolute inset-0 h-full w-full" aria-hidden />;
}

export default function Welcome() {
  const navigate = useNavigate();
  const reduce = useReducedMotion();

  const container = {
    hidden: {},
    show: { transition: { staggerChildren: reduce ? 0 : 0.08, delayChildren: reduce ? 0 : 0.15 } },
  };
  const item = reduce
    ? { hidden: { opacity: 1, y: 0 }, show: { opacity: 1, y: 0 } }
    : {
        hidden: { opacity: 0, y: 16 },
        show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] as const } },
      };

  return (
    <div className="relative min-h-[100dvh] w-full overflow-hidden bg-nx-bg font-sans text-nx-on-surface">
      {/* ── Hero cinematográfico ───────────────────────────── */}
      <div className="absolute inset-0">
        <img
          src={heroSrc(1200)}
          srcSet={`${heroSrc(828)} 828w, ${heroSrc(1200)} 1200w, ${heroSrc(1600)} 1600w`}
          sizes="100vw"
          alt="Homem de costas sob luz dramática — foco, evolução e performance"
          fetchPriority="high"
          className="h-full w-full object-cover"
          style={{ objectPosition: "50% 28%" }}
        />

        {/* Marca N brilhando nas costas — luz verde, discreta e integrada à pele */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-[44%] -translate-x-1/2 -translate-y-1/2 mix-blend-screen md:top-[48%]"
        >
          {/* halo da luz emitida pela marca */}
          <span
            className="absolute left-1/2 top-1/2 h-[190%] w-[190%] -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{ background: "radial-gradient(circle, rgba(124,255,91,0.22), transparent 68%)" }}
          />
          <img
            src="/nexvel-x-512.png"
            alt=""
            aria-hidden
            className="relative block w-[clamp(2.4rem,9vw,3.4rem)]"
            style={{
              opacity: 0.62,
              filter:
                "drop-shadow(0 0 14px rgba(124,255,91,0.6)) drop-shadow(0 0 34px rgba(124,255,91,0.38))",
              transform: "skewX(-2deg)",
            }}
          />
        </div>
      </div>

      {/* Glow verde volumétrico atrás do sujeito — discreto */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 mix-blend-screen"
        style={{
          background:
            "radial-gradient(58% 42% at 50% 34%, rgba(124,255,91,0.20), rgba(124,255,91,0.05) 42%, transparent 66%)",
        }}
      />

      {/* Partículas verdes */}
      <div className="pointer-events-none absolute inset-0">
        <ParticleField paused={!!reduce} />
      </div>

      {/* Gradiente preto para leitura + vinheta topo */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(to top, #09090B 4%, rgba(9,9,11,0.92) 20%, rgba(9,9,11,0.55) 40%, rgba(9,9,11,0.12) 60%, transparent 74%), linear-gradient(to bottom, rgba(9,9,11,0.55), transparent 26%)",
        }}
      />

      {/* ── Conteúdo ────────────────────────────────────────── */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-md flex-col justify-end px-6 pb-[calc(2.5rem+env(safe-area-inset-bottom))] pt-10"
      >
        {/* Lockup da marca */}
        <motion.div variants={item} className="mb-auto flex items-center">
          <img src="/nexvel-wordmark.png" alt="Nexvel" className="block h-6 w-auto" />
        </motion.div>

        {/* Título + subtítulo */}
        <div className="mt-10">
          <motion.h1
            variants={item}
            className="text-[clamp(2.6rem,12.5vw,3.05rem)] font-extrabold leading-[1.0] tracking-[-0.035em] text-balance"
          >
            Sua evolução.
            <br />
            <span className="text-nx-on-surface">Nosso jogo.</span>
          </motion.h1>

          <motion.p
            variants={item}
            className="mt-5 max-w-[34ch] text-[17px] leading-relaxed text-nx-on-surface-variant"
          >
            Transformando hábitos em conquistas diárias.
          </motion.p>
        </div>

        {/* Ações */}
        <motion.div variants={item} className="mt-9 flex flex-col gap-3">
          <button
            onClick={() => navigate("/cadastro")}
            className="group relative w-full rounded-nx-lg bg-nx-evo py-[18px] text-[17px] font-bold text-nx-on-evo shadow-[0_10px_44px_-10px_rgba(124,255,91,0.55)] transition-all duration-300 hover:bg-nx-evo-2 hover:shadow-[0_14px_54px_-8px_rgba(124,255,91,0.7)] focus:outline-none focus-visible:ring-2 focus-visible:ring-nx-evo/70 focus-visible:ring-offset-2 focus-visible:ring-offset-nx-bg active:scale-[0.985]"
          >
            Criar conta
          </button>
          <button
            onClick={() => navigate("/login")}
            className="w-full rounded-nx-lg border border-nx-border bg-nx-surface/80 py-[18px] text-[17px] font-semibold text-nx-on-surface backdrop-blur-sm transition-colors duration-300 hover:border-nx-outline hover:bg-nx-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-nx-outline/60 focus-visible:ring-offset-2 focus-visible:ring-offset-nx-bg active:scale-[0.985]"
          >
            Entrar
          </button>
        </motion.div>

        {/* Rodapé — prova social */}
        <motion.p
          variants={item}
          className="mt-7 text-center text-[13px] leading-relaxed text-nx-on-surface-variant"
        >
          Junte-se a milhares de pessoas que evoluem todos os dias.
        </motion.p>
      </motion.div>
    </div>
  );
}
