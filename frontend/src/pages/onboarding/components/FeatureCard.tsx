import type { LucideIcon } from "lucide-react";

/**
 * Card de benefício: ícone (esquerda, em quadrado arredondado verde translúcido)
 * + título em duas linhas (branco, bold) + descrição (cinza). Reutilizável.
 */
export function FeatureCard({
  icon: Icon,
  titulo,
  descricao,
}: {
  icon: LucideIcon;
  titulo: [string, string];
  descricao: string;
}) {
  return (
    <div className="flex items-start gap-4 rounded-[20px] border border-white/[0.06] bg-[#141414] p-5">
      <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-nx-evo/10">
        <Icon className="size-7 text-nx-evo" strokeWidth={2} />
      </span>
      <div className="min-w-0 pt-0.5">
        <h3 className="text-[17px] font-bold leading-tight text-white">
          {titulo[0]}<br />{titulo[1]}
        </h3>
        <p className="mt-1.5 text-body-sm leading-snug text-[#A1A1AA]">{descricao}</p>
      </div>
    </div>
  );
}
