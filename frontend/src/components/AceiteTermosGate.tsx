import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { ButtonNx } from "./ui-nx";
import { useAuth } from "../contexts/AuthContext";
import api from "../lib/api";

interface MeResp {
  precisaAceitarTermos?: boolean;
}

/**
 * Gate de consentimento (LGPD) para contas de nutri anteriores ao aceite —
 * `aceiteTermosEm=null`, pois o consentimento não foi retroagido — e para quando
 * a versão vigente dos Termos mudar.
 *
 * Consulta o servidor em vez do `zena_user` do localStorage: quem já estava
 * logado antes deste deploy tem a sessão em cache e nunca passaria pelo login.
 * Bloqueia a tela até o aceite; a única saída sem aceitar é sair da conta.
 */
export default function AceiteTermosGate() {
  const { logout } = useAuth();
  const [precisa, setPrecisa] = useState(false);
  const [aceito, setAceito] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    // Falha de rede não pode trancar o app: sem resposta, não bloqueia.
    api.get<MeResp>("/auth/me")
      .then((r) => setPrecisa(!!r.data.precisaAceitarTermos))
      .catch(() => {});
  }, []);

  if (!precisa) return null;

  async function aceitar() {
    setSalvando(true);
    setErro("");
    try {
      await api.post("/auth/aceitar-termos");
      setPrecisa(false);
    } catch {
      setErro("Não foi possível registrar o aceite. Tente de novo.");
      setSalvando(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="aceite-titulo"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-md rounded-nx-lg border border-nx-border bg-nx-surface p-6 shadow-nx-card">
        <div className="mb-4 flex size-11 items-center justify-center rounded-nx-md bg-nx-evo/12">
          <ShieldCheck size={22} className="text-nx-evo" />
        </div>

        <h2 id="aceite-titulo" className="text-headline-md font-semibold text-nx-on-surface">
          Confirme seu consentimento
        </h2>
        <p className="mt-2 text-body-md leading-relaxed text-nx-on-surface-variant">
          Sua conta foi criada antes da versão atual dos nossos documentos. Para continuar usando
          o Nexvel, confirme que leu e aceita os Termos de Uso e a Política de Privacidade.
        </p>

        <label className="mt-5 flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={aceito}
            onChange={(e) => setAceito(e.target.checked)}
            className="mt-0.5 size-5 shrink-0 cursor-pointer appearance-none rounded-md border border-nx-outline bg-nx-container transition-colors checked:border-nx-evo checked:bg-nx-evo focus:outline-none focus:ring-2 focus:ring-nx-evo/40 checked:bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 20 20%22 fill=%22%2308130A%22><path fill-rule=%22evenodd%22 d=%22M16.7 5.3a1 1 0 010 1.4l-8 8a1 1 0 01-1.4 0l-4-4a1 1 0 011.4-1.4L8 12.6l7.3-7.3a1 1 0 011.4 0z%22 clip-rule=%22evenodd%22/></svg>')] checked:bg-center checked:bg-no-repeat"
          />
          <span className="text-body-sm leading-snug text-nx-on-surface-variant">
            Li e aceito os{" "}
            <Link to="/termos" target="_blank" rel="noopener noreferrer" className="font-semibold text-nx-evo underline-offset-2 hover:underline">Termos de Uso</Link>
            {" "}e a{" "}
            <Link to="/privacidade" target="_blank" rel="noopener noreferrer" className="font-semibold text-nx-evo underline-offset-2 hover:underline">Política de Privacidade</Link>.
          </span>
        </label>

        {erro && (
          <p className="mt-4 rounded-nx-sm border border-nx-danger/25 bg-nx-danger/10 px-3.5 py-2.5 text-body-sm font-medium text-nx-danger">
            {erro}
          </p>
        )}

        <ButtonNx block className="mt-5" disabled={!aceito || salvando} onClick={aceitar}>
          {salvando ? "Registrando..." : "Aceitar e continuar"}
        </ButtonNx>
        <ButtonNx block variant="ghost" size="sm" className="mt-2" onClick={logout}>
          Sair da conta
        </ButtonNx>
      </div>
    </div>
  );
}
