import { useState } from "react";

// Paleta neutra/verde-tinta (sem roxo) para iniciais — coerente com o tema Nexvel.
const COLORS = [
  "#2F6F4F", "#3B8C6E", "#40916C", "#1D6F5C",
  "#5A7A52", "#2E7D5B", "#B45309", "#D97706",
  "#0E7490", "#0369A1",
];

function avatarColor(nome: string): string {
  let hash = 0;
  for (let i = 0; i < nome.length; i++) hash = nome.charCodeAt(i) + ((hash << 5) - hash);
  return COLORS[Math.abs(hash) % COLORS.length];
}

function initials(nome: string): string {
  return nome
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

interface AvatarProps {
  src?: string | null;
  nome: string;
  tamanho: number;
  borda?: string;
  className?: string;
}

export default function Avatar({ src, nome, tamanho, borda, className = "" }: AvatarProps) {
  const [imgError, setImgError] = useState(false);

  const base: React.CSSProperties = {
    width: tamanho,
    height: tamanho,
    minWidth: tamanho,
    borderRadius: "50%",
    overflow: "hidden",
    flexShrink: 0,
    border: borda,
  };

  if (src && !imgError) {
    return (
      <img
        src={src}
        alt={nome}
        className={className}
        style={{ ...base, objectFit: "cover" }}
        onError={() => setImgError(true)}
        loading="lazy"
      />
    );
  }

  return (
    <div
      className={`flex items-center justify-center ${className}`}
      style={{ ...base, background: avatarColor(nome) }}
    >
      <span
        style={{
          color: "#fff",
          fontWeight: 700,
          fontSize: Math.round(tamanho * 0.36),
          lineHeight: 1,
          userSelect: "none",
        }}
      >
        {initials(nome)}
      </span>
    </div>
  );
}
