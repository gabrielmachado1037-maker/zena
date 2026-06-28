import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3001/api",
  timeout: 30000,
});

// Redireciona para login automaticamente se o token expirar
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401 && !error.config?.url?.includes("/auth/")) {
      localStorage.removeItem("zena_token");
      localStorage.removeItem("zena_user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default api;
