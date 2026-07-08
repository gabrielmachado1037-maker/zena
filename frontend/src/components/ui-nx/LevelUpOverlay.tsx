import { useEffect, useRef, type ReactNode } from "react";
import { ButtonNx } from "./Button";
import { playCelebrationSound } from "@/lib/celebration-sound";

interface LevelUpOverlayProps {
  open: boolean;
  nivel: number;
  titulo?: string;
  descricao?: string;
  onClose: () => void;
  /** Rótulo acima do título (default "Novo nível"). Ex.: "Dia completo". */
  eyebrow?: string;
  /** Conteúdo do disco central (default = o número do nível). Ex.: 🔥 + streak. */
  bigContent?: ReactNode;
  /** Texto do botão (default "Continuar evoluindo"). */
  ctaLabel?: string;
  ariaLabel?: string;
}

const EVO_PALETTE = ["#7CFF5B", "#70F570", "#53F27C", "#F8FAFC"];

/**
 * Celebração com confete verde + pop. Serve para level-up de liga E para
 * o "dia completo" do check-in (Parte 2 — feedback de recompensa).
 * "Nenhum clique termina em silêncio" — o ápice do feedback de progresso.
 */
export function LevelUpOverlay({
  open, nivel, titulo, descricao, onClose,
  eyebrow = "Novo nível", bigContent, ctaLabel = "Continuar evoluindo", ariaLabel,
}: LevelUpOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Som de conquista — em toda celebração. Falha em silêncio se o áudio for bloqueado.
  useEffect(() => {
    if (open) playCelebrationSound();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const canvas = canvasRef.current;
    if (!canvas || reduce) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = (canvas.width = canvas.offsetWidth * dpr);
    const h = (canvas.height = canvas.offsetHeight * dpr);

    const parts = Array.from({ length: 90 }, () => ({
      x: w / 2,
      y: h * 0.42,
      vx: (Math.random() - 0.5) * 14 * dpr,
      vy: (Math.random() - 1.1) * 15 * dpr,
      size: (2 + Math.random() * 4) * dpr,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.3,
      color: EVO_PALETTE[Math.floor(Math.random() * EVO_PALETTE.length)],
      life: 1,
    }));

    let raf = 0;
    const gravity = 0.35 * dpr;
    const tick = () => {
      ctx.clearRect(0, 0, w, h);
      let alive = false;
      for (const p of parts) {
        p.vy += gravity;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        p.life -= 0.008;
        if (p.life > 0 && p.y < h + 20) {
          alive = true;
          ctx.save();
          ctx.globalAlpha = Math.max(0, p.life);
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 1.6);
          ctx.restore();
        }
      }
      if (alive) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel ?? `Você subiu para o nível ${nivel}`}
      className="fixed inset-0 z-[100] grid place-items-center bg-nx-bg/80 backdrop-blur-sm p-6"
      onClick={onClose}
    >
      <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" />
      <div
        className="nx-pop relative w-full max-w-sm rounded-nx-xl border border-nx-evo/40 bg-nx-surface p-8 text-center shadow-nx-evo-strong"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto grid size-24 place-items-center rounded-full bg-nx-evo/12 nx-evo-pulse">
          {bigContent ?? (
            <span className="text-display-lg leading-none text-nx-evo tabular-nums">{nivel}</span>
          )}
        </div>
        <p className="mt-5 text-label-md uppercase tracking-wide text-nx-evo">{eyebrow}</p>
        <h2 className="mt-1 text-headline-lg text-nx-on-surface">{titulo ?? `Nível ${nivel}`}</h2>
        {descricao && <p className="mt-2 text-body-md text-nx-on-surface-variant">{descricao}</p>}
        <ButtonNx variant="evo" block className="mt-6" onClick={onClose}>
          {ctaLabel}
        </ButtonNx>
      </div>
    </div>
  );
}
