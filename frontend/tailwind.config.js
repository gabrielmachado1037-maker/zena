/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        "nexvel-green-dark": "#7C3AED",
        "nexvel-green-mid": "#A855F7",
        "nexvel-green-light": "#A855F7",
        "nexvel-mint": "#A855F7",
        "nexvel-surface": "#1A1A2E",
        "nexvel-cream": "#1A1A2E",
        "nexvel-sand": "#16213E",
        "nexvel-brown": "#F59E0B",
        "nexvel-white": "#16213E",
        "nexvel-text-dark": "#F1F5F9",
        "nexvel-text-mid": "#94A3B8",
        "nexvel-text-light": "#475569",
        "nexvel-bg-primary": "#0F0F1A",
        "nexvel-bg-secondary": "#1A1A2E",
        "nexvel-bg-card": "#16213E",
        "nexvel-bg-elevated": "#1F2B47",
        "nexvel-purple": "#7C3AED",
        "nexvel-purple-light": "#A855F7",
        "nexvel-gold": "#F59E0B",
        "nexvel-green": "#10B981",
        "nexvel-red": "#EF4444",
        "nexvel-blue": "#3B82F6",
        "nexvel-text-primary": "#F1F5F9",
        "nexvel-text-secondary": "#94A3B8",
        "nexvel-text-muted": "#475569",

        /* Tokens do dashboard v0 (Nexvel) — oklch com suporte a opacidade */
        background: "oklch(0.16 0.02 280 / <alpha-value>)",
        foreground: "oklch(0.97 0.005 280 / <alpha-value>)",
        card: "oklch(0.2 0.02 280 / <alpha-value>)",
        "card-foreground": "oklch(0.97 0.005 280 / <alpha-value>)",
        popover: "oklch(0.2 0.02 280 / <alpha-value>)",
        "popover-foreground": "oklch(0.97 0.005 280 / <alpha-value>)",
        primary: "oklch(0.53 0.24 292 / <alpha-value>)",
        "primary-foreground": "oklch(0.98 0.005 280 / <alpha-value>)",
        secondary: "oklch(0.26 0.02 280 / <alpha-value>)",
        "secondary-foreground": "oklch(0.97 0.005 280 / <alpha-value>)",
        muted: "oklch(0.24 0.02 280 / <alpha-value>)",
        "muted-foreground": "oklch(0.68 0.02 280 / <alpha-value>)",
        accent: "oklch(0.28 0.03 292 / <alpha-value>)",
        "accent-foreground": "oklch(0.97 0.005 280 / <alpha-value>)",
        destructive: "oklch(0.62 0.23 25 / <alpha-value>)",
        border: "oklch(0.22 0.02 280 / <alpha-value>)",
        input: "oklch(0.24 0.02 280 / <alpha-value>)",
        ring: "oklch(0.53 0.24 292 / <alpha-value>)",
        "chart-1": "oklch(0.53 0.24 292 / <alpha-value>)",
        "chart-2": "oklch(0.77 0.16 75 / <alpha-value>)",
        "chart-3": "oklch(0.72 0.18 152 / <alpha-value>)",
        "chart-4": "oklch(0.62 0.23 25 / <alpha-value>)",
        "chart-5": "oklch(0.62 0.17 240 / <alpha-value>)",
        sidebar: "oklch(0.18 0.02 280 / <alpha-value>)",
        "sidebar-foreground": "oklch(0.85 0.01 280 / <alpha-value>)",
        "sidebar-primary": "oklch(0.53 0.24 292 / <alpha-value>)",
        "sidebar-primary-foreground": "oklch(0.98 0.005 280 / <alpha-value>)",
        "sidebar-accent": "oklch(0.26 0.03 292 / <alpha-value>)",
        "sidebar-accent-foreground": "oklch(0.97 0.005 280 / <alpha-value>)",
        "sidebar-border": "oklch(0.2 0.02 280 / <alpha-value>)",
        "sidebar-ring": "oklch(0.53 0.24 292 / <alpha-value>)",
        gold: "oklch(0.77 0.16 75 / <alpha-value>)",
        green: "oklch(0.72 0.18 152 / <alpha-value>)",
        blue: "oklch(0.62 0.17 240 / <alpha-value>)",
        success: "oklch(0.72 0.18 152 / <alpha-value>)",
        warning: "oklch(0.8 0.16 85 / <alpha-value>)",
        danger: "oklch(0.62 0.23 25 / <alpha-value>)",

        /* ══ Nexvel DS v0.2 — direção VERDE (evolução). Roxo → só marca. ══ */

        /* Fundações — grafite frio (shell de-purplezado; mudanças imperceptíveis/seguras) */
        "nx-bg": "#09090B",
        "nx-bg-lowest": "#09090B",
        "nx-surface": "#111318",
        "nx-surface-hover": "#171A22",
        "nx-elevated": "#171A22",
        "nx-container": "#1C212B",
        "nx-container-low": "#14171E",
        "nx-container-high": "#232A35",
        "nx-on-surface": "#F8FAFC",         /* texto principal (neutro, não mais lilás) */
        "nx-on-surface-variant": "#9CA3AF", /* texto secundário */
        "nx-outline": "#6B7280",            /* rótulos / hints */
        "nx-outline-variant": "#2A2F38",    /* bordas sutis */
        "nx-border": "#2A2F38",

        /* Evolução — a cor principal do app (verde) */
        "nx-evo": "#7CFF5B",
        "nx-evo-2": "#70F570",
        "nx-on-evo": "#08130A",             /* texto escuro sobre verde */
        "nx-success": "#53F27C",

        /* Funcionais — uma cor, uma função */
        "nx-water": "#49A8FF",              /* hidratação / recuperação */
        "nx-streak": "#FF8A1F",             /* sequência */
        "nx-gold": "#F8C84B",               /* conquista / Liga Ouro */
        "nx-sleep": "#8B7DFF",              /* sono / descanso */
        "nx-warn": "#FFD34D",               /* atenção */
        "nx-danger": "#FF5D5D",             /* risco / erro */
        "nx-brand": "#7C3AED",              /* marca, institucional, Liga Mestre */

        /* Legado roxo — migração tela a tela; remover ao final da migração */
        "nx-primary": "#d2bbff",
        "nx-primary-container": "#7c3aed",
        "nx-on-primary": "#3f008e",
        "nx-on-primary-container": "#ede0ff",
        "nx-secondary": "#ffb95f",
        "nx-secondary-container": "#ee9800",
        "nx-tertiary": "#4edea3",
        "nx-tertiary-container": "#007650",
        "nx-error": "#ffb4ab",
        "nx-error-container": "#93000a",

        /* Ligas — assinatura de cor por liga */
        "league-bronze": "#C77B3C",
        "league-silver": "#C2C9D2",
        "league-gold": "#F8C84B",
        "league-diamond": "#8FE3FF",
        "league-master": "#A855F7",
        "league-legendary": "#F8C84B",
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        mono: ["Inter", "monospace"],
      },
      fontSize: {
        "display-lg": ["48px", { lineHeight: "56px", letterSpacing: "-0.02em", fontWeight: "800" }],
        "headline-lg": ["32px", { lineHeight: "40px", letterSpacing: "-0.01em", fontWeight: "700" }],
        "headline-md": ["24px", { lineHeight: "32px", fontWeight: "600" }],
        "body-lg": ["18px", { lineHeight: "28px" }],
        "body-md": ["16px", { lineHeight: "24px" }],
        "body-sm": ["14px", { lineHeight: "20px", fontWeight: "300" }],
        "label-md": ["12px", { lineHeight: "16px", letterSpacing: "0.05em", fontWeight: "600" }],
        "label-sm": ["10px", { lineHeight: "12px", letterSpacing: "0.05em", fontWeight: "700" }],
      },
      boxShadow: {
        "nx-glow": "0 0 24px rgba(124,58,237,0.20)",
        "nx-glow-strong": "0 0 32px rgba(124,58,237,0.35)",
        /* Evolução — brilho verde para primários/celebrações */
        "nx-evo": "0 0 24px rgba(124,255,91,0.22)",
        "nx-evo-strong": "0 0 40px rgba(124,255,91,0.40)",
        "nx-card": "0 1px 2px rgba(0,0,0,0.4), 0 8px 24px rgba(0,0,0,0.25)",
      },
      borderRadius: {
        "nx-sm": "10px",
        "nx-md": "14px",
        "nx-lg": "20px",
        "nx-xl": "28px",
      },
      keyframes: {
        "nx-pop": {
          "0%": { transform: "scale(0.6)", opacity: "0" },
          "60%": { transform: "scale(1.08)", opacity: "1" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        "nx-rise": {
          "0%": { transform: "translateY(6px)", opacity: "0" },
          "20%": { opacity: "1" },
          "100%": { transform: "translateY(-22px)", opacity: "0" },
        },
        "nx-evo-pulse": {
          "0%,100%": { boxShadow: "0 0 0 0 rgba(124,255,91,0.35)" },
          "50%": { boxShadow: "0 0 0 10px rgba(124,255,91,0)" },
        },
        "nx-sheen": {
          "0%": { backgroundPosition: "-160% 0" },
          "100%": { backgroundPosition: "260% 0" },
        },
      },
      animation: {
        "nx-pop": "nx-pop 0.4s cubic-bezier(0.34,1.56,0.64,1) both",
        "nx-rise": "nx-rise 1.1s ease-out forwards",
        "nx-evo-pulse": "nx-evo-pulse 2s ease-in-out infinite",
        "nx-sheen": "nx-sheen 2.2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
