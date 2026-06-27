import { NavLink, useNavigate, Link } from "react-router-dom";
import { LayoutDashboard, Users, DollarSign, LogOut, Leaf, CalendarDays, CreditCard, BarChart2 } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

const links = [
  { to: "/app/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/app/pacientes", icon: Users, label: "Pacientes" },
  { to: "/app/cobrancas", icon: DollarSign, label: "Cobranças" },
  { to: "/app/financeiro", icon: BarChart2, label: "Financeiro" },
  { to: "/app/horarios", icon: CalendarDays, label: "Agenda" },
];

export default function Sidebar() {
  const { nutricionista, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  const initials = nutricionista?.nome
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase() || "Z";

  return (
    <aside className="w-60 min-h-screen bg-zena-green-dark flex flex-col">
      <div className="px-6 py-8">
        <div className="flex items-center gap-2">
          <Leaf className="text-zena-mint" size={24} />
          <span className="text-white font-bold text-xl tracking-wide">clinne</span>
        </div>
        <p className="text-zena-text-light text-xs mt-1 ml-8">seu consultório. simplificado.</p>
      </div>

      <nav className="flex-1 px-3">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl mb-1 text-sm font-medium transition-all ${
                isActive
                  ? "bg-zena-green-mid text-white"
                  : "text-zena-mint hover:bg-zena-green-mid/50 hover:text-white"
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="px-3 pb-6 space-y-1">
        <NavLink
          to="/app/planos"
          className={({ isActive }) =>
            `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              isActive
                ? "bg-zena-green-mid text-white"
                : "text-zena-mint hover:bg-zena-green-mid/50 hover:text-white"
            }`
          }
        >
          <CreditCard size={18} />
          Planos
        </NavLink>
        <Link
          to="/app/perfil"
          className="flex items-center gap-3 px-4 py-3 rounded-xl bg-zena-green-mid/30 hover:bg-zena-green-mid/50 transition-colors group"
        >
          <div className="w-8 h-8 rounded-full bg-zena-green-light flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{nutricionista?.nome.split(" ")[0]}</p>
            <p className="text-zena-text-light text-xs">{nutricionista?.crn}</p>
          </div>
          <button
            onClick={(e) => { e.preventDefault(); handleLogout(); }}
            className="text-zena-text-light hover:text-white"
            title="Sair"
          >
            <LogOut size={16} />
          </button>
        </Link>
      </div>
    </aside>
  );
}
