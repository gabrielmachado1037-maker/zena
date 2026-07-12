import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import api from "../lib/api";
import { useAuth } from "../contexts/AuthContext";

type Estado = "verificando" | "ok" | "erro";

export default function VerificarEmail() {
  const token = new URLSearchParams(window.location.search).get("token") || "";
  const { nutricionista, updateNutricionista } = useAuth();
  const [estado, setEstado] = useState<Estado>(token ? "verificando" : "erro");
  const jaRodou = useRef(false);

  useEffect(() => {
    if (!token || jaRodou.current) return;
    jaRodou.current = true; // evita 2ª chamada (StrictMode) consumir o token e falsear erro
    api
      .post("/auth/verificar-email", { token })
      .then(() => {
        setEstado("ok");
        if (nutricionista) updateNutricionista({ emailVerificado: true });
      })
      .catch(() => setEstado("erro"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <div className="min-h-screen bg-nexvel-cream flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link to="/" className="text-3xl font-bold text-nexvel-green-dark tracking-tight">zena</Link>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-nexvel-mint/30 p-8 text-center">
          {estado === "verificando" && (
            <>
              <div className="w-8 h-8 border-2 border-nexvel-green-mid border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-nexvel-text-mid text-sm">Confirmando seu e-mail…</p>
            </>
          )}
          {estado === "ok" && (
            <>
              <div className="text-4xl mb-3">✅</div>
              <h2 className="text-xl font-bold text-nexvel-green-dark mb-1">E-mail confirmado!</h2>
              <p className="text-nexvel-text-mid text-sm mb-6">Sua conta está verificada. Tudo pronto.</p>
              <Link
                to={nutricionista ? "/app/dashboard" : "/login"}
                className="block w-full bg-nexvel-green-dark text-white font-semibold py-3 rounded-xl hover:bg-nexvel-green-mid transition-colors"
              >
                {nutricionista ? "Ir para o painel" : "Entrar"}
              </Link>
            </>
          )}
          {estado === "erro" && (
            <>
              <div className="text-4xl mb-3">⚠️</div>
              <h2 className="text-xl font-bold text-nexvel-green-dark mb-1">Link inválido ou expirado</h2>
              <p className="text-nexvel-text-mid text-sm mb-6">
                O link pode ter expirado (validade de 24h) ou já ter sido usado. Faça login e reenvie a confirmação.
              </p>
              <Link
                to="/login"
                className="block w-full bg-nexvel-green-dark text-white font-semibold py-3 rounded-xl hover:bg-nexvel-green-mid transition-colors"
              >
                Ir para o login
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
