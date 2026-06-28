import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { AlertasProvider } from "./contexts/AlertasContext";
import Layout from "./components/Layout";

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
          <Route path="pacientes/:id" element={<PacienteDetalhe />} />
          <Route path="cobrancas" element={<Cobrancas />} />
          <Route path="horarios" element={<Horarios />} />
          <Route path="billing" element={<Billing />} />
          <Route path="financeiro" element={<Financeiro />} />
          <Route path="planos" element={<Planos />} />
          <Route path="perfil" element={<Perfil />} />
          <Route path="ranking" element={<Ranking />} />
          <Route path="feed" element={<Feed />} />
          <Route path="planos-alimentares" element={<PlanosAlimentares />} />
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
      <AlertasProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AlertasProvider>
    </AuthProvider>
  );
}
