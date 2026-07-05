import { ProgressoScreen } from "../../components/paciente/screens/progresso-screen";
import { useScreenNav } from "../../components/paciente/useScreenNav";

export default function ProgressoPaciente() {
  return <ProgressoScreen onNavigate={useScreenNav()} />;
}
