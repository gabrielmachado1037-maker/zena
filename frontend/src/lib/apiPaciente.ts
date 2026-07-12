import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

const apiPaciente = axios.create({ baseURL: BASE, timeout: 30000 });

apiPaciente.interceptors.request.use((config) => {
  const token = localStorage.getItem("zena_token_paciente");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

function limparESair() {
  localStorage.removeItem("zena_token_paciente");
  localStorage.removeItem("zena_user_paciente");
  localStorage.removeItem("zena_refresh_paciente");
  if (!window.location.pathname.startsWith("/login-paciente")) window.location.href = "/login-paciente";
}

// Uma única renovação atende N requisições concorrentes (single-flight).
let renovando: Promise<string | null> | null = null;

async function renovar(): Promise<string | null> {
  const rt = localStorage.getItem("zena_refresh_paciente");
  if (!rt) return null;
  try {
    const res = await axios.post(`${BASE}/auth/paciente/refresh`, { refreshToken: rt });
    const { token, refreshToken } = res.data;
    localStorage.setItem("zena_token_paciente", token);
    if (refreshToken) localStorage.setItem("zena_refresh_paciente", refreshToken);
    return token;
  } catch {
    return null;
  }
}

apiPaciente.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
    const url = original?.url || "";
    const is401 = error.response?.status === 401;

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
    return apiPaciente(original);
  }
);

export default apiPaciente;
