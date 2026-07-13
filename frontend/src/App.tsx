import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { AlertasProvider } from "./contexts/AlertasContext";
import { PacienteAuthProvider } from "./contexts/PacienteAuthContext";
import Layout from "./components/Layout";
import PacienteLayout from "./components/PacienteLayout";
import RotaProtegida from "./components/RotaProtegida";
import BannerInstalacao from "./components/BannerInstalacao";

// Lazy-loaded pages — each route only downloads when visited
const Landing       = lazy(() => import("./pages/Landing"));
const Welcome       = lazy(() => import("./pages/Welcome"));
const Login         = lazy(() => import("./pages/Login"));
const Cadastro      = lazy(() => import("./pages/Cadastro"));
const EsqueciSenha  = lazy(() => import("./pages/EsqueciSenha"));
const RedefinirSenha = lazy(() => import("./pages/RedefinirSenha"));
const VerificarEmail = lazy(() => import("./pages/VerificarEmail"));
const Privacidade   = lazy(() => import("./pages/Privacidade"));
const Termos        = lazy(() => import("./pages/Termos"));
const AreaPaciente  = lazy(() => import("./pages/AreaPaciente"));
const Dashboard     = lazy(() => import("./pages/Dashboard"));
const Pacientes     = lazy(() => import("./pages/Pacientes"));
const DiarioBordo   = lazy(() => import("./pages/DiarioBordo"));
const RelatorioMensal = lazy(() => import("./pages/RelatorioMensal"));
const Cobrancas     = lazy(() => import("./pages/Cobrancas"));
const Horarios      = lazy(() => import("./pages/Horarios"));
const Billing       = lazy(() => import("./pages/Billing"));
const Financeiro    = lazy(() => import("./pages/Financeiro"));
const Planos        = lazy(() => import("./pages/Planos"));
const Perfil        = lazy(() => import("./pages/Perfil"));
const Ranking       = lazy(() => import("./pages/Ranking"));
const Ligas         = lazy(() => import("./pages/Ligas"));
const Relatorios    = lazy(() => import("./pages/Relatorios"));
const Desafios      = lazy(() => import("./pages/Desafios"));
const Mensagens     = lazy(() => import("./pages/Mensagens"));
const EmBreve       = lazy(() => import("./pages/EmBreve"));
const DesignShowcase = lazy(() => import("./pages/DesignShowcase"));
const Feed               = lazy(() => import("./pages/Feed"));
const LoginPaciente      = lazy(() => import("./pages/LoginPaciente"));
const VerificarEmailPaciente = lazy(() => import("./pages/VerificarEmailPaciente"));
const Onboarding         = lazy(() => import("./pages/onboarding/OnboardingScreen"));
const NutriLanding       = lazy(() => import("./pages/nutri-landing/NutriLanding"));
const RankingPaciente    = lazy(() => import("./pages/paciente/RankingPaciente"));
const LigasPaciente      = lazy(() => import("./pages/paciente/LigasPaciente"));
const MensagensPaciente  = lazy(() => import("./pages/paciente/MensagensPaciente"));
const ContaPaciente        = lazy(() => import("./pages/paciente/ContaPaciente"));
const InicioPaciente       = lazy(() => import("./pages/paciente/InicioPaciente"));
const RegistroPaciente     = lazy(() => import("./pages/paciente/RegistroPaciente"));
const ProgressoPaciente    = lazy(() => import("./pages/paciente/ProgressoPaciente"));
const EvolucaoPaciente     = lazy(() => import("./pages/paciente/EvolucaoPaciente"));
const DesafiosPaciente     = lazy(() => import("./pages/paciente/DesafiosPaciente"));
const PerfilPaciente       = lazy(() => import("./pages/paciente/PerfilPaciente"));
const RelatorioCiclo       = lazy(() => import("./pages/paciente/RelatorioCiclo"));

function PageSpinner() {
  return (
    <div className="min-h-screen bg-nx-bg flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-nx-evo border-t-transparent rounded-full animate-spin" />
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
        <Route path="/" element={<NutriLanding />} />
        <Route path="/landing" element={<Landing />} />
        <Route path="/welcome" element={<Welcome />} />
        <Route path="/login" element={<Login />} />
        <Route path="/cadastro" element={<Cadastro />} />
        <Route path="/esqueci-senha" element={<EsqueciSenha />} />
        <Route path="/redefinir-senha" element={<RedefinirSenha />} />
        <Route path="/verificar-email" element={<VerificarEmail />} />
        <Route path="/privacidade" element={<Privacidade />} />
        <Route path="/termos" element={<Termos />} />
        <Route path="/ds" element={<DesignShowcase />} />
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
          <Route path="pacientes/:id" element={<DiarioBordo />} />
          <Route path="pacientes/:id/diario" element={<DiarioBordo />} />
          <Route path="pacientes/:id/relatorio" element={<RelatorioMensal />} />
          <Route path="cobrancas" element={<RotaProtegida modulo="financeiro"><Cobrancas /></RotaProtegida>} />
          <Route path="horarios" element={<RotaProtegida modulo="agenda"><Horarios /></RotaProtegida>} />
          <Route path="billing" element={<Billing />} />
          <Route path="financeiro" element={<RotaProtegida modulo="financeiro"><Financeiro /></RotaProtegida>} />
          <Route path="planos" element={<Planos />} />
          <Route path="perfil" element={<Perfil />} />
          <Route path="ligas" element={<RotaProtegida modulo="ranking"><Ligas /></RotaProtegida>} />
          <Route path="ranking" element={<Navigate to="/app/ligas" replace />} />
          <Route path="feed" element={<RotaProtegida modulo="feed"><Feed /></RotaProtegida>} />
          <Route path="desafios" element={<Desafios />} />
          <Route path="mensagens" element={<Mensagens />} />
          <Route path="relatorios" element={<Relatorios />} />
        </Route>
        {/* Paciente routes */}
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/nutri" element={<NutriLanding />} />
        <Route path="/login-paciente" element={<LoginPaciente />} />
        <Route path="/verificar-email-paciente" element={<VerificarEmailPaciente />} />
        <Route path="/paciente" element={<PacienteLayout />}>
          <Route index element={<Navigate to="/paciente/dashboard" replace />} />
          <Route path="dashboard"  element={<InicioPaciente />} />
          <Route path="registro"   element={<RegistroPaciente />} />
          <Route path="progresso"  element={<ProgressoPaciente />} />
          <Route path="evolucao"   element={<EvolucaoPaciente />} />
          <Route path="desafios"   element={<DesafiosPaciente />} />
          <Route path="feed"       element={<Navigate to="/paciente/registro" replace />} />
          <Route path="ranking"    element={<RankingPaciente />} />
          <Route path="ligas"      element={<LigasPaciente />} />
          <Route path="mensagens"  element={<MensagensPaciente />} />
          <Route path="conta"          element={<PerfilPaciente />} />
          <Route path="configuracoes"  element={<ContaPaciente />} />
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
            <BannerInstalacao />
          </BrowserRouter>
        </AlertasProvider>
      </PacienteAuthProvider>
    </AuthProvider>
  );
}
