import { useState, type FormEvent } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { Leaf, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { usePacienteAuth } from "../contexts/PacienteAuthContext";

export default function LoginPaciente() {
  const [sp] = useSearchParams();
  const [tab, setTab] = useState<"login" | "register">(sp.get("tab") === "register" ? "register" : "login");
  const [email, setEmail]   = useState("");
  const [senha, setSenha]   = useState("");
  const [codigo, setCodigo] = useState("");
  const [showSenha, setShowSenha] = useState(false);
  const [error, setError]   = useState("");
  const [loading, setLoading] = useState(false);
  const { login, register }   = usePacienteAuth();
  const navigate = useNavigate();

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      await login(email, senha);
      navigate("/paciente/feed");
    } catch (err: any) {
      setError(err.response?.data?.error || "E-mail ou senha incorretos.");
    } finally { setLoading(false); }
  }

  async function handleRegister(e: FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      await register(email, senha, codigo.trim());
      navigate("/paciente/feed");
    } catch (err: any) {
      setError(err.response?.data?.error || "Erro ao criar conta.");
    } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen flex" style={{ background: "#7C3AED" }}>
      {/* Left panel — visible on lg+ */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-16">
        <div className="flex items-center gap-3">
          <Leaf className="text-[#A855F7]" size={32} />
          <span className="text-white font-bold text-3xl tracking-wide">nexvel</span>
        </div>
        <div>
          <h1 className="text-white text-5xl font-bold leading-tight mb-6">
            seu espaço.<br />
            <span className="text-[#A855F7]">sua evolução.</span>
          </h1>
          <p className="text-white/60 text-lg leading-relaxed">
            Acompanhe suas consultas, metas e evolução junto com sua nutricionista.
          </p>
          <div className="mt-12 space-y-4">
            {["Veja sua posição no ranking", "Acompanhe suas consultas", "Acesse seu histórico de cobranças"].map((item) => (
              <div key={item} className="flex items-center gap-3 text-[#A855F7] text-sm">
                <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "rgba(82,183,136,0.3)" }}>
                  <div className="w-2 h-2 rounded-full bg-[#A855F7]" />
                </div>
                {item}
              </div>
            ))}
          </div>
        </div>
        <p className="text-white/30 text-xs">© 2024 Nexvel. Todos os direitos reservados.</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-2 mb-6">
            <Leaf size={22} style={{ color: "#A855F7" }} />
            <span className="font-bold text-xl" style={{ color: "#7C3AED" }}>nexvel</span>
          </div>

          {/* Back to nutricionista login */}
          <Link to="/login" className="flex items-center gap-1.5 text-xs text-[#999] hover:text-[#7C3AED] mb-6 transition-colors">
            <ArrowLeft size={13} />
            Área da nutricionista
          </Link>

          {/* Tabs */}
          <div className="flex gap-1 rounded-xl p-1 mb-8" style={{ background: "#F9FAF8" }}>
            {(["login", "register"] as const).map((t) => (
              <button
                key={t}
                onClick={() => { setTab(t); setError(""); }}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                  tab === t ? "bg-white text-[#7C3AED] shadow-sm" : "text-[#999]"
                }`}
              >
                {t === "login" ? "Entrar" : "Criar conta"}
              </button>
            ))}
          </div>

          {tab === "login" ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <h2 className="text-[#111] text-2xl font-bold mb-1">Bem-vindo de volta</h2>
                <p className="text-[#999] text-sm mb-6">Entre com seu e-mail e senha.</p>
              </div>
              <Field label="E-mail" type="email" value={email} onChange={setEmail} placeholder="seu@email.com" />
              <PasswordField label="Senha" value={senha} onChange={setSenha} show={showSenha} onToggle={() => setShowSenha(!showSenha)} />
              {error && <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
              <button
                type="submit" disabled={loading}
                className="w-full text-white py-3 rounded-xl font-semibold text-sm transition-all disabled:opacity-60"
                style={{ background: "#A855F7" }}
              >
                {loading ? "Entrando..." : "Entrar"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <h2 className="text-[#111] text-2xl font-bold mb-1">Criar sua conta</h2>
                <p className="text-[#999] text-sm mb-6">Use o código enviado pela sua nutricionista.</p>
              </div>
              <Field label="E-mail cadastrado pela nutricionista" type="email" value={email} onChange={setEmail} placeholder="seu@email.com" />
              <PasswordField label="Crie uma senha" value={senha} onChange={setSenha} show={showSenha} onToggle={() => setShowSenha(!showSenha)} />
              <div>
                <label className="text-sm font-medium text-[#555] mb-1.5 block">Código de vínculo</label>
                <input
                  type="text"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="123456"
                  maxLength={6}
                  className="w-full px-4 py-3 rounded-xl border text-[#111] text-center text-2xl font-bold tracking-widest focus:outline-none focus:ring-2"
                  style={{ borderColor: "#A855F7", background: "#F9FAF8" }}
                  required
                />
                <p className="text-xs text-[#999] mt-1.5">Código de 6 dígitos fornecido pela sua nutricionista.</p>
              </div>
              {error && <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
              <button
                type="submit" disabled={loading}
                className="w-full text-white py-3 rounded-xl font-semibold text-sm transition-all disabled:opacity-60"
                style={{ background: "#A855F7" }}
              >
                {loading ? "Criando conta..." : "Criar conta"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, type, value, onChange, placeholder }: {
  label: string; type: string; value: string;
  onChange: (v: string) => void; placeholder: string;
}) {
  return (
    <div>
      <label className="text-sm font-medium text-[#555] mb-1.5 block">{label}</label>
      <input
        type={type} value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder} required
        className="w-full px-4 py-3 rounded-xl border text-[#111] placeholder-[#bbb] focus:outline-none focus:ring-2"
        style={{ borderColor: "#A855F7", background: "#F9FAF8" }}
      />
    </div>
  );
}

function PasswordField({ label, value, onChange, show, onToggle }: {
  label: string; value: string; onChange: (v: string) => void; show: boolean; onToggle: () => void;
}) {
  return (
    <div>
      <label className="text-sm font-medium text-[#555] mb-1.5 block">{label}</label>
      <div className="relative">
        <input
          type={show ? "text" : "password"} value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="••••••••" required minLength={6}
          className="w-full px-4 py-3 rounded-xl border text-[#111] placeholder-[#bbb] focus:outline-none focus:ring-2"
          style={{ borderColor: "#A855F7", background: "#F9FAF8" }}
        />
        <button type="button" onClick={onToggle} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#999]">
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  );
}
