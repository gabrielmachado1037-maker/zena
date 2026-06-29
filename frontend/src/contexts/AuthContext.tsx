import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
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
}

interface AuthContextType {
  nutricionista: Nutricionista | null;
  token: string | null;
  login: (email: string, senha: string) => Promise<void>;
  logout: () => void;
  updateAvatar: (foto: string) => void;
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
      setToken(saved);
      setNutricionista(JSON.parse(user));
      api.defaults.headers.Authorization = `Bearer ${saved}`;
      api.get("/health").catch(() => {}); // Acorda backend/Neon DB antes do usuário clicar em algo
    }
    setLoading(false);
  }, []);

  async function login(email: string, senha: string) {
    const res = await api.post("/auth/login", { email, senha });
    const { token: t, nutricionista: n } = res.data;
    setToken(t);
    setNutricionista(n);
    api.defaults.headers.Authorization = `Bearer ${t}`;
    localStorage.setItem("zena_token", t);
    localStorage.setItem("zena_user", JSON.stringify(n));
  }

  function logout() {
    setToken(null);
    setNutricionista(null);
    delete api.defaults.headers.Authorization;
    localStorage.removeItem("zena_token");
    localStorage.removeItem("zena_user");
  }

  function updateAvatar(foto: string) {
    setNutricionista((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, foto };
      localStorage.setItem("zena_user", JSON.stringify(updated));
      return updated;
    });
  }

  return (
    <AuthContext.Provider value={{ nutricionista, token, login, logout, updateAvatar, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
