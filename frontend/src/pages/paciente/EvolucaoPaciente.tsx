import { EvolucaoScreen } from "../../components/paciente/screens/evolucao-screen";
import { useScreenNav } from "../../components/paciente/useScreenNav";

export default function EvolucaoPaciente() {
  return <EvolucaoScreen onNavigate={useScreenNav()} />;
}
