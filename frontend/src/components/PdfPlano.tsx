import { useRef, useState } from "react";
import { FileDown, Loader } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Plano {
  cafeManha: string;
  lancheManha?: string;
  almoco: string;
  lancheTarde?: string;
  jantar: string;
  ceia?: string;
  observacoes?: string;
  dataCriacao: string;
}

interface Props {
  pacienteNome: string;
  nutricionistaNome: string;
  plano: Plano;
}

const refeicoes = [
  { key: "cafeManha", label: "Café da manhã", emoji: "☀️", cor: "#FFF7ED", borda: "#FED7AA" },
  { key: "lancheManha", label: "Lanche da manhã", emoji: "🍎", cor: "#F0FDF4", borda: "#BBF7D0" },
  { key: "almoco", label: "Almoço", emoji: "🥗", cor: "#F0FDF4", borda: "#86EFAC" },
  { key: "lancheTarde", label: "Lanche da tarde", emoji: "🥤", cor: "#EFF6FF", borda: "#BFDBFE" },
  { key: "jantar", label: "Jantar", emoji: "🌙", cor: "#FAF5FF", borda: "#DDD6FE" },
  { key: "ceia", label: "Ceia", emoji: "🫖", cor: "#FFF1F2", borda: "#FECDD3" },
] as const;

export default function PdfPlano({ pacienteNome, nutricionistaNome, plano }: Props) {
  const templateRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);

  async function exportar() {
    if (!templateRef.current) return;
    setLoading(true);
    try {
      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
        import("jspdf"),
        import("html2canvas"),
      ]);

      const el = templateRef.current;
      el.style.display = "block";

      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        width: 794,
      });

      el.style.display = "none";

      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const imgW = 210;
      const imgH = (canvas.height * imgW) / canvas.width;

      let posY = 0;
      while (posY < imgH) {
        if (posY > 0) pdf.addPage();
        pdf.addImage(
          canvas.toDataURL("image/jpeg", 0.92),
          "JPEG",
          0,
          -posY,
          imgW,
          imgH
        );
        posY += 297;
      }

      pdf.save(`plano-${pacienteNome.toLowerCase().replace(/\s+/g, "-")}.pdf`);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={exportar}
        disabled={loading}
        className="flex items-center gap-2 text-sm text-zena-green-mid font-medium hover:text-zena-green-dark transition-colors disabled:opacity-50"
      >
        {loading ? <Loader size={16} className="animate-spin" /> : <FileDown size={16} />}
        {loading ? "Gerando PDF..." : "Exportar PDF"}
      </button>

      {/* Hidden render template — shown only during capture */}
      <div ref={templateRef} style={{ display: "none", width: "794px", fontFamily: "Inter, sans-serif", background: "#fff" }}>
        {/* Header */}
        <div style={{ background: "#1C4A2E", padding: "32px 40px", color: "white" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: "28px", fontWeight: "bold", color: "#B7E4C7", letterSpacing: "2px" }}>clinne</div>
              <div style={{ fontSize: "12px", color: "#B7E4C7", opacity: 0.7, marginTop: "2px" }}>seu consultório. simplificado.</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "13px", color: "#B7E4C7" }}>Nutricionista</div>
              <div style={{ fontSize: "16px", fontWeight: "600", color: "white" }}>{nutricionistaNome}</div>
            </div>
          </div>
          <div style={{ marginTop: "24px", borderTop: "1px solid rgba(183,228,199,0.3)", paddingTop: "20px" }}>
            <div style={{ fontSize: "22px", fontWeight: "bold", color: "white" }}>Plano Alimentar</div>
            <div style={{ fontSize: "15px", color: "#B7E4C7", marginTop: "4px" }}>{pacienteNome}</div>
          </div>
        </div>

        {/* Date bar */}
        <div style={{ background: "#F8F9F4", padding: "12px 40px", borderBottom: "1px solid #E8EDE8" }}>
          <span style={{ fontSize: "12px", color: "#8FA897" }}>
            Gerado em {format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })} · Criado em {format(new Date(plano.dataCriacao), "dd/MM/yyyy")}
          </span>
        </div>

        {/* Refeições */}
        <div style={{ padding: "32px 40px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            {refeicoes
              .filter(({ key }) => plano[key])
              .map(({ key, label, emoji, cor, borda }) => (
                <div key={key} style={{ background: cor, border: `1px solid ${borda}`, borderRadius: "12px", padding: "16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                    <span style={{ fontSize: "20px" }}>{emoji}</span>
                    <span style={{ fontSize: "12px", fontWeight: "600", color: "#4B5563", textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</span>
                  </div>
                  <p style={{ fontSize: "13px", color: "#1C4A2E", lineHeight: "1.5", margin: 0 }}>{plano[key]}</p>
                </div>
              ))}
          </div>

          {plano.observacoes && (
            <div style={{ marginTop: "20px", background: "#F0FDF4", border: "1px solid #86EFAC", borderRadius: "12px", padding: "16px" }}>
              <div style={{ fontSize: "12px", fontWeight: "600", color: "#4B5563", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                📋 Observações gerais
              </div>
              <p style={{ fontSize: "13px", color: "#1C4A2E", lineHeight: "1.6", margin: 0 }}>{plano.observacoes}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ borderTop: "1px solid #E8EDE8", padding: "16px 40px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "11px", color: "#8FA897" }}>Gerado por <strong>Clinne</strong> · clinne.com.br</span>
          <span style={{ fontSize: "11px", color: "#8FA897" }}>Este plano é personalizado para {pacienteNome}. Não compartilhe.</span>
        </div>
      </div>
    </>
  );
}
