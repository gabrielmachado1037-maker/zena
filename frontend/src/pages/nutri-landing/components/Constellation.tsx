/** Fundo decorativo: pontos/linhas verdes tipo constelação + glow. Puramente visual. */
export function Constellation({ className = "" }: { className?: string }) {
  const pts: [number, number, number][] = [
    [88, 12, 1.6], [76, 20, 1], [94, 26, 2.2], [82, 34, 1.2], [90, 44, 1.4],
    [70, 30, 1], [96, 60, 1.8], [80, 56, 1.1], [86, 70, 1.3], [72, 66, 1],
    [93, 82, 1.5], [78, 88, 1.2], [64, 48, 0.9], [60, 74, 1],
  ];
  const lines: [number, number][] = [
    [0, 2], [2, 4], [4, 6], [1, 3], [3, 5], [6, 8], [8, 10], [7, 9], [9, 13], [10, 11],
  ];
  return (
    <svg className={className} viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <radialGradient id="cg" cx="85%" cy="30%" r="60%">
          <stop offset="0%" stopColor="#7CFF5B" stopOpacity="0.14" />
          <stop offset="55%" stopColor="#7CFF5B" stopOpacity="0.03" />
          <stop offset="100%" stopColor="#7CFF5B" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect x="0" y="0" width="100" height="100" fill="url(#cg)" />
      {lines.map(([a, b], i) => (
        <line key={i} x1={pts[a][0]} y1={pts[a][1]} x2={pts[b][0]} y2={pts[b][1]}
          stroke="#7CFF5B" strokeWidth="0.15" strokeOpacity="0.25" />
      ))}
      {pts.map(([x, y, r], i) => (
        <circle key={i} cx={x} cy={y} r={r * 0.35} fill="#7CFF5B" fillOpacity={0.5 + (i % 3) * 0.15} />
      ))}
    </svg>
  );
}
