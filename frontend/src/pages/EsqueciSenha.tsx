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
    <div className="min-h-screen bg-nx-bg flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link to="/" className="inline-block"><img src="/nexvel-wordmark.png" alt="Nexvel" className="h-9 w-auto" /></Link>
        </div>
        <div className="bg-nx-surface rounded-2xl shadow-sm border border-nx-border p-8">
          {enviado ? (
            <div className="text-center">
              <div className="w-14 h-14 bg-nx-evo/12 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📧</span>
              </div>
              <h2 className="text-xl font-bold text-nx-on-surface mb-2">Verifique seu e-mail</h2>
              <p className="text-nx-on-surface-variant text-sm mb-6">
                Se o e-mail estiver cadastrado, você receberá um link para redefinir sua senha em breve.
              </p>
              <Link to="/login" className="text-nx-evo font-medium text-sm hover:text-nx-on-surface">
                Voltar ao login
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-bold text-nx-on-surface mb-1">Esqueceu sua senha?</h2>
              <p className="text-nx-on-surface-variant text-sm mb-6">
                Digite seu e-mail e enviaremos um link para criar uma nova senha.
              </p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-nx-on-surface mb-1">E-mail</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="sua@email.com"
                    className="w-full border border-nx-border bg-nx-container text-nx-on-surface placeholder-nx-outline rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-nx-evo"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-nx-evo text-nx-on-evo font-semibold py-3 rounded-xl hover:bg-nx-evo-2 transition-colors disabled:opacity-50"
                >
                  {loading ? "Enviando..." : "Enviar link"}
                </button>
              </form>
              <p className="text-center text-sm mt-4">
                <Link to="/login" className="text-nx-evo hover:text-nx-on-surface font-medium">
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
