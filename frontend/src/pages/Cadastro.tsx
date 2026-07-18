import { useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff, ArrowLeft, UserPlus } from "lucide-react";
import api from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { ProLogo, PrimaryBtn, INPUT_DARK } from "./nutri-landing/components/shared";
import { Constellation } from "./nutri-landing/components/Constellation";

/** Cadastro da nutricionista (NEXVEL NUTRITION PRO), dark + verde — casa com /login e /nutri. */
export default function Cadastro() {
  const [nome, setNome] = useState("");
  const [crn, setCrn] = useState("");
  const [nomeConsultorio, setNomeConsultorio] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [showSenha, setShowSenha] = useState(false);
  const [aceito, setAceito] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { setSession } = useAuth();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (senha.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (!aceito) {
      setError("Você precisa aceitar os Termos de Uso e a Política de Privacidade.");
      return;
    }
    setLoading(true);
    try {
      const res = await api.post("/auth/register", { nome, email, senha, crn, nomeConsultorio: nomeConsultorio || undefined, aceiteTermos: aceito });
      setSession(res.data.token, res.data.nutricionista, res.data.refreshToken);
      navigate("/app/dashboard");
    } catch (err: any) {
      setError(err.response?.data?.error || "Erro ao criar conta. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-[100dvh] w-full items-center justify-center overflow-hidden bg-[#0A0A0A] px-5 pb-10 pt-[calc(2.5rem+env(safe-area-inset-top))]">
      {/* fix autofill escuro */}
      <style>{`.nx-input:-webkit-autofill{-webkit-box-shadow:0 0 0 1000px #0B0F0C inset;-webkit-text-fill-color:#fff;caret-color:#fff}`}</style>

      {/* fundo constelação */}
      <Constellation className="pointer-events-none absolute inset-0 size-full opacity-90" />

      <div className="relative z-10 w-full max-w-[460px]">
        <Link to="/" className="mb-6 inline-flex items-center gap-1.5 text-body-sm text-[#A1A1AA] transition-colors hover:text-white">
          <ArrowLeft size={16} /> Voltar ao início
        </Link>

        {/* Marca + selo */}
        <div className="flex flex-col items-center text-center">
          <ProLogo size="h-[28px]" className="[&_p]:text-center" />
          <span className="mt-6 grid size-14 place-items-center rounded-2xl border border-nx-evo/30 bg-nx-evo/10">
            <UserPlus className="size-7 text-nx-evo" strokeWidth={2} />
          </span>
          <h1 className="mt-6 text-[28px] font-extrabold tracking-tight text-white">Criar sua conta grátis</h1>
          <p className="mx-auto mt-2 max-w-[38ch] text-body-md leading-relaxed text-[#A1A1AA]">
            Teste gratuito por <span className="font-semibold text-nx-evo">14 dias</span> · Sem cartão · Cancele quando quiser.
          </p>
        </div>

        {/* Card de cadastro */}
        <div className="mt-8 rounded-[20px] border border-white/[0.06] bg-[#111311] p-6 shadow-2xl sm:p-7">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-body-sm font-medium text-[#A1A1AA]">Nome completo</label>
              <input type="text" value={nome} onChange={(e) => setNome(e.target.value)}
                placeholder="Seu nome completo" autoComplete="name" className={INPUT_DARK} required autoFocus />
            </div>

            <div>
              <label className="mb-1.5 block text-body-sm font-medium text-[#A1A1AA]">CRN</label>
              <input type="text" value={crn} onChange={(e) => setCrn(e.target.value)}
                placeholder="CRN-3 12345" className={INPUT_DARK} required />
            </div>

            <div>
              <label className="mb-1.5 block text-body-sm font-medium text-[#A1A1AA]">
                Nome do consultório <span className="font-normal text-[#52525b]">(opcional)</span>
              </label>
              <input type="text" value={nomeConsultorio} onChange={(e) => setNomeConsultorio(e.target.value)}
                placeholder="Clínica NutriVida" className={INPUT_DARK} />
            </div>

            <div>
              <label className="mb-1.5 block text-body-sm font-medium text-[#A1A1AA]">E-mail profissional</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com" autoComplete="email" className={INPUT_DARK} required />
            </div>

            <div>
              <label className="mb-1.5 block text-body-sm font-medium text-[#A1A1AA]">Senha</label>
              <div className="relative">
                <input type={showSenha ? "text" : "password"} value={senha} onChange={(e) => setSenha(e.target.value)}
                  placeholder="mínimo 6 caracteres" autoComplete="new-password" minLength={6}
                  className={`${INPUT_DARK} pr-12`} required />
                <button type="button" onClick={() => setShowSenha((s) => !s)}
                  aria-label={showSenha ? "Ocultar senha" : "Mostrar senha"}
                  className="absolute right-3 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-[#A1A1AA] transition-colors hover:text-white">
                  {showSenha ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <label className="flex items-start gap-2.5 text-body-sm leading-relaxed text-[#A1A1AA] cursor-pointer">
              <input
                type="checkbox"
                checked={aceito}
                onChange={(e) => setAceito(e.target.checked)}
                className="mt-0.5 size-4 shrink-0 accent-nx-evo"
              />
              <span>
                Li e aceito os{" "}
                <Link to="/termos" className="underline underline-offset-2 text-nx-evo hover:text-nx-evo-2">Termos de Uso</Link>
                {" "}e a{" "}
                <Link to="/privacidade" className="underline underline-offset-2 text-nx-evo hover:text-nx-evo-2">Política de Privacidade</Link>.
              </span>
            </label>

            {error && (
              <p className="rounded-xl border border-nx-danger/25 bg-nx-danger/10 px-3.5 py-2.5 text-body-sm font-medium text-nx-danger">{error}</p>
            )}

            <PrimaryBtn type="submit" disabled={loading || !aceito} className="mt-1 w-full">
              {loading ? "Criando conta…" : "Criar conta grátis →"}
            </PrimaryBtn>
          </form>
        </div>

        <p className="mt-6 text-center text-body-sm text-[#A1A1AA]">
          Já tem conta?{" "}
          <Link to="/login" className="font-bold text-nx-evo hover:text-nx-evo-2">Entrar</Link>
        </p>
      </div>
    </div>
  );
}
