import { useLocation } from "react-router-dom";
import { Construction } from "lucide-react";

const TITULOS: Record<string, string> = {
  "/app/desafios": "Desafios",
  "/app/comunidade": "Comunidade",
  "/app/mensagens": "Mensagens",
  "/app/relatorios": "Relatórios",
};

export default function EmBreve() {
  const { pathname } = useLocation();
  const titulo = TITULOS[pathname] ?? "Em breve";

  return (
    <div style={{ background: "#0D0D1A", minHeight: "100vh", padding: "24px 28px", color: "#FFFFFF" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>{titulo}</h1>
      <p style={{ fontSize: 14, color: "#94A3B8", margin: "4px 0 0" }}>
        Esta seção está em construção.
      </p>

      <div style={{
        marginTop: 40,
        background: "#13131F",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 12,
        padding: "56px 24px",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 16, textAlign: "center",
      }}>
        <div style={{
          width: 64, height: 64, borderRadius: 16,
          background: "rgba(124,58,237,0.15)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Construction size={30} color="#8B5CF6" />
        </div>
        <p style={{ fontSize: 16, fontWeight: 600, color: "#FFFFFF", margin: 0 }}>
          {titulo} chega em breve
        </p>
        <p style={{ fontSize: 13, color: "#475569", margin: 0, maxWidth: 360 }}>
          Estamos construindo esta funcionalidade seguindo o mesmo padrão do Nexvel. Fique de olho nas próximas atualizações.
        </p>
      </div>
    </div>
  );
}
