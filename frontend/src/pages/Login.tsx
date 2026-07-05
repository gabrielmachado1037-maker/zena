import { useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Eye, EyeOff, Stethoscope, User, Check } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import api from "../lib/api";

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.1 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 20-8 20-20 0-1.3-.1-2.3-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.1 29.5 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.3C29.2 35 26.7 36 24 36c-5.3 0-9.7-3.1-11.3-7.6l-6.5 5C9.6 39.6 16.2 44 24 44z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4 5.5l6.3 5.3C41.9 35.7 44 30.4 44 24c0-1.3-.1-2.3-.4-3.5z"/>
    </svg>
  );
}

const INPUT =
  "w-full px-4 py-3 rounded-xl border border-white/8 bg-nexvel-bg-primary text-white placeholder-white/30 focus:outline-none focus:border-nexvel-purple/60 focus:ring-1 focus:ring-nexvel-purple/40 text-sm transition-colors";
const LABEL = "text-[13px] font-medium text-white/60 mb-1.5 block";

export default function Login() {
  const [tab, setTab] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmSenha, setConfirmSenha] = useState("");
  const [nome, setNome] = useState("");
  const [crn, setCrn] = useState("");
  const [aceito, setAceito] = useState(false);
  const [showSenha, setShowSenha] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
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
    if (senha !== confirmSenha) {
      setError("As senhas não coincidem.");
      return;
    }
    if (!aceito) {
      setError("Você precisa aceitar os Termos de Uso e a Política de Privacidade.");
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
      setError(err.response?.data?.error || "Erro ao criar conta.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-nexvel-bg-primary text-white flex overflow-hidden">
      {/* glow de fundo */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, #7C3AED 0%, transparent 70%)" }} />
        <div className="absolute bottom-0 right-1/3 w-[500px] h-[500px] rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #A855F7 0%, transparent 70%)" }} />
      </div>

      {/* Painel esquerdo — branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-16 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #7C3AED 0%, #A855F7 100%)" }}>
            <span className="text-white font-extrabold text-xl leading-none">N</span>
          </div>
          <span className="text-white font-bold text-2xl tracking-wide">NEXVEL</span>
        </div>

        <div>
          <h1 className="text-white text-4xl xl:text-5xl font-bold leading-[1.1] mb-6">
            Gestão inteligente<br />
            para o seu{" "}
            <span className="bg-clip-text text-transparent" style={{ backgroundImage: "linear-gradient(135deg, #7C3AED 0%, #A855F7 100%)" }}>
              consultório.
            </span>
          </h1>
          <p className="text-white/50 text-lg leading-relaxed max-w-md">
            Gamificação, acompanhamento e motivação para você reter mais pacientes e escalar seus resultados.
          </p>
          <div className="mt-10 space-y-3.5">
            {["Ficha completa de cada paciente", "Ligas e ranking que motivam a adesão", "Relatórios inteligentes de evolução"].map((item) => (
              <div key={item} className="flex items-center gap-3 text-white/70 text-sm">
                <div className="w-5 h-5 rounded-full bg-nexvel-purple/25 flex items-center justify-center flex-shrink-0">
                  <Check size={12} className="text-nexvel-purple-light" />
                </div>
                {item}
              </div>
            ))}
          </div>
        </div>

        <p className="text-white/30 text-xs">© 2026 Nexvel. Todos os direitos reservados.</p>
      </div>

      {/* Painel direito — formulário */}
      <div className="flex-1 flex items-center justify-center p-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
          className="bg-nexvel-bg-card rounded-3xl p-8 w-full max-w-md shadow-2xl border border-white/8"
        >
          {/* logo mobile */}
          <div className="flex lg:hidden items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #7C3AED 0%, #A855F7 100%)" }}>
              <span className="text-white font-extrabold text-base">N</span>
            </div>
            <span className="text-white font-bold text-lg tracking-wide">NEXVEL</span>
          </div>

          {/* Seletor de perfil */}
          <div className="mb-5">
            <p className="text-[12px] text-white/50 font-medium mb-2.5">Quem é você?</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-2 px-3 py-3 rounded-xl border-2 border-nexvel-purple bg-nexvel-purple/10">
                <Stethoscope size={16} className="text-nexvel-purple-light flex-shrink-0" />
                <span className="text-[13px] font-semibold text-white">Nutricionista</span>
              </div>
              <Link to="/login-paciente"
                className="flex items-center gap-2 px-3 py-3 rounded-xl border-2 border-white/8 hover:border-nexvel-purple/40 transition-colors">
                <User size={16} className="text-white/40 flex-shrink-0" />
                <span className="text-[13px] font-medium text-white/50">Paciente</span>
              </Link>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-nexvel-bg-primary rounded-xl p-1 mb-6 border border-white/6">
            {(["login", "register"] as const).map((t) => (
              <button key={t} onClick={() => { setTab(t); setError(""); }}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                  tab === t ? "bg-nexvel-purple text-white shadow-sm" : "text-white/50 hover:text-white/80"
                }`}>
                {t === "login" ? "Entrar" : "Criar conta"}
              </button>
            ))}
          </div>

          {tab === "login" ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <h2 className="text-white text-2xl font-bold mb-1">Bem-vindo de volta</h2>
                <p className="text-white/40 text-sm">Entre com seu e-mail e senha para acessar.</p>
              </div>
              <div>
                <label className={LABEL}>E-mail</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="sua@email.com" className={INPUT} required />
              </div>
              <div>
                <label className={LABEL}>Senha</label>
                <div className="relative">
                  <input type={showSenha ? "text" : "password"} value={senha} onChange={(e) => setSenha(e.target.value)}
                    placeholder="••••••••" className={INPUT} required />
                  <button type="button" onClick={() => setShowSenha(!showSenha)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70">
                    {showSenha ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div className="text-right">
                <Link to="/esqueci-senha" className="text-xs text-nexvel-purple-light hover:underline">Esqueci minha senha</Link>
              </div>
              {error && <p className="text-nexvel-red text-sm bg-nexvel-red/10 px-3 py-2 rounded-lg">{error}</p>}
              <button type="submit" disabled={loading}
                className="w-full text-white py-3 rounded-xl font-semibold text-sm transition-opacity hover:opacity-90 disabled:opacity-60"
                style={{ background: "linear-gradient(135deg, #7C3AED 0%, #A855F7 100%)" }}>
                {loading ? "Entrando..." : "Entrar"}
              </button>

              <div className="flex items-center gap-3 py-1">
                <div className="h-px flex-1 bg-white/8" />
                <span className="text-white/30 text-xs">ou</span>
                <div className="h-px flex-1 bg-white/8" />
              </div>
              <button type="button" onClick={() => setInfo("Login com Google chega em breve. Use e-mail e senha por enquanto.")}
                className="w-full flex items-center justify-center gap-2.5 py-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white text-sm font-medium transition-colors">
                <GoogleIcon /> Entrar com Google
              </button>
              {info && <p className="text-white/40 text-xs text-center">{info}</p>}
              <p className="text-center text-white/40 text-sm">
                Não tem uma conta?{" "}
                <button type="button" onClick={() => { setTab("register"); setError(""); }} className="text-nexvel-purple-light font-medium hover:underline">Criar conta</button>
              </p>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <h2 className="text-white text-2xl font-bold mb-1">Criar conta</h2>
                <p className="text-white/40 text-sm">Preencha os dados para criar sua conta.</p>
              </div>
              <div>
                <label className={LABEL}>Nome completo</label>
                <input type="text" value={nome} onChange={(e) => setNome(e.target.value)}
                  placeholder="Seu nome" className={INPUT} required />
              </div>
              <div>
                <label className={LABEL}>CRN</label>
                <input type="text" value={crn} onChange={(e) => setCrn(e.target.value)}
                  placeholder="CRN-3 12345" className={INPUT} required />
              </div>
              <div>
                <label className={LABEL}>E-mail</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com" className={INPUT} required />
              </div>
              <div>
                <label className={LABEL}>Senha</label>
                <div className="relative">
                  <input type={showSenha ? "text" : "password"} value={senha} onChange={(e) => setSenha(e.target.value)}
                    placeholder="••••••••" className={INPUT} required minLength={6} />
                  <button type="button" onClick={() => setShowSenha(!showSenha)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70">
                    {showSenha ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div>
                <label className={LABEL}>Confirmar senha</label>
                <input type={showSenha ? "text" : "password"} value={confirmSenha} onChange={(e) => setConfirmSenha(e.target.value)}
                  placeholder="••••••••" className={INPUT} required minLength={6} />
              </div>
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input type="checkbox" checked={aceito} onChange={(e) => setAceito(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded accent-nexvel-purple" />
                <span className="text-white/50 text-xs leading-relaxed">
                  Eu aceito os <Link to="/termos" className="text-nexvel-purple-light hover:underline">Termos de Uso</Link> e a{" "}
                  <Link to="/privacidade" className="text-nexvel-purple-light hover:underline">Política de Privacidade</Link>
                </span>
              </label>
              {error && <p className="text-nexvel-red text-sm bg-nexvel-red/10 px-3 py-2 rounded-lg">{error}</p>}
              <button type="submit" disabled={loading}
                className="w-full text-white py-3 rounded-xl font-semibold text-sm transition-opacity hover:opacity-90 disabled:opacity-60"
                style={{ background: "linear-gradient(135deg, #7C3AED 0%, #A855F7 100%)" }}>
                {loading ? "Criando conta..." : "Criar conta"}
              </button>
              <p className="text-center text-white/40 text-sm">
                Já tem uma conta?{" "}
                <button type="button" onClick={() => { setTab("login"); setError(""); }} className="text-nexvel-purple-light font-medium hover:underline">Entrar</button>
              </p>
            </form>
          )}
        </motion.div>
      </div>
    </div>
  );
}
