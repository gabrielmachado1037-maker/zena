import { HomeScreen } from "../../components/paciente/screens/home-screen";
import { useScreenNav } from "../../components/paciente/useScreenNav";

export default function InicioPaciente() {
  return <HomeScreen onNavigate={useScreenNav()} />;
}
