import type { ReactNode } from "react";

// Painel de vidro do mockup Registros (bg #13131F @70% + blur + borda roxa sutil).
// Reproduz o script de micro-interação: atualiza --mouse-x/--mouse-y no mousemove.
export default function GlassPanel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        e.currentTarget.style.setProperty("--mouse-x", `${e.clientX - rect.left}px`);
        e.currentTarget.style.setProperty("--mouse-y", `${e.clientY - rect.top}px`);
      }}
      className={`bg-nx-surface/70 backdrop-blur-md border border-nx-primary-container/10 ${className}`}
    >
      {children}
    </div>
  );
}
