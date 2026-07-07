import bronze from "../../assets/leagues/bronze.png";
import prata from "../../assets/leagues/prata.png";
import ouro from "../../assets/leagues/ouro.png";
import diamante from "../../assets/leagues/diamante.png";
import mestre from "../../assets/leagues/mestre.png";
import lendario from "../../assets/leagues/lendario.png";
import { cn } from "../../lib/utils";

/**
 * Emblema oficial da liga (arte real 3D com fundo transparente).
 * Aceita o nome PT-BR (Bronze/Prata/Ouro/Diamante/Mestre/Lendário) ou a chave
 * canônica em inglês (bronze/silver/gold/diamond/master/legendary).
 */
const EMBLEMS: Record<string, string> = {
  bronze, silver: prata, prata, gold: ouro, ouro,
  diamond: diamante, diamante, master: mestre, mestre,
  legendary: lendario, lendario,
};

function normalizar(liga: string): string {
  // NFD separa o acento; manter só a-z remove acentos, espaços e pontuação.
  return liga.toLowerCase().normalize("NFD").replace(/[^a-z]/g, "");
}

export function LeagueEmblem({
  liga, size = 40, className, glow = false,
}: {
  liga: string; size?: number; className?: string; glow?: boolean;
}) {
  const src = EMBLEMS[normalizar(liga)] ?? bronze;
  return (
    <img
      src={src}
      alt={`Liga ${liga}`}
      width={size}
      height={size}
      loading="lazy"
      className={cn("object-contain", glow && "drop-shadow-[0_0_10px_rgba(124,255,91,0.25)]", className)}
      style={{ width: size, height: size }}
    />
  );
}
