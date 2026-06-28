import { useState, useEffect, useRef } from "react";
import { X, Download } from "lucide-react";
import html2canvas from "html2canvas";
import { useAuth } from "../contexts/AuthContext";
import api from "../lib/api";

interface Quote {
  quote: string;
  date: string;
}

function getInitials(nome: string) {
  const parts = nome.trim().split(" ");
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function todayPtBR() {
  return new Date().toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/* ── Share modal fullscreen ───────────────────────────────── */
function ShareModal({ quote, onClose }: { quote: string; onClose: () => void }) {
  const { nutricionista } = useAuth();
  const cardRef = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);

  const nome = nutricionista?.nome ?? "";
  const crn = nutricionista?.crn ?? "";
  const foto = nutricionista?.logoConsultorio ?? null;
  const initials = getInitials(nome || "?");
  const draNome = nome ? `Dra. ${nome}` : "";

  async function handleSave() {
    const el = document.getElementById("quote-share-card");
    if (!el) return;
    setSaving(true);
    try {
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        backgroundColor: null,
        logging: false,
      });
      const link = document.createElement("a");
      link.download = `clinne-frase-${new Date().toISOString().split("T")[0]}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } finally {
      setSaving(false);
    }
  }

  // prevent body scroll while modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  return (
    <div className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center px-6">

      {/* Card instagramável — capturado pelo html2canvas */}
      <div
        id="quote-share-card"
        ref={cardRef}
        style={{
          width: 360,
          height: 360,
          background: "linear-gradient(135deg, #1C4A2E 0%, #2D6A4F 100%)",
          position: "relative",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "32px 28px 24px",
          overflow: "hidden",
          fontFamily: "system-ui, -apple-system, sans-serif",
          flexShrink: 0,
        }}
      >
        {/* Folha decorativa */}
        <svg
          style={{ position: "absolute", bottom: -10, right: -10, opacity: 0.06 }}
          width="140" height="140" viewBox="0 0 140 140" fill="none"
        >
          <path
            d="M70 10 C100 10, 130 40, 130 70 C130 100, 100 130, 70 130 C40 130, 10 100, 10 70 C10 40, 40 10, 70 10 Z M70 10 C70 50, 90 90, 130 70"
            fill="white"
          />
        </svg>

        {/* Topo */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
          {foto ? (
            <img
              src={foto}
              alt={nome}
              crossOrigin="anonymous"
              style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover", border: "3px solid white" }}
            />
          ) : (
            <div style={{
              width: 64, height: 64, borderRadius: "50%", background: "#4CAF82",
              border: "3px solid white", display: "flex", alignItems: "center",
              justifyContent: "center", color: "white", fontSize: 22, fontWeight: 600,
            }}>
              {initials}
            </div>
          )}
          <div style={{ textAlign: "center" }}>
            <p style={{ color: "white", fontSize: 15, fontWeight: 500, margin: 0 }}>{draNome}</p>
            {crn && <p style={{ color: "#9FE1CB", fontSize: 11, margin: "2px 0 0" }}>CRN {crn}</p>}
          </div>
        </div>

        {/* Meio — frase */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 12px" }}>
          <p style={{ color: "white", opacity: 0.2, fontSize: 56, lineHeight: 1, margin: "0 0 -4px", alignSelf: "flex-start" }}>"</p>
          <p style={{ color: "white", fontSize: 17, fontWeight: 300, lineHeight: 1.7, textAlign: "center", margin: 0, padding: "0 4px" }}>
            {quote}
          </p>
        </div>

        {/* Rodapé */}
        <div style={{ width: "100%", borderTop: "1px solid rgba(255,255,255,0.15)", paddingTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <p style={{ color: "white", fontSize: 11, fontWeight: 300, margin: 0 }}>clinne.com.br</p>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, margin: 0 }}>{todayPtBR()}</p>
        </div>
      </div>

      {/* Botões fora do card, sobre fundo preto */}
      <div className="flex items-center gap-8 mt-8">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 text-white text-[14px] font-normal disabled:opacity-50"
        >
          <Download size={16} />
          {saving ? "Salvando..." : "Salvar imagem"}
        </button>
        <button
          onClick={onClose}
          className="flex items-center gap-2 text-white/40 text-[14px] font-normal hover:text-white/70 transition-colors"
        >
          <X size={16} />
          Fechar
        </button>
      </div>
    </div>
  );
}

/* ── Inline quote — aparece no header do dashboard ────────── */
export function QuoteInline() {
  const [quote, setQuote] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    api.get<Quote>("/daily-quote").then((r) => setQuote(r.data.quote)).catch(() => {});
  }, []);

  if (!quote) return null;

  return (
    <>
      <div className="flex items-center gap-1.5 mt-1 max-w-full">
        <p className="text-[13px] font-light text-[#999] italic truncate flex-1 min-w-0">
          "{quote}"
        </p>
        <button
          onClick={() => setShowModal(true)}
          className="flex-shrink-0 text-[15px] leading-none opacity-60 hover:opacity-100 transition-opacity"
          title="Compartilhar frase"
        >
          📸
        </button>
      </div>
      {showModal && <ShareModal quote={quote} onClose={() => setShowModal(false)} />}
    </>
  );
}
