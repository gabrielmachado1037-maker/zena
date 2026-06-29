import axios from "axios";

const apiPaciente = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3001/api",
  timeout: 30000,
});

apiPaciente.interceptors.request.use((config) => {
  const token = localStorage.getItem("zena_token_paciente");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

apiPaciente.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("zena_token_paciente");
      localStorage.removeItem("zena_user_paciente");
      window.location.href = "/login-paciente";
    }
    return Promise.reject(error);
  }
);

export default apiPaciente;
