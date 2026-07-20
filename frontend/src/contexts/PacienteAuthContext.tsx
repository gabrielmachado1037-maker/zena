import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import * as Sentry from "@sentry/react";
import api from "../lib/api";
import apiPaciente from "../lib/apiPaciente";
import { encerrarSubscription } from "../lib/pushConflito";

export interface PacienteUser {
  id: string;
  nome: string;
  email: string;
  nutricionistaNome: string;
  nomeConsultorio?: string | null;
  fotoUrl?: string | null;
  emailVerificado?: boolean;
}

interface PacienteAuthContextType {
  paciente: PacienteUser | null;
  token: string | null;
  login: (email: string, senha: string) => Promise<void>;
  register: (email: string, senha: string, codigoVinculo: string, telefone4: string | undefined, aceiteTermos: boolean) => Promise<void>;
  logout: () => void;
  updateFoto: (url: string) => void;
  updatePaciente: (patch: Partial<PacienteUser>) => void;
  loading: boolean;
}

const PacienteAuthContext = createContext<PacienteAuthContextType>({} as PacienteAuthContextType);

export function PacienteAuthProvider({ children }: { children: ReactNode }) {
  const [paciente, setPaciente] = useState<PacienteUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem("zena_token_paciente");
    const user = localStorage.getItem("zena_user_paciente");
    if (saved && user) {
      const p: PacienteUser = JSON.parse(user);
      setToken(saved);
      setPaciente(p);
      // Só o id: e-mail é dado pessoal e não deve sair do app (LGPD). Para saber
      // quem é, cruze o id no banco.
      Sentry.setUser({ id: p.id });
      // A URL da foto é assinada e expira; a cópia do localStorage envelhece e
      // o avatar quebraria sem nada para renová-la. Puxo só esse campo — o
      // /me do paciente devolve um objeto de formato diferente (paciente +
      // medições), então mesclar tudo corromperia a sessão guardada.
      apiPaciente
        .get("/paciente-app/me", { headers: { Authorization: `Bearer ${saved}` } })
        .then(({ data }) => {
          const fotoUrl = data?.pacienteUser?.fotoUrl ?? data?.fotoUrl ?? null;
          if (!fotoUrl || fotoUrl === p.fotoUrl) return;
          const atualizado = { ...p, fotoUrl };
          setPaciente(atualizado);
          localStorage.setItem("zena_user_paciente", JSON.stringify(atualizado));
        })
        .catch(() => {}); // Offline ou token vencido: segue com a cópia local.
    }
    setLoading(false);
  }, []);

  function guardarSessao(t: string, p: PacienteUser, refreshToken?: string) {
    setToken(t);
    setPaciente(p);
    Sentry.setUser({ id: p.id });
    localStorage.setItem("zena_token_paciente", t);
    localStorage.setItem("zena_user_paciente", JSON.stringify(p));
    if (refreshToken) localStorage.setItem("zena_refresh_paciente", refreshToken);
  }

  async function login(email: string, senha: string) {
    const res = await api.post("/auth/paciente/login", { email, senha });
    guardarSessao(res.data.token, res.data.paciente, res.data.refreshToken);
  }

  async function register(email: string, senha: string, codigoVinculo: string, telefone4: string | undefined, aceiteTermos: boolean) {
    const res = await api.post("/auth/paciente/register", { email, senha, codigoVinculo, telefone4, aceiteTermos });
    guardarSessao(res.data.token, res.data.paciente, res.data.refreshToken);
  }

  function logout() {
    // Revoga o refresh no servidor (best-effort).
    const rt = localStorage.getItem("zena_refresh_paciente");
    if (rt) api.post("/auth/paciente/logout", { refreshToken: rt }).catch(() => {});
    // Encerra o push antes de derrubar o token — aqui o payload carrega dado
    // de saúde, então um aparelho compartilhado não pode seguir recebendo.
    encerrarSubscription((endpoint) => apiPaciente.delete("/paciente-app/push/subscribe", { data: { endpoint } }));
    Sentry.setUser(null);
    setToken(null);
    setPaciente(null);
    localStorage.removeItem("zena_token_paciente");
    localStorage.removeItem("zena_user_paciente");
    localStorage.removeItem("zena_refresh_paciente");
  }

  function updateFoto(url: string) {
    setPaciente(prev => {
      if (!prev) return prev;
      const updated = { ...prev, fotoUrl: url };
      localStorage.setItem("zena_user_paciente", JSON.stringify(updated));
      return updated;
    });
  }

  function updatePaciente(patch: Partial<PacienteUser>) {
    setPaciente(prev => {
      if (!prev) return prev;
      const updated = { ...prev, ...patch };
      localStorage.setItem("zena_user_paciente", JSON.stringify(updated));
      return updated;
    });
  }

  return (
    <PacienteAuthContext.Provider value={{ paciente, token, login, register, logout, updateFoto, updatePaciente, loading }}>
      {children}
    </PacienteAuthContext.Provider>
  );
}

export const usePacienteAuth = () => useContext(PacienteAuthContext);
