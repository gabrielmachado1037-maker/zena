import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../lib/api";

export default function RedefinirSenha() {
  const token = new URLSearchParams(window.location.search).get("token") || "";
  const navigate = useNavigate();
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (novaSenha !== confirmar) return setErro("As senhas não coincidem.");
    if (novaSenha.length < 6) return setErro("Senha deve ter no mínimo 6 caracteres.");
    setLoading(true);
    setErro("");
    try {
      await api.post("/auth/redefinir-senha", { token, novaSenha });
      navigate("/login?senha_redefinida=1");
    } catch {
      setErro("Link inválido ou expirado. Solicite um novo link.");
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-zena-cream flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-zena-text-mid">Link inválido.</p>
          <Link to="/esqueci-senha" className="text-zena-green-mid font-medium mt-2 block">Solicitar novo link</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zena-cream flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link to="/" className="text-3xl font-bold text-zena-green-dark tracking-tight">zena</Link>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-zena-mint/30 p-8">
          <h2 className="text-xl font-bold text-zena-green-dark mb-1">Criar nova senha</h2>
          <p className="text-zena-text-mid text-sm mb-6">Escolha uma senha segura com pelo menos 6 caracteres.</p>
          {erro && (
            <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl p-3 text-sm mb-4">{erro}</div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zena-text-dark mb-1">Nova senha</label>
              <input
                type="password"
                required
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-zena-green-light"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zena-text-dark mb-1">Confirmar senha</label>
              <input
                type="password"
                required
                value={confirmar}
                onChange={(e) => setConfirmar(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-zena-green-light"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-zena-green-dark text-white font-semibold py-3 rounded-xl hover:bg-zena-green-mid transition-colors disabled:opacity-50"
            >
              {loading ? "Salvando..." : "Salvar nova senha"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
