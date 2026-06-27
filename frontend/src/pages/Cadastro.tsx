import { useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Leaf, Eye, EyeOff, CheckCircle, ArrowLeft } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import api from "../lib/api";

const BENEFICIOS = [
  "29 dias grátis, sem cartão de crédito",
  "Pacientes ilimitadas",
  "Portal digital para cada paciente",
  "PDF profissional com 1 clique",
  "Agenda e cobranças integradas",
];

export default function Cadastro() {
  const [nome, setNome] = useState("");
  const [crn, setCrn] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [showSenha, setShowSenha] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (senha.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    setLoading(true);
    try {
      const res = await api.post("/auth/register", { nome, email, senha, crn });
      const { token, nutricionista } = res.data;
      localStorage.setItem("zena_token", token);
      localStorage.setItem("zena_user", JSON.stringify(nutricionista));
      api.defaults.headers.Authorization = `Bearer ${token}`;
      navigate("/app/dashboard");
    } catch (err: any) {
      setError(err.response?.data?.error || "Erro ao criar conta. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-zena-green-dark flex">
      {/* Painel esquerdo */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-16">
        <div className="flex items-center gap-3">
          <Leaf className="text-zena-mint" size={32} />
          <span className="text-white font-bold text-3xl tracking-wide">clinne</span>
        </div>
        <div>
          <p className="text-zena-mint/70 text-sm font-medium mb-3 uppercase tracking-widest">29 dias grátis</p>
          <h1 className="text-white text-5xl font-bold leading-tight mb-6">
            Seu consultório.<br />
            <span className="text-zena-green-light">Do jeito certo.</span>
          </h1>
          <p className="text-zena-mint/70 text-lg leading-relaxed mb-10">
            Junte-se a nutricionistas que já economizam horas toda semana com a Clinne.
          </p>
          <div className="space-y-4">
            {BENEFICIOS.map((b) => (
              <div key={b} className="flex items-center gap-3">
                <CheckCircle size={18} className="text-zena-green-light flex-shrink-0" />
                <span className="text-zena-mint text-sm">{b}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="text-zena-mint/40 text-xs">© {new Date().getFullYear()} Clinne. Todos os direitos reservados.</p>
      </div>

      {/* Painel direito */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-2 mb-6">
            <Leaf className="text-zena-green-mid" size={24} />
            <span className="text-zena-green-dark font-bold text-xl">clinne</span>
          </div>

          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs text-zena-text-light hover:text-zena-green-dark mb-6 transition-colors"
          >
            <ArrowLeft size={14} /> Voltar ao início
          </Link>

          <h2 className="text-2xl font-bold text-zena-text-dark mb-1">Criar sua conta grátis</h2>
          <p className="text-zena-text-light text-sm mb-6">
            29 dias grátis · Sem cartão · Cancele quando quiser
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-zena-text-mid mb-1.5 block">Nome completo</label>
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Dra. Ana Silva"
                className="w-full px-4 py-3 rounded-xl border border-zena-mint/50 bg-zena-cream text-zena-text-dark placeholder-zena-text-light focus:outline-none focus:ring-2 focus:ring-zena-green-light text-sm"
                required
                autoFocus
              />
            </div>
            <div>
              <label className="text-sm font-medium text-zena-text-mid mb-1.5 block">CRN</label>
              <input
                type="text"
                value={crn}
                onChange={(e) => setCrn(e.target.value)}
                placeholder="CRN-3 12345"
                className="w-full px-4 py-3 rounded-xl border border-zena-mint/50 bg-zena-cream text-zena-text-dark placeholder-zena-text-light focus:outline-none focus:ring-2 focus:ring-zena-green-light text-sm"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium text-zena-text-mid mb-1.5 block">E-mail profissional</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="sua@email.com"
                className="w-full px-4 py-3 rounded-xl border border-zena-mint/50 bg-zena-cream text-zena-text-dark placeholder-zena-text-light focus:outline-none focus:ring-2 focus:ring-zena-green-light text-sm"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium text-zena-text-mid mb-1.5 block">Senha</label>
              <div className="relative">
                <input
                  type={showSenha ? "text" : "password"}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="mínimo 6 caracteres"
                  className="w-full px-4 py-3 rounded-xl border border-zena-mint/50 bg-zena-cream text-zena-text-dark placeholder-zena-text-light focus:outline-none focus:ring-2 focus:ring-zena-green-light text-sm"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowSenha(!showSenha)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zena-text-light hover:text-zena-text-mid"
                >
                  {showSenha ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-zena-green-dark hover:bg-zena-green-mid text-white py-3 rounded-xl font-semibold text-sm transition-all disabled:opacity-60 mt-2"
            >
              {loading ? "Criando conta..." : "Criar conta grátis →"}
            </button>
          </form>

          <p className="text-center text-xs text-zena-text-light mt-6">
            Já tem conta?{" "}
            <Link to="/login" className="text-zena-green-mid hover:text-zena-green-dark font-medium">
              Entrar
            </Link>
          </p>

          <p className="text-center text-xs text-zena-text-light/60 mt-4 leading-relaxed">
            Ao criar uma conta você concorda com nossos{" "}
            <Link to="/termos" className="underline hover:text-zena-green-dark">Termos de Uso</Link>
            {" "}e{" "}
            <Link to="/privacidade" className="underline hover:text-zena-green-dark">Política de Privacidade</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}
