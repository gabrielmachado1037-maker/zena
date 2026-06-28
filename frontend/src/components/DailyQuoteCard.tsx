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

/* ── Share modal ─────────────────────────────────────────── */
function ShareModal({ quote, onClose }: { quote: string; onClose: () => void }) {
  const { nutricionista } = useAuth();
  const cardRef = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);

  const nome = nutricionista?.nome ?? "";
  const crn = nutricionista?.crn ?? "";
  const foto = nutricionista?.logoConsultorio ?? null;
  const initials = getInitials(nome);
  const draNome = nome ? `Dra. ${nome}` : "Dra.";

  async function handleSave() {
    if (!cardRef.current) return;
    setSaving(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
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

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl overflow-hidden shadow-2xl max-w-sm w-full"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Card instagramável 1:1 */}
        <div
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
          }}
        >
          {/* Folha decorativa SVG */}
          <svg
            style={{ position: "absolute", bottom: -10, right: -10, opacity: 0.06 }}
            width="140"
            height="140"
            viewBox="0 0 140 140"
            fill="none"
          >
            <path
              d="M70 10 C100 10, 130 40, 130 70 C130 100, 100 130, 70 130 C40 130, 10 100, 10 70 C10 40, 40 10, 70 10 Z M70 10 C70 50, 90 90, 130 70"
              fill="white"
            />
          </svg>

          {/* Topo — avatar + nome + crn */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            {foto ? (
              <img
                src={foto}
                alt={nome}
                crossOrigin="anonymous"
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: "50%",
                  objectFit: "cover",
                  border: "3px solid white",
                }}
              />
            ) : (
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: "50%",
                  background: "#4CAF82",
                  border: "3px solid white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  fontSize: 22,
                  fontWeight: 600,
                }}
              >
                {initials}
              </div>
            )}
            <div style={{ textAlign: "center" }}>
              <p style={{ color: "white", fontSize: 15, fontWeight: 500, margin: 0 }}>{draNome}</p>
              {crn && (
                <p style={{ color: "#9FE1CB", fontSize: 11, margin: "2px 0 0" }}>CRN {crn}</p>
              )}
            </div>
          </div>

          {/* Meio — aspas + frase */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 8px" }}>
            <p style={{ color: "white", opacity: 0.2, fontSize: 56, lineHeight: 1, margin: "0 0 -8px", alignSelf: "flex-start" }}>"</p>
            <p
              style={{
                color: "white",
                fontSize: 17,
                fontWeight: 300,
                lineHeight: 1.65,
                textAlign: "center",
                margin: 0,
              }}
            >
              {quote}
            </p>
          </div>

          {/* Rodapé */}
          <div
            style={{
              width: "100%",
              borderTop: "1px solid rgba(255,255,255,0.15)",
              paddingTop: 12,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <p style={{ color: "white", fontSize: 11, fontWeight: 300, margin: 0 }}>clinne.com.br</p>
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, margin: 0 }}>{todayPtBR()}</p>
          </div>
        </div>

        {/* Botões */}
        <div className="flex gap-3 p-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 bg-[#1C4A2E] text-white text-[13px] font-medium py-2.5 rounded-xl hover:bg-[#2D6A4F] transition-colors disabled:opacity-60"
          >
            <Download size={14} />
            {saving ? "Salvando..." : "Salvar imagem"}
          </button>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-[#F5F5F3] text-[#666] hover:bg-[#E8E8E6] transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Desktop card ─────────────────────────────────────────── */
export function DailyQuoteDesktop() {
  const [quote, setQuote] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    api.get<Quote>("/daily-quote").then((r) => setQuote(r.data.quote)).catch(() => {});
  }, []);

  if (!quote) return null;

  return (
    <>
      <div
        className="rounded-2xl mb-6 flex items-center gap-6"
        style={{
          background: "linear-gradient(135deg, #1C4A2E 0%, #2D6A4F 100%)",
          padding: "28px 32px",
        }}
      >
        <div className="flex-1 min-w-0">
          <span className="text-white/20 text-[48px] leading-none block -mb-2">"</span>
          <p className="text-white text-[18px] font-light leading-relaxed">{quote}</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex-shrink-0 bg-white text-[#1C4A2E] text-[13px] font-medium px-5 py-2.5 rounded-lg hover:bg-white/90 transition-colors whitespace-nowrap"
        >
          Compartilhar
        </button>
      </div>
      {showModal && <ShareModal quote={quote} onClose={() => setShowModal(false)} />}
    </>
  );
}

/* ── Mobile card ──────────────────────────────────────────── */
export function DailyQuoteMobile() {
  const [quote, setQuote] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    api.get<Quote>("/daily-quote").then((r) => setQuote(r.data.quote)).catch(() => {});
  }, []);

  if (!quote) return null;

  return (
    <>
      <div
        className="rounded-2xl mx-4 mb-4"
        style={{
          background: "linear-gradient(135deg, #1C4A2E 0%, #2D6A4F 100%)",
          padding: "20px",
        }}
      >
        <span className="text-white/20 text-[40px] leading-none block -mb-1">"</span>
        <p className="text-white text-[16px] font-light leading-relaxed text-center mb-4">{quote}</p>
        <button
          onClick={() => setShowModal(true)}
          className="w-full bg-white text-[#1C4A2E] text-[13px] font-medium py-2.5 rounded-lg hover:bg-white/90 transition-colors"
        >
          Compartilhar
        </button>
      </div>
      {showModal && <ShareModal quote={quote} onClose={() => setShowModal(false)} />}
    </>
  );
}
