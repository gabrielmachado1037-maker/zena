import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import api from "../lib/api";

export interface PacienteUser {
  id: string;
  nome: string;
  email: string;
  nutricionistaNome: string;
  nomeConsultorio?: string | null;
}

interface PacienteAuthContextType {
  paciente: PacienteUser | null;
  token: string | null;
  login: (email: string, senha: string) => Promise<void>;
  register: (email: string, senha: string, codigoVinculo: string) => Promise<void>;
  logout: () => void;
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

  async function login(email: string, senha: string) {
    const res = await api.post("/auth/paciente/login", { email, senha });
    const { token: t, paciente: p } = res.data;
    setToken(t);
    setPaciente(p);
    localStorage.setItem("zena_token_paciente", t);
    localStorage.setItem("zena_user_paciente", JSON.stringify(p));
  }

  async function register(email: string, senha: string, codigoVinculo: string) {
    const res = await api.post("/auth/paciente/register", { email, senha, codigoVinculo });
    const { token: t, paciente: p } = res.data;
    setToken(t);
    setPaciente(p);
    localStorage.setItem("zena_token_paciente", t);
    localStorage.setItem("zena_user_paciente", JSON.stringify(p));
  }

  function logout() {
    setToken(null);
    setPaciente(null);
    localStorage.removeItem("zena_token_paciente");
    localStorage.removeItem("zena_user_paciente");
  }

  return (
    <PacienteAuthContext.Provider value={{ paciente, token, login, register, logout, loading }}>
      {children}
    </PacienteAuthContext.Provider>
  );
}

export const usePacienteAuth = () => useContext(PacienteAuthContext);
