import { MensagensScreen } from "../../components/paciente/screens/mensagens-screen";
import { useScreenNav } from "../../components/paciente/useScreenNav";

export default function MensagensPaciente() {
  return <MensagensScreen onNavigate={useScreenNav()} />;
}
