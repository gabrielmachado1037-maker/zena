import { useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Leaf, Eye, EyeOff } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import api from "../lib/api";

export default function Login() {
  const [tab, setTab] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [nome, setNome] = useState("");
  const [crn, setCrn] = useState("");
  const [showSenha, setShowSenha] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, senha);
      navigate("/app/dashboard");
    } catch {
      setError("E-mail ou senha incorretos.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.post("/auth/register", { nome, email, senha, crn });
      const { token, nutricionista } = res.data;
      localStorage.setItem("zena_token", token);
      localStorage.setItem("zena_user", JSON.stringify(nutricionista));
      api.defaults.headers.Authorization = `Bearer ${token}`;
      navigate("/app/dashboard");
    } catch (err: any) {
      setError(err.response?.data?.error || "Erro ao criar conta.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-zena-green-dark flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-16">
        <div className="flex items-center gap-3">
          <Leaf className="text-zena-mint" size={32} />
          <span className="text-white font-bold text-3xl tracking-wide">zena</span>
        </div>
        <div>
          <h1 className="text-white text-5xl font-bold leading-tight mb-6">
            seu consultório.<br />
            <span className="text-zena-green-light">simplificado.</span>
          </h1>
          <p className="text-zena-text-light text-lg leading-relaxed">
            Gerencie pacientes, acompanhe evoluções e organize suas cobranças — tudo num lugar só.
          </p>
          <div className="mt-12 space-y-4">
            {["Ficha completa de cada paciente", "Gráficos de evolução motivadores", "Cobranças sem planilha"].map((item) => (
              <div key={item} className="flex items-center gap-3 text-zena-mint text-sm">
                <div className="w-5 h-5 rounded-full bg-zena-green-light/30 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-zena-green-light" />
                </div>
                {item}
              </div>
            ))}
          </div>
        </div>
        <p className="text-zena-text-light text-xs">© 2024 Zena. Todos os direitos reservados.</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl">
          <div className="flex lg:hidden items-center gap-2 mb-8">
            <Leaf className="text-zena-green-mid" size={24} />
            <span className="text-zena-green-dark font-bold text-xl">zena</span>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-zena-cream rounded-xl p-1 mb-8">
            <button
              onClick={() => setTab("login")}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === "login" ? "bg-white text-zena-green-dark shadow-sm" : "text-zena-text-light"
              }`}
            >
              Entrar
            </button>
            <button
              onClick={() => setTab("register")}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === "register" ? "bg-white text-zena-green-dark shadow-sm" : "text-zena-text-light"
              }`}
            >
              Criar conta
            </button>
          </div>

          {tab === "login" ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <h2 className="text-zena-text-dark text-2xl font-bold mb-2">Bem-vinda de volta</h2>
              <p className="text-zena-text-light text-sm mb-6">
                Demo: <span className="font-mono text-xs bg-zena-cream px-2 py-0.5 rounded">ana@zena.app</span> / <span className="font-mono text-xs bg-zena-cream px-2 py-0.5 rounded">zena123</span>
              </p>
              <div>
                <label className="text-sm font-medium text-zena-text-mid mb-1.5 block">E-mail</label>
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
                    placeholder="••••••••"
                    className="w-full px-4 py-3 rounded-xl border border-zena-mint/50 bg-zena-cream text-zena-text-dark placeholder-zena-text-light focus:outline-none focus:ring-2 focus:ring-zena-green-light text-sm"
                    required
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
              <div className="text-right">
                <Link to="/esqueci-senha" className="text-xs text-zena-green-mid hover:text-zena-green-dark">
                  Esqueceu sua senha?
                </Link>
              </div>
              {error && <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-zena-green-mid hover:bg-zena-green-dark text-white py-3 rounded-xl font-semibold text-sm transition-all disabled:opacity-60"
              >
                {loading ? "Entrando..." : "Entrar"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <h2 className="text-zena-text-dark text-2xl font-bold mb-2">Criar sua conta</h2>
              <p className="text-zena-text-light text-sm mb-6">Primeiro mês gratuito, sem cartão.</p>
              <div>
                <label className="text-sm font-medium text-zena-text-mid mb-1.5 block">Nome completo</label>
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Dra. Ana Silva"
                  className="w-full px-4 py-3 rounded-xl border border-zena-mint/50 bg-zena-cream text-zena-text-dark placeholder-zena-text-light focus:outline-none focus:ring-2 focus:ring-zena-green-light text-sm"
                  required
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
                <label className="text-sm font-medium text-zena-text-mid mb-1.5 block">E-mail</label>
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
                <input
                  type="password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="mínimo 6 caracteres"
                  className="w-full px-4 py-3 rounded-xl border border-zena-mint/50 bg-zena-cream text-zena-text-dark placeholder-zena-text-light focus:outline-none focus:ring-2 focus:ring-zena-green-light text-sm"
                  required
                  minLength={6}
                />
              </div>
              {error && <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-zena-green-mid hover:bg-zena-green-dark text-white py-3 rounded-xl font-semibold text-sm transition-all disabled:opacity-60"
              >
                {loading ? "Criando conta..." : "Criar conta grátis"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
