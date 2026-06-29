import { useEffect, useRef, useState, type FormEvent, type ChangeEvent } from "react";
import { User, Lock, CheckCircle, Building2, Upload, X, Link2, RefreshCw, Copy } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import api from "../lib/api";

export default function Perfil() {
  const { nutricionista } = useAuth();

  // ─── Dados pessoais ──────────────────────────────────────────────────────
  const [nome, setNome] = useState(nutricionista?.nome || "");
  const [crn, setCrn] = useState(nutricionista?.crn || "");
  const [loadingPerfil, setLoadingPerfil] = useState(false);
  const [sucessoPerfil, setSucessoPerfil] = useState(false);
  const [erroPerfil, setErroPerfil] = useState("");

  // ─── Senha ───────────────────────────────────────────────────────────────
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [loadingSenha, setLoadingSenha] = useState(false);
  const [sucessoSenha, setSucessoSenha] = useState(false);
  const [erroSenha, setErroSenha] = useState("");

  // ─── Consultório ─────────────────────────────────────────────────────────
  const [nomeConsultorio, setNomeConsultorio] = useState(nutricionista?.nomeConsultorio || "");
  const [enderecoConsultorio, setEnderecoConsultorio] = useState(nutricionista?.enderecoConsultorio || "");
  const [logoConsultorio, setLogoConsultorio] = useState<string | null>(nutricionista?.logoConsultorio || null);
  const [loadingConsultorio, setLoadingConsultorio] = useState(false);
  const [sucessoConsultorio, setSucessoConsultorio] = useState(false);
  const [erroConsultorio, setErroConsultorio] = useState("");
  const logoInputRef = useRef<HTMLInputElement>(null);

  function persistUser(data: any) {
    const atual = JSON.parse(localStorage.getItem("zena_user") || "{}");
    localStorage.setItem("zena_user", JSON.stringify({ ...atual, ...data }));
  }

  async function salvarPerfil(e: FormEvent) {
    e.preventDefault();
    setErroPerfil("");
    setSucessoPerfil(false);
    setLoadingPerfil(true);
    try {
      const { data } = await api.put("/auth/perfil", { nome, crn });
      persistUser(data);
      setSucessoPerfil(true);
      setTimeout(() => setSucessoPerfil(false), 3000);
    } catch (err: any) {
      setErroPerfil(err.response?.data?.error || "Erro ao salvar. Tente novamente.");
    } finally {
      setLoadingPerfil(false);
    }
  }

  async function alterarSenha(e: FormEvent) {
    e.preventDefault();
    setErroSenha("");
    setSucessoSenha(false);
    if (novaSenha !== confirmarSenha) { setErroSenha("As senhas não coincidem."); return; }
    if (novaSenha.length < 6) { setErroSenha("A nova senha deve ter pelo menos 6 caracteres."); return; }
    setLoadingSenha(true);
    try {
      await api.put("/auth/perfil", { nome, crn, senhaAtual, novaSenha });
      setSucessoSenha(true);
      setSenhaAtual(""); setNovaSenha(""); setConfirmarSenha("");
      setTimeout(() => setSucessoSenha(false), 3000);
    } catch (err: any) {
      setErroSenha(err.response?.data?.error || "Erro ao alterar senha.");
    } finally {
      setLoadingSenha(false);
    }
  }

  async function salvarConsultorio(e: FormEvent) {
    e.preventDefault();
    setErroConsultorio("");
    setSucessoConsultorio(false);
    setLoadingConsultorio(true);
    try {
      const { data } = await api.put("/auth/consultorio", {
        nomeConsultorio: nomeConsultorio || null,
        logoConsultorio: logoConsultorio || null,
        enderecoConsultorio: enderecoConsultorio || null,
      });
      persistUser(data);
      setSucessoConsultorio(true);
      setTimeout(() => setSucessoConsultorio(false), 3000);
    } catch (err: any) {
      setErroConsultorio(err.response?.data?.error || "Erro ao salvar.");
    } finally {
      setLoadingConsultorio(false);
    }
  }

  function handleLogoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500 * 1024) {
      setErroConsultorio("A logo deve ter no máximo 500KB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setLogoConsultorio(reader.result as string);
    reader.readAsDataURL(file);
  }

  // ─── Código de vínculo ───────────────────────────────────────────────────
  const [codigoVinculo, setCodigoVinculo] = useState<string | null>(null);
  const [loadingCodigo, setLoadingCodigo] = useState(false);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    api.get<{ codigoVinculo: string | null }>("/auth/paciente/codigo-vinculo")
      .then((r) => setCodigoVinculo(r.data.codigoVinculo))
      .catch(() => null);
  }, []);

  async function gerarCodigo() {
    setLoadingCodigo(true);
    try {
      const { data } = await api.post<{ codigoVinculo: string }>("/auth/paciente/gerar-codigo");
      setCodigoVinculo(data.codigoVinculo);
    } finally { setLoadingCodigo(false); }
  }

  function copiarCodigo() {
    if (!codigoVinculo) return;
    navigator.clipboard.writeText(codigoVinculo);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  const inputCls = "w-full px-4 py-3 rounded-xl border border-zena-mint/50 bg-zena-cream text-zena-text-dark placeholder-zena-text-light focus:outline-none focus:ring-2 focus:ring-zena-green-light text-sm";

  return (
    <div className="max-w-2xl mx-auto space-y-6 p-4 sm:p-8">
      <div>
        <h1 className="text-2xl font-bold text-zena-green-dark">Meu Perfil</h1>
        <p className="text-zena-text-mid mt-1">Atualize suas informações e configurações.</p>
      </div>

      {/* Dados pessoais */}
      <div className="bg-white rounded-2xl border border-zena-mint/30 p-6">
        <h2 className="font-semibold text-zena-text-dark mb-5 flex items-center gap-2">
          <User size={18} className="text-zena-green-mid" /> Dados pessoais
        </h2>
        <form onSubmit={salvarPerfil} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-zena-text-mid mb-1.5 block">Nome completo</label>
            <input type="text" value={nome} onChange={(e) => setNome(e.target.value)} className={inputCls} required />
          </div>
          <div>
            <label className="text-sm font-medium text-zena-text-mid mb-1.5 block">CRN</label>
            <input type="text" value={crn} onChange={(e) => setCrn(e.target.value)} className={inputCls} required />
          </div>
          <div>
            <label className="text-sm font-medium text-zena-text-mid mb-1.5 block">E-mail</label>
            <input
              type="email"
              value={nutricionista?.email || ""}
              disabled
              className="w-full px-4 py-3 rounded-xl border border-zena-mint/30 bg-gray-50 text-zena-text-light text-sm cursor-not-allowed"
            />
            <p className="text-xs text-zena-text-light mt-1">O e-mail não pode ser alterado.</p>
          </div>
          {erroPerfil && <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{erroPerfil}</p>}
          {sucessoPerfil && (
            <div className="flex items-center gap-2 text-emerald-600 text-sm bg-emerald-50 px-3 py-2 rounded-lg">
              <CheckCircle size={16} /> Perfil atualizado!
            </div>
          )}
          <button type="submit" disabled={loadingPerfil} className="bg-zena-green-dark hover:bg-zena-green-mid text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition-colors disabled:opacity-60">
            {loadingPerfil ? "Salvando..." : "Salvar alterações"}
          </button>
        </form>
      </div>

      {/* Meu Consultório */}
      <div className="bg-white rounded-2xl border border-zena-mint/30 p-6">
        <h2 className="font-semibold text-zena-text-dark mb-1 flex items-center gap-2">
          <Building2 size={18} className="text-zena-green-mid" /> Meu Consultório
        </h2>
        <p className="text-zena-text-light text-xs mb-5">Aparece na sidebar e em documentos gerados pelo Clinne.</p>
        <form onSubmit={salvarConsultorio} className="space-y-4">
          {/* Logo */}
          <div>
            <label className="text-sm font-medium text-zena-text-mid mb-2 block">Logo do consultório</label>
            <div className="flex items-center gap-4">
              <div
                onClick={() => logoInputRef.current?.click()}
                className="w-20 h-20 rounded-xl border-2 border-dashed border-zena-mint/50 flex items-center justify-center cursor-pointer hover:border-zena-green-mid hover:bg-zena-cream/50 transition-all overflow-hidden flex-shrink-0"
              >
                {logoConsultorio ? (
                  <img src={logoConsultorio} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <Upload size={20} className="text-zena-text-light" />
                )}
              </div>
              <div className="flex-1 text-xs text-zena-text-light space-y-1">
                <p>Clique para fazer upload da sua logo.</p>
                <p>PNG ou JPG, máximo 500KB.</p>
                {logoConsultorio && (
                  <button
                    type="button"
                    onClick={() => setLogoConsultorio(null)}
                    className="flex items-center gap-1 text-red-400 hover:text-red-500 mt-1"
                  >
                    <X size={12} /> Remover logo
                  </button>
                )}
              </div>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleLogoChange}
                className="hidden"
              />
            </div>
          </div>

          {/* Nome do consultório */}
          <div>
            <label className="text-sm font-medium text-zena-text-mid mb-1.5 block">Nome do consultório</label>
            <input
              type="text"
              value={nomeConsultorio}
              onChange={(e) => setNomeConsultorio(e.target.value)}
              placeholder="Clínica NutriVida ou Dra. Ana Souza"
              className={inputCls}
            />
            <p className="text-xs text-zena-text-light mt-1">Este nome aparece na sidebar abaixo do logo "clinne".</p>
          </div>

          {/* CRN (read-only nesta seção, editável em Dados pessoais) */}
          <div>
            <label className="text-sm font-medium text-zena-text-mid mb-1.5 block">CRN</label>
            <input
              type="text"
              value={crn}
              disabled
              className="w-full px-4 py-3 rounded-xl border border-zena-mint/30 bg-gray-50 text-zena-text-light text-sm cursor-not-allowed"
            />
            <p className="text-xs text-zena-text-light mt-1">Altere o CRN na seção "Dados pessoais" acima.</p>
          </div>

          {/* Endereço */}
          <div>
            <label className="text-sm font-medium text-zena-text-mid mb-1.5 block">Endereço de atendimento</label>
            <input
              type="text"
              value={enderecoConsultorio}
              onChange={(e) => setEnderecoConsultorio(e.target.value)}
              placeholder="Rua das Flores, 123 – São Paulo, SP"
              className={inputCls}
            />
          </div>

          {erroConsultorio && <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{erroConsultorio}</p>}
          {sucessoConsultorio && (
            <div className="flex items-center gap-2 text-emerald-600 text-sm bg-emerald-50 px-3 py-2 rounded-lg">
              <CheckCircle size={16} /> Consultório atualizado! Recarregue a página para ver na sidebar.
            </div>
          )}
          <button type="submit" disabled={loadingConsultorio} className="bg-zena-green-dark hover:bg-zena-green-mid text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition-colors disabled:opacity-60">
            {loadingConsultorio ? "Salvando..." : "Salvar consultório"}
          </button>
        </form>
      </div>

      {/* Alterar senha */}
      <div className="bg-white rounded-2xl border border-zena-mint/30 p-6">
        <h2 className="font-semibold text-zena-text-dark mb-5 flex items-center gap-2">
          <Lock size={18} className="text-zena-green-mid" /> Alterar senha
        </h2>
        <form onSubmit={alterarSenha} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-zena-text-mid mb-1.5 block">Senha atual</label>
            <input type="password" value={senhaAtual} onChange={(e) => setSenhaAtual(e.target.value)} placeholder="••••••••" className={inputCls} required />
          </div>
          <div>
            <label className="text-sm font-medium text-zena-text-mid mb-1.5 block">Nova senha</label>
            <input type="password" value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} placeholder="mínimo 6 caracteres" className={inputCls} required minLength={6} />
          </div>
          <div>
            <label className="text-sm font-medium text-zena-text-mid mb-1.5 block">Confirmar nova senha</label>
            <input type="password" value={confirmarSenha} onChange={(e) => setConfirmarSenha(e.target.value)} placeholder="••••••••" className={inputCls} required />
          </div>
          {erroSenha && <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{erroSenha}</p>}
          {sucessoSenha && (
            <div className="flex items-center gap-2 text-emerald-600 text-sm bg-emerald-50 px-3 py-2 rounded-lg">
              <CheckCircle size={16} /> Senha alterada com sucesso!
            </div>
          )}
          <button type="submit" disabled={loadingSenha} className="bg-zena-green-dark hover:bg-zena-green-mid text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition-colors disabled:opacity-60">
            {loadingSenha ? "Alterando..." : "Alterar senha"}
          </button>
        </form>
      </div>

      {/* Código de vínculo do paciente */}
      <div className="bg-white rounded-2xl border border-zena-mint/30 p-6">
        <h2 className="font-semibold text-zena-text-dark mb-1 flex items-center gap-2">
          <Link2 size={18} className="text-zena-green-mid" /> Acesso do paciente
        </h2>
        <p className="text-sm text-zena-text-light mb-5">
          Compartilhe este código com seus pacientes para que eles criem conta no app.
        </p>

        {codigoVinculo ? (
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 flex items-center justify-center py-4 rounded-2xl border-2 border-dashed border-zena-mint/60 bg-zena-surface">
              <span className="text-4xl font-bold tracking-[0.3em] text-zena-green-dark tabular-nums">
                {codigoVinculo}
              </span>
            </div>
            <button
              onClick={copiarCodigo}
              title="Copiar código"
              className={`w-11 h-11 rounded-xl flex items-center justify-center transition-colors flex-shrink-0 ${
                copiado ? "bg-zena-green-mid text-white" : "bg-zena-cream text-zena-text-mid hover:bg-zena-mint/20"
              }`}
            >
              {copiado ? <CheckCircle size={17} /> : <Copy size={17} />}
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-center py-6 rounded-2xl border-2 border-dashed border-zena-mint/40 bg-zena-cream mb-4">
            <p className="text-sm text-zena-text-light">Nenhum código gerado ainda.</p>
          </div>
        )}

        <button
          onClick={gerarCodigo}
          disabled={loadingCodigo}
          className="flex items-center gap-2 text-sm font-medium text-zena-green-dark hover:text-zena-green-mid transition-colors disabled:opacity-60"
        >
          <RefreshCw size={15} className={loadingCodigo ? "animate-spin" : ""} />
          {codigoVinculo ? "Gerar novo código" : "Gerar código"}
        </button>
        {codigoVinculo && (
          <p className="text-xs text-zena-text-light mt-2">Gerar um novo código invalida o anterior.</p>
        )}
      </div>
    </div>
  );
}
