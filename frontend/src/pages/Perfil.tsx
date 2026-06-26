import { useState, type FormEvent } from "react";
import { User, Lock, CheckCircle } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import api from "../lib/api";

export default function Perfil() {
  const { nutricionista, login } = useAuth();

  const [nome, setNome] = useState(nutricionista?.nome || "");
  const [crn, setCrn] = useState(nutricionista?.crn || "");
  const [loadingPerfil, setLoadingPerfil] = useState(false);
  const [sucessoPerfil, setSucessoPerfil] = useState(false);
  const [erroPerfil, setErroPerfil] = useState("");

  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [loadingSenha, setLoadingSenha] = useState(false);
  const [sucessoSenha, setSucessoSenha] = useState(false);
  const [erroSenha, setErroSenha] = useState("");

  async function salvarPerfil(e: FormEvent) {
    e.preventDefault();
    setErroPerfil("");
    setSucessoPerfil(false);
    setLoadingPerfil(true);
    try {
      const { data } = await api.put("/auth/perfil", { nome, crn });
      localStorage.setItem("zena_user", JSON.stringify(data));
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
    if (novaSenha !== confirmarSenha) {
      setErroSenha("As senhas não coincidem.");
      return;
    }
    if (novaSenha.length < 6) {
      setErroSenha("A nova senha deve ter pelo menos 6 caracteres.");
      return;
    }
    setLoadingSenha(true);
    try {
      await api.put("/auth/perfil", { nome, crn, senhaAtual, novaSenha });
      setSucessoSenha(true);
      setSenhaAtual("");
      setNovaSenha("");
      setConfirmarSenha("");
      setTimeout(() => setSucessoSenha(false), 3000);
    } catch (err: any) {
      setErroSenha(err.response?.data?.error || "Erro ao alterar senha.");
    } finally {
      setLoadingSenha(false);
    }
  }

  const inputCls = "w-full px-4 py-3 rounded-xl border border-zena-mint/50 bg-zena-cream text-zena-text-dark placeholder-zena-text-light focus:outline-none focus:ring-2 focus:ring-zena-green-light text-sm";

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zena-green-dark">Meu Perfil</h1>
        <p className="text-zena-text-mid mt-1">Atualize suas informações e senha.</p>
      </div>

      {/* Dados pessoais */}
      <div className="bg-white rounded-2xl border border-zena-mint/30 p-6">
        <h2 className="font-semibold text-zena-text-dark mb-5 flex items-center gap-2">
          <User size={18} className="text-zena-green-mid" /> Dados pessoais
        </h2>
        <form onSubmit={salvarPerfil} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-zena-text-mid mb-1.5 block">Nome completo</label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className={inputCls}
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium text-zena-text-mid mb-1.5 block">CRN</label>
            <input
              type="text"
              value={crn}
              onChange={(e) => setCrn(e.target.value)}
              className={inputCls}
              required
            />
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
              <CheckCircle size={16} /> Perfil atualizado com sucesso!
            </div>
          )}
          <button
            type="submit"
            disabled={loadingPerfil}
            className="bg-zena-green-dark hover:bg-zena-green-mid text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition-colors disabled:opacity-60"
          >
            {loadingPerfil ? "Salvando..." : "Salvar alterações"}
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
            <input
              type="password"
              value={senhaAtual}
              onChange={(e) => setSenhaAtual(e.target.value)}
              placeholder="••••••••"
              className={inputCls}
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium text-zena-text-mid mb-1.5 block">Nova senha</label>
            <input
              type="password"
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value)}
              placeholder="mínimo 6 caracteres"
              className={inputCls}
              required
              minLength={6}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-zena-text-mid mb-1.5 block">Confirmar nova senha</label>
            <input
              type="password"
              value={confirmarSenha}
              onChange={(e) => setConfirmarSenha(e.target.value)}
              placeholder="••••••••"
              className={inputCls}
              required
            />
          </div>
          {erroSenha && <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{erroSenha}</p>}
          {sucessoSenha && (
            <div className="flex items-center gap-2 text-emerald-600 text-sm bg-emerald-50 px-3 py-2 rounded-lg">
              <CheckCircle size={16} /> Senha alterada com sucesso!
            </div>
          )}
          <button
            type="submit"
            disabled={loadingSenha}
            className="bg-zena-green-dark hover:bg-zena-green-mid text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition-colors disabled:opacity-60"
          >
            {loadingSenha ? "Alterando..." : "Alterar senha"}
          </button>
        </form>
      </div>
    </div>
  );
}
