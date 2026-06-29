import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { AlertasProvider } from "./contexts/AlertasContext";
import { PacienteAuthProvider } from "./contexts/PacienteAuthContext";
import Layout from "./components/Layout";
import PacienteLayout from "./components/PacienteLayout";
import RotaProtegida from "./components/RotaProtegida";

// Lazy-loaded pages — each route only downloads when visited
const Landing       = lazy(() => import("./pages/Landing"));
const Login         = lazy(() => import("./pages/Login"));
const Cadastro      = lazy(() => import("./pages/Cadastro"));
const EsqueciSenha  = lazy(() => import("./pages/EsqueciSenha"));
const RedefinirSenha = lazy(() => import("./pages/RedefinirSenha"));
const Privacidade   = lazy(() => import("./pages/Privacidade"));
const Termos        = lazy(() => import("./pages/Termos"));
const AreaPaciente  = lazy(() => import("./pages/AreaPaciente"));
const Dashboard     = lazy(() => import("./pages/Dashboard"));
const Pacientes     = lazy(() => import("./pages/Pacientes"));
const PacienteDetalhe = lazy(() => import("./pages/PacienteDetalhe"));
const Cobrancas     = lazy(() => import("./pages/Cobrancas"));
const Horarios      = lazy(() => import("./pages/Horarios"));
const Billing       = lazy(() => import("./pages/Billing"));
const Financeiro    = lazy(() => import("./pages/Financeiro"));
const Planos        = lazy(() => import("./pages/Planos"));
const Perfil        = lazy(() => import("./pages/Perfil"));
const Ranking       = lazy(() => import("./pages/Ranking"));
const Feed               = lazy(() => import("./pages/Feed"));
const PlanosAlimentares  = lazy(() => import("./pages/PlanosAlimentares"));
const LoginPaciente      = lazy(() => import("./pages/LoginPaciente"));
const FeedPaciente       = lazy(() => import("./pages/paciente/FeedPaciente"));
const RankingPaciente    = lazy(() => import("./pages/paciente/RankingPaciente"));
const ConsultasPaciente  = lazy(() => import("./pages/paciente/ConsultasPaciente"));
const PagamentosPaciente = lazy(() => import("./pages/paciente/PagamentosPaciente"));
const ContaPaciente        = lazy(() => import("./pages/paciente/ContaPaciente"));
const DashboardPaciente    = lazy(() => import("./pages/paciente/DashboardPaciente"));
const RelatorioCiclo       = lazy(() => import("./pages/paciente/RelatorioCiclo"));

function PageSpinner() {
  return (
    <div className="min-h-screen bg-zena-cream flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-zena-green-light border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token, loading } = useAuth();
  if (loading) return <PageSpinner />;
  return token ? <>{children}</> : <Navigate to="/login" replace />;
}

function AppRoutes() {
  return (
    <Suspense fallback={<PageSpinner />}>
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
          <Route path="pacientes/:id" element={<RotaProtegida modulo="prontuario"><PacienteDetalhe /></RotaProtegida>} />
          <Route path="cobrancas" element={<RotaProtegida modulo="financeiro"><Cobrancas /></RotaProtegida>} />
          <Route path="horarios" element={<RotaProtegida modulo="agenda"><Horarios /></RotaProtegida>} />
          <Route path="billing" element={<Billing />} />
          <Route path="financeiro" element={<RotaProtegida modulo="financeiro"><Financeiro /></RotaProtegida>} />
          <Route path="planos" element={<Planos />} />
          <Route path="perfil" element={<Perfil />} />
          <Route path="ranking" element={<RotaProtegida modulo="ranking"><Ranking /></RotaProtegida>} />
          <Route path="feed" element={<RotaProtegida modulo="feed"><Feed /></RotaProtegida>} />
          <Route path="planos-alimentares" element={<RotaProtegida modulo="plano_alimentar"><PlanosAlimentares /></RotaProtegida>} />
        </Route>
        {/* Paciente routes */}
        <Route path="/login-paciente" element={<LoginPaciente />} />
        <Route path="/paciente" element={<PacienteLayout />}>
          <Route index element={<Navigate to="/paciente/dashboard" replace />} />
          <Route path="dashboard"  element={<DashboardPaciente />} />
          <Route path="feed"       element={<FeedPaciente />} />
          <Route path="ranking"    element={<RankingPaciente />} />
          <Route path="consultas"  element={<ConsultasPaciente />} />
          <Route path="pagamentos" element={<PagamentosPaciente />} />
          <Route path="conta"      element={<ContaPaciente />} />
          <Route path="relatorio/:cicloId" element={<RelatorioCiclo />} />
        </Route>

        <Route path="/dashboard" element={<Navigate to="/app/dashboard" replace />} />
        <Route path="/pacientes/*" element={<Navigate to="/app/pacientes" replace />} />
        <Route path="/cobrancas" element={<Navigate to="/app/cobrancas" replace />} />
        <Route path="/horarios" element={<Navigate to="/app/horarios" replace />} />
        <Route path="/billing" element={<Navigate to="/app/billing" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <PacienteAuthProvider>
        <AlertasProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </AlertasProvider>
      </PacienteAuthProvider>
    </AuthProvider>
  );
}
