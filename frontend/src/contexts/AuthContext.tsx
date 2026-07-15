import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import * as Sentry from "@sentry/react";
import api from "../lib/api";

interface Nutricionista {
  id: string;
  nome: string;
  email: string;
  crn: string;
  foto?: string | null;
  nomeConsultorio?: string | null;
  logoConsultorio?: string | null;
  enderecoConsultorio?: string | null;
  planoSlug?: string | null;
  subscriptionStatus?: string | null;
  modulosAtivos?: string[];
  emailVerificado?: boolean;
}

interface AuthContextType {
  nutricionista: Nutricionista | null;
  token: string | null;
  login: (email: string, senha: string) => Promise<void>;
  setSession: (token: string, nutricionista: Nutricionista, refreshToken?: string) => void;
  logout: () => void;
  updateAvatar: (foto: string) => void;
  updateNutricionista: (patch: Partial<Nutricionista>) => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [nutricionista, setNutricionista] = useState<Nutricionista | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem("zena_token");
    const user = localStorage.getItem("zena_user");
    if (saved && user) {
      const n: Nutricionista = JSON.parse(user);
      setToken(saved);
      setNutricionista(n);
      // Só o id: e-mail é dado pessoal e não deve sair do app (LGPD). Para saber
      // quem é, cruze o id no banco.
      Sentry.setUser({ id: n.id });
      api.defaults.headers.Authorization = `Bearer ${saved}`;
      api.get("/health").catch(() => {}); // Acorda backend/Neon DB antes do usuário clicar em algo
    }
    setLoading(false);
  }, []);

  // Popula a sessão a partir de um token + nutricionista (login OU cadastro).
  function setSession(t: string, n: Nutricionista, refreshToken?: string) {
    setToken(t);
    setNutricionista(n);
    Sentry.setUser({ id: n.id });
    api.defaults.headers.Authorization = `Bearer ${t}`;
    localStorage.setItem("zena_token", t);
    localStorage.setItem("zena_user", JSON.stringify(n));
    if (refreshToken) localStorage.setItem("zena_refresh", refreshToken);
  }

  async function login(email: string, senha: string) {
    const res = await api.post("/auth/login", { email, senha });
    setSession(res.data.token, res.data.nutricionista, res.data.refreshToken);
  }

  function logout() {
    // Revoga o refresh no servidor (best-effort; não bloqueia a saída).
    const rt = localStorage.getItem("zena_refresh");
    if (rt) api.post("/auth/logout", { refreshToken: rt }).catch(() => {});
    Sentry.setUser(null);
    setToken(null);
    setNutricionista(null);
    delete api.defaults.headers.Authorization;
    localStorage.removeItem("zena_token");
    localStorage.removeItem("zena_user");
    localStorage.removeItem("zena_refresh");
    sessionStorage.clear();
    window.location.href = "/login";
  }

  function updateAvatar(foto: string) {
    setNutricionista((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, foto };
      localStorage.setItem("zena_user", JSON.stringify(updated));
      return updated;
    });
  }

  function updateNutricionista(patch: Partial<Nutricionista>) {
    setNutricionista((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...patch };
      localStorage.setItem("zena_user", JSON.stringify(updated));
      return updated;
    });
  }

  return (
    <AuthContext.Provider value={{ nutricionista, token, login, setSession, logout, updateAvatar, updateNutricionista, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
