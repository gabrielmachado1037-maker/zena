import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import api from "../lib/api";

export default function EsqueciSenha() {
  const [email, setEmail] = useState("");
  const [enviado, setEnviado] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/auth/esqueci-senha", { email });
      setEnviado(true);
    } catch {
      setEnviado(true); // Always show success to not reveal if email exists
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-zena-cream flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link to="/" className="text-3xl font-bold text-zena-green-dark tracking-tight">zena</Link>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-zena-mint/30 p-8">
          {enviado ? (
            <div className="text-center">
              <div className="w-14 h-14 bg-zena-mint/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📧</span>
              </div>
              <h2 className="text-xl font-bold text-zena-green-dark mb-2">Verifique seu e-mail</h2>
              <p className="text-zena-text-mid text-sm mb-6">
                Se o e-mail estiver cadastrado, você receberá um link para redefinir sua senha em breve.
              </p>
              <Link to="/login" className="text-zena-green-mid font-medium text-sm hover:text-zena-green-dark">
                Voltar ao login
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-bold text-zena-green-dark mb-1">Esqueceu sua senha?</h2>
              <p className="text-zena-text-mid text-sm mb-6">
                Digite seu e-mail e enviaremos um link para criar uma nova senha.
              </p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zena-text-dark mb-1">E-mail</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="sua@email.com"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-zena-green-light"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-zena-green-dark text-white font-semibold py-3 rounded-xl hover:bg-zena-green-mid transition-colors disabled:opacity-50"
                >
                  {loading ? "Enviando..." : "Enviar link"}
                </button>
              </form>
              <p className="text-center text-sm mt-4">
                <Link to="/login" className="text-zena-green-mid hover:text-zena-green-dark font-medium">
                  Voltar ao login
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
