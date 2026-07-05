import { PerfilScreen } from "../../components/paciente/screens/perfil-screen";
import { useScreenNav } from "../../components/paciente/useScreenNav";

export default function PerfilPaciente() {
  return <PerfilScreen onNavigate={useScreenNav()} />;
}
