import { cn } from "../../../lib/utils";

/** Wordmark NEXVEL — "X" em verde de marca com leve glow. Reutilizável. */
export function NexvelLogo({ className = "" }: { className?: string }) {
  return (
    <span className={cn("select-none font-black leading-none tracking-tight text-white", className)}>
      NE
      <span className="text-nx-evo" style={{ textShadow: "0 0 22px rgba(124,255,91,0.55)" }}>X</span>
      VEL
    </span>
  );
}
