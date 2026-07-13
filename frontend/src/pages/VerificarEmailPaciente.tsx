import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import apiPaciente from "../lib/apiPaciente";
import { usePacienteAuth } from "../contexts/PacienteAuthContext";

type Estado = "verificando" | "ok" | "erro";

const BG = "#09090B";
const VERDE = "#7CFF5B";

export default function VerificarEmailPaciente() {
  const token = new URLSearchParams(window.location.search).get("token") || "";
  const { paciente, updatePaciente } = usePacienteAuth();
  const [estado, setEstado] = useState<Estado>(token ? "verificando" : "erro");
  const jaRodou = useRef(false);

  useEffect(() => {
    if (!token || jaRodou.current) return;
    jaRodou.current = true; // evita 2ª chamada (StrictMode) consumir o token e falsear erro
    apiPaciente
      .post("/auth/paciente/verificar-email", { token })
      .then(() => {
        setEstado("ok");
        if (paciente) updatePaciente({ emailVerificado: true });
      })
      .catch(() => setEstado("erro"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const botao: React.CSSProperties = {
    display: "block", width: "100%", textAlign: "center", background: VERDE, color: "#08130A",
    fontWeight: 600, padding: "12px 0", borderRadius: 12, textDecoration: "none",
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center px-4" style={{ background: BG }}>
      <div className="w-full max-w-sm text-center rounded-2xl p-8" style={{ background: "#16181D", border: "1px solid #2A2F38" }}>
        {estado === "verificando" && (
          <>
            <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-4" style={{ borderColor: VERDE, borderTopColor: "transparent" }} />
            <p className="text-sm" style={{ color: "#9CA3AF" }}>Confirmando seu e-mail…</p>
          </>
        )}
        {estado === "ok" && (
          <>
            <div className="text-4xl mb-3">✅</div>
            <h2 className="text-xl font-bold mb-1" style={{ color: "#F1F5F9" }}>E-mail confirmado!</h2>
            <p className="text-sm mb-6" style={{ color: "#9CA3AF" }}>Sua conta está verificada. Tudo pronto.</p>
            <Link to={paciente ? "/paciente/dashboard" : "/login-paciente"} style={botao}>
              {paciente ? "Ir para o início" : "Entrar"}
            </Link>
          </>
        )}
        {estado === "erro" && (
          <>
            <div className="text-4xl mb-3">⚠️</div>
            <h2 className="text-xl font-bold mb-1" style={{ color: "#F1F5F9" }}>Link inválido ou expirado</h2>
            <p className="text-sm mb-6" style={{ color: "#9CA3AF" }}>
              O link pode ter expirado (validade de 24h) ou já ter sido usado. Entre no app e reenvie a confirmação.
            </p>
            <Link to="/login-paciente" style={botao}>Ir para o login</Link>
          </>
        )}
      </div>
    </div>
  );
}
