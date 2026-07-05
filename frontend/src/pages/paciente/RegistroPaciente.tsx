import { RegistroScreen } from "../../components/paciente/screens/registro-screen";
import { useScreenNav } from "../../components/paciente/useScreenNav";

export default function RegistroPaciente() {
  return <RegistroScreen onNavigate={useScreenNav()} />;
}
