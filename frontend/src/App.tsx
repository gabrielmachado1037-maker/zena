import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Layout from "./components/Layout";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import EsqueciSenha from "./pages/EsqueciSenha";
import RedefinirSenha from "./pages/RedefinirSenha";
import Dashboard from "./pages/Dashboard";
import Pacientes from "./pages/Pacientes";
import PacienteDetalhe from "./pages/PacienteDetalhe";
import Cobrancas from "./pages/Cobrancas";
import AreaPaciente from "./pages/AreaPaciente";
import Horarios from "./pages/Horarios";
import Billing from "./pages/Billing";
import Privacidade from "./pages/Privacidade";
import Termos from "./pages/Termos";
import Cadastro from "./pages/Cadastro";
import Perfil from "./pages/Perfil";
import Financeiro from "./pages/Financeiro";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-zena-cream flex items-center justify-center"><div className="w-8 h-8 border-2 border-zena-green-light border-t-transparent rounded-full animate-spin" /></div>;
  return token ? <>{children}</> : <Navigate to="/login" replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/cadastro" element={<Cadastro />} />
      <Route path="/esqueci-senha" element={<EsqueciSenha />} />
      <Route path="/redefinir-senha" element={<RedefinirSenha />} />
      <Route path="/privacidade" element={<Privacidade />} />
      <Route path="/termos" element={<Termos />} />
      <Route path="/p/:link" element={<AreaPaciente />} />
      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/app/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="pacientes" element={<Pacientes />} />
        <Route path="pacientes/:id" element={<PacienteDetalhe />} />
        <Route path="cobrancas" element={<Cobrancas />} />
        <Route path="horarios" element={<Horarios />} />
        <Route path="billing" element={<Billing />} />
        <Route path="financeiro" element={<Financeiro />} />
        <Route path="perfil" element={<Perfil />} />
      </Route>
      {/* Legacy routes redirect */}
      <Route path="/dashboard" element={<Navigate to="/app/dashboard" replace />} />
      <Route path="/pacientes/*" element={<Navigate to="/app/pacientes" replace />} />
      <Route path="/cobrancas" element={<Navigate to="/app/cobrancas" replace />} />
      <Route path="/horarios" element={<Navigate to="/app/horarios" replace />} />
      <Route path="/billing" element={<Navigate to="/app/billing" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
