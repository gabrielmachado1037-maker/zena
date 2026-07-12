import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import api from "../lib/api";

export interface PacienteUser {
  id: string;
  nome: string;
  email: string;
  nutricionistaNome: string;
  nomeConsultorio?: string | null;
  fotoUrl?: string | null;
}

interface PacienteAuthContextType {
  paciente: PacienteUser | null;
  token: string | null;
  login: (email: string, senha: string) => Promise<void>;
  register: (email: string, senha: string, codigoVinculo: string) => Promise<void>;
  logout: () => void;
  updateFoto: (url: string) => void;
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
      setToken(saved);
      setPaciente(JSON.parse(user));
    }
    setLoading(false);
  }, []);

  function guardarSessao(t: string, p: PacienteUser, refreshToken?: string) {
    setToken(t);
    setPaciente(p);
    localStorage.setItem("zena_token_paciente", t);
    localStorage.setItem("zena_user_paciente", JSON.stringify(p));
    if (refreshToken) localStorage.setItem("zena_refresh_paciente", refreshToken);
  }

  async function login(email: string, senha: string) {
    const res = await api.post("/auth/paciente/login", { email, senha });
    guardarSessao(res.data.token, res.data.paciente, res.data.refreshToken);
  }

  async function register(email: string, senha: string, codigoVinculo: string) {
    const res = await api.post("/auth/paciente/register", { email, senha, codigoVinculo });
    guardarSessao(res.data.token, res.data.paciente, res.data.refreshToken);
  }

  function logout() {
    // Revoga o refresh no servidor (best-effort).
    const rt = localStorage.getItem("zena_refresh_paciente");
    if (rt) api.post("/auth/paciente/logout", { refreshToken: rt }).catch(() => {});
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

  return (
    <PacienteAuthContext.Provider value={{ paciente, token, login, register, logout, updateFoto, loading }}>
      {children}
    </PacienteAuthContext.Provider>
  );
}

export const usePacienteAuth = () => useContext(PacienteAuthContext);
