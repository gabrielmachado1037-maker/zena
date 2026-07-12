import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

const api = axios.create({ baseURL: BASE, timeout: 30000 });

// Garante o token mais recente do localStorage em toda requisição (cobre múltiplas abas).
api.interceptors.request.use((config) => {
  const t = localStorage.getItem("zena_token");
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});

function limparESair() {
  localStorage.removeItem("zena_token");
  localStorage.removeItem("zena_user");
  localStorage.removeItem("zena_refresh");
  if (!window.location.pathname.startsWith("/login")) window.location.href = "/login";
}

// Uma única renovação atende N requisições concorrentes (single-flight).
let renovando: Promise<string | null> | null = null;

async function renovar(): Promise<string | null> {
  const rt = localStorage.getItem("zena_refresh");
  if (!rt) return null;
  try {
    // axios "cru" para não recorrer neste interceptor.
    const res = await axios.post(`${BASE}/auth/refresh`, { refreshToken: rt });
    const { token, refreshToken } = res.data;
    localStorage.setItem("zena_token", token);
    if (refreshToken) localStorage.setItem("zena_refresh", refreshToken);
    api.defaults.headers.Authorization = `Bearer ${token}`;
    return token;
  } catch {
    return null;
  }
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
    const url = original?.url || "";
    const is401 = error.response?.status === 401;

    // Sem tentativa de refresh em rotas de auth, sem config, ou se já tentou nesta req.
    if (!is401 || !original || original._retry || url.includes("/auth/")) {
      if (is401 && !url.includes("/auth/")) limparESair();
      return Promise.reject(error);
    }

    original._retry = true;
    if (!renovando) renovando = renovar().finally(() => { renovando = null; });
    const novo = await renovando;
    if (!novo) {
      limparESair();
      return Promise.reject(error);
    }
    original.headers.Authorization = `Bearer ${novo}`;
    return api(original);
  }
);

export default api;
