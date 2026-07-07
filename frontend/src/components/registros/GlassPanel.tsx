import type { ReactNode } from "react";

// Painel de superfície sólida do Registros (glassmorphism fora — ban do DESIGN.md).
// Mantém o mousemove p/ o efeito .active-glow do radar de urgência.
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
      className={`bg-nx-surface border border-nx-border ${className}`}
    >
      {children}
    </div>
  );
}
