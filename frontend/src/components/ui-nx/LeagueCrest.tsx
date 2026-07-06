import { resolveLeague, type LeagueKey } from "./LeagueBadge"

/**
 * Brasão de liga — identidade visual exclusiva por liga, com escalada de ornamentos
 * (quanto mais alta a liga, mais grandioso: gema → louros → cintilância → coroa → aura).
 * Metal + iluminação + brilho varrendo. Elegante, nunca infantil.
 */

interface Palette {
  light: string
  base: string
  dark: string
  glow: string
  tier: number // 1..6 — controla os ornamentos cumulativos
}

const PALETTES: Record<LeagueKey, Palette> = {
  bronze: { light: "#F0B27A", base: "#C77B3C", dark: "#6E3B15", glow: "rgba(199,123,60,0.45)", tier: 1 },
  silver: { light: "#F4F7FB", base: "#C2C9D2", dark: "#727C89", glow: "rgba(194,201,210,0.45)", tier: 2 },
  gold: { light: "#FFE79E", base: "#F8C84B", dark: "#A9790C", glow: "rgba(248,200,75,0.5)", tier: 3 },
  diamond: { light: "#E4F8FF", base: "#8FE3FF", dark: "#2F97C6", glow: "rgba(143,227,255,0.5)", tier: 4 },
  master: { light: "#DBB1FF", base: "#A855F7", dark: "#5B1D96", glow: "rgba(168,85,247,0.5)", tier: 5 },
  legendary: { light: "#FFEBA3", base: "#F8C84B", dark: "#A9790C", glow: "rgba(248,200,75,0.6)", tier: 6 },
}

const SHIELD = "M22 28 H78 Q88 28 88 38 V64 Q88 96 50 120 Q12 96 12 64 V38 Q12 28 22 28 Z"

export function LeagueCrest({
  liga,
  size = 96,
  animated = true,
  className,
}: {
  liga: LeagueKey | string
  size?: number
  animated?: boolean
  className?: string
}) {
  const key = resolveLeague(liga)
  const p = PALETTES[key]
  const uid = `crest-${key}`

  const light = p.tier >= 4 // diamante+: cintilância
  const laurel = p.tier >= 3 // ouro+: louros
  const crown = p.tier >= 5 // mestre+: coroa
  const aura = p.tier >= 6 // lendário: aura radiante

  return (
    <span
      className={className}
      style={{
        display: "inline-block",
        width: size,
        height: size,
        lineHeight: 0,
        filter: `drop-shadow(0 3px ${p.tier >= 5 ? 12 : 7}px ${p.glow})`,
      }}
    >
      <svg viewBox="0 0 100 128" width={size} height={size} role="img" aria-label={`Brasão da liga ${key}`}>
        <defs>
          <linearGradient id={`${uid}-metal`} x1="0.15" y1="0" x2="0.85" y2="1">
            <stop offset="0" stopColor={p.light} />
            <stop offset="0.5" stopColor={p.base} />
            <stop offset="1" stopColor={p.dark} />
          </linearGradient>
          <radialGradient id={`${uid}-hi`} cx="0.5" cy="0.26" r="0.75">
            <stop offset="0" stopColor="#ffffff" stopOpacity="0.55" />
            <stop offset="0.55" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={`${uid}-sheen`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#ffffff" stopOpacity="0" />
            <stop offset="0.5" stopColor="#ffffff" stopOpacity="0.6" />
            <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
          <radialGradient id={`${uid}-aura`} cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor={p.base} stopOpacity="0.55" />
            <stop offset="1" stopColor={p.base} stopOpacity="0" />
          </radialGradient>
          <clipPath id={`${uid}-clip`}>
            <path d={SHIELD} />
          </clipPath>
        </defs>

        {/* Aura radiante (lendário) */}
        {aura && (
          <g className={animated ? "nx-crest-aura" : undefined}>
            <circle cx="50" cy="72" r="54" fill={`url(#${uid}-aura)`} />
            {Array.from({ length: 12 }).map((_, i) => (
              <rect
                key={i}
                x="49"
                y="8"
                width="2"
                height="16"
                rx="1"
                fill={p.light}
                opacity="0.5"
                transform={`rotate(${i * 30} 50 72)`}
              />
            ))}
          </g>
        )}

        {/* Coroa (mestre+) */}
        {crown && (
          <g>
            <path
              d="M28 26 L28 14 L38 20 L50 8 L62 20 L72 14 L72 26 Z"
              fill={`url(#${uid}-metal)`}
              stroke={p.dark}
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <circle cx="50" cy="12" r="2.4" fill={p.light} />
            <circle cx="30" cy="16" r="1.8" fill={p.light} />
            <circle cx="70" cy="16" r="1.8" fill={p.light} />
          </g>
        )}

        {/* Louros (ouro+) */}
        {laurel && (
          <g fill="none" stroke={p.light} strokeWidth="2" strokeLinecap="round" opacity="0.85">
            <path d="M27 104 Q15 84 24 62" />
            <path d="M73 104 Q85 84 76 62" />
            <path d="M24 70 l-6 -2 M25 80 l-7 -1 M28 90 l-7 1" />
            <path d="M76 70 l6 -2 M75 80 l7 -1 M72 90 l7 1" />
          </g>
        )}

        {/* Corpo do escudo */}
        <path d={SHIELD} fill={`url(#${uid}-metal)`} stroke={p.dark} strokeWidth="2.5" strokeLinejoin="round" />
        <path d={SHIELD} fill={`url(#${uid}-hi)`} />
        <path
          d="M26 33 H74 Q80 33 80 40 V63 Q80 90 50 110 Q20 90 20 63 V40 Q20 33 26 33 Z"
          fill="none"
          stroke={p.light}
          strokeOpacity="0.4"
          strokeWidth="1.2"
        />

        {/* Emblema — chevrons de ascensão (engravados) */}
        <g strokeLinecap="round" strokeLinejoin="round" fill="none">
          <g stroke={p.dark} strokeOpacity="0.4" strokeWidth="6">
            <path d="M35 73 L50 61 L65 73" />
            <path d="M35 62 L50 50 L65 62" />
          </g>
          <g stroke={p.light} strokeWidth="5.5">
            <path d="M35 71 L50 59 L65 71" />
            <path d="M35 60 L50 48 L65 60" />
          </g>
        </g>

        {/* Gema no topo (prata+) */}
        {p.tier >= 2 && (
          <g>
            <path d="M50 34 L56 41 L50 48 L44 41 Z" fill={p.light} stroke={p.dark} strokeWidth="1.2" strokeLinejoin="round" />
            <path d="M50 34 L53 41 L50 48 L47 41 Z" fill="#ffffff" fillOpacity="0.5" />
          </g>
        )}

        {/* Cintilância (diamante+) */}
        {light && (
          <g fill="#ffffff">
            <path d="M32 84 l1.6 4 4 1.6 -4 1.6 -1.6 4 -1.6 -4 -4 -1.6 4 -1.6 Z" opacity="0.9" />
            <path d="M70 58 l1.1 2.6 2.6 1.1 -2.6 1.1 -1.1 2.6 -1.1 -2.6 -2.6 -1.1 2.6 -1.1 Z" opacity="0.75" />
          </g>
        )}

        {/* Brilho varrendo */}
        <g clipPath={`url(#${uid}-clip)`}>
          <g className={animated ? "nx-crest-sheen" : undefined}>
            <rect x="-4" y="20" width="20" height="104" fill={`url(#${uid}-sheen)`} transform="skewX(-16)" />
          </g>
        </g>
      </svg>
    </span>
  )
}
