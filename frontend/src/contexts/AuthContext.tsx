import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import * as Sentry from "@sentry/react";
import api from "../lib/api";
import { encerrarSubscription } from "../lib/pushConflito";

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
      // Revalida o usuário guardado. Precisa acontecer porque as URLs de foto
      // agora são assinadas e expiram: a cópia do localStorage envelhece e o
      // avatar quebraria sem nada para renová-lo. De brinde, plano e módulos
      // deixam de ficar velhos até o próximo login. Também acorda o backend
      // (Render/Neon hibernam), papel que era do /health.
      api.get("/auth/me")
        .then(({ data }) => {
          if (!data?.id) return;
          // Merge, não substituição: se o /me deixar de devolver algum campo,
          // o valor antigo permanece em vez de sumir da sessão.
          const atualizado = { ...n, ...data };
          setNutricionista(atualizado);
          localStorage.setItem("zena_user", JSON.stringify(atualizado));
        })
        .catch(() => {}); // Offline ou token vencido: segue com a cópia local.
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
    // Encerra o push ANTES de derrubar o token: sem isso o aparelho seguia
    // registrado nesta conta e continuava recebendo notificações com nome de
    // paciente depois da saída — inclusive se outra pessoa assumisse o device.
    encerrarSubscription((endpoint) => api.delete("/notificacoes/subscribe", { data: { endpoint } }));
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
