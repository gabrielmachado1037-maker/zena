import { useState, useRef, useCallback } from "react";

interface Props {
  antes: string;
  depois: string;
  labelAntes?: string;
  labelDepois?: string;
}

export default function FotoSlider({ antes, depois, labelAntes = "INÍCIO", labelDepois = "HOJE" }: Props) {
  const [pos, setPos] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const updatePos = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const pct = Math.max(2, Math.min(98, ((clientX - rect.left) / rect.width) * 100));
    setPos(pct);
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden rounded-2xl select-none"
      style={{ aspectRatio: "3/4", cursor: "col-resize", touchAction: "none" }}
      onMouseDown={() => { isDragging.current = true; }}
      onMouseUp={() => { isDragging.current = false; }}
      onMouseLeave={() => { isDragging.current = false; }}
      onMouseMove={(e) => { if (isDragging.current) updatePos(e.clientX); }}
      onTouchStart={() => { isDragging.current = true; }}
      onTouchEnd={() => { isDragging.current = false; }}
      onTouchMove={(e) => { updatePos(e.touches[0].clientX); }}
    >
      <img src={depois} alt="depois" className="absolute inset-0 w-full h-full object-cover" draggable={false} />
      <div className="absolute bottom-3 right-3 bg-black/50 backdrop-blur-sm text-white text-xs px-2.5 py-1 rounded-full font-medium">
        {labelDepois}
      </div>

      <div className="absolute inset-0 overflow-hidden" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
        <img src={antes} alt="antes" className="absolute inset-0 w-full h-full object-cover" draggable={false} />
        <div className="absolute bottom-3 left-3 bg-black/50 backdrop-blur-sm text-white text-xs px-2.5 py-1 rounded-full font-medium">
          {labelAntes}
        </div>
      </div>

      <div className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_8px_rgba(0,0,0,0.4)] pointer-events-none" style={{ left: `${pos}%` }} />
      <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-11 h-11 bg-white rounded-full shadow-xl flex items-center justify-center pointer-events-none" style={{ left: `${pos}%` }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#A855F7" strokeWidth="2.5" strokeLinecap="round">
          <path d="M7 16l-4-4 4-4M17 8l4 4-4 4" />
        </svg>
      </div>
      <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-full pointer-events-none opacity-70">
        ← Arraste para comparar →
      </div>
    </div>
  );
}
