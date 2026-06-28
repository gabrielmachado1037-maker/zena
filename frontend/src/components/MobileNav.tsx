import { NavLink } from "react-router-dom";
import { LayoutDashboard, Users, Trophy, Rss, CalendarDays, User } from "lucide-react";
import { useAlertas } from "../contexts/AlertasContext";

const links = [
  { to: "/app/dashboard", icon: LayoutDashboard, label: "Início" },
  { to: "/app/pacientes", icon: Users,           label: "Pacientes" },
  { to: "/app/ranking",   icon: Trophy,          label: "Ranking" },
  { to: "/app/feed",      icon: Rss,             label: "Feed" },
  { to: "/app/horarios",  icon: CalendarDays,    label: "Agenda" },
  { to: "/app/perfil",    icon: User,            label: "Conta" },
];

export default function MobileNav() {
  const { count: alertCount } = useAlertas();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-zena-green-dark border-t border-white/10 flex md:hidden pb-safe">
      {links.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-colors ${
              isActive ? "text-white" : "text-zena-mint/60 hover:text-zena-mint"
            }`
          }
        >
          <div className="relative">
            <Icon size={22} />
            {to === "/app/dashboard" && alertCount > 0 && (
              <span className="absolute -top-1 -right-2 bg-red-500 text-white text-[8px] font-bold min-w-[14px] h-3.5 rounded-full flex items-center justify-center px-0.5">
                {alertCount > 9 ? "9+" : alertCount}
              </span>
            )}
          </div>
          <span className="text-[10px] font-medium">{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
