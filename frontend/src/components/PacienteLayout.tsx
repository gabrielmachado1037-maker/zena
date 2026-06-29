import { Navigate, Outlet } from "react-router-dom";
import { NavLink } from "react-router-dom";
import { Rss, Trophy, Calendar, CreditCard } from "lucide-react";
import { usePacienteAuth } from "../contexts/PacienteAuthContext";

const TABS = [
  { to: "/paciente/feed",      icon: Rss,      label: "Feed" },
  { to: "/paciente/ranking",   icon: Trophy,   label: "Ranking" },
  { to: "/paciente/consultas", icon: Calendar, label: "Consultas" },
  { to: "/paciente/pagamentos",icon: CreditCard,label: "Pagamentos" },
];

function PacienteNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex border-t border-white/10 pb-safe" style={{ background: "#1B4332" }}>
      {TABS.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-colors ${
              isActive ? "text-white" : "text-white/50 hover:text-white/80"
            }`
          }
        >
          <Icon size={22} />
          <span className="text-[10px] font-medium">{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

export default function PacienteLayout() {
  const { token, loading } = usePacienteAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#F9FAF8" }}>
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "#52B788", borderTopColor: "transparent" }} />
      </div>
    );
  }

  if (!token) return <Navigate to="/login-paciente" replace />;

  return (
    <div className="min-h-screen pb-20" style={{ background: "#F9FAF8" }}>
      <Outlet />
      <PacienteNav />
    </div>
  );
}
