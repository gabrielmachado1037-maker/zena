import { useState } from "react";
import { NavLink } from "react-router-dom";
import { LayoutDashboard, Users, Trophy, Rss, CalendarDays, User, Lock } from "lucide-react";
import { useAlertas } from "../contexts/AlertasContext";
import { usePermissao } from "../hooks/usePermissao";
import ModalUpsell from "./ModalUpsell";

const links = [
  { to: "/app/dashboard", icon: LayoutDashboard, label: "Início",   modulo: null },
  { to: "/app/pacientes", icon: Users,           label: "Pacientes",modulo: null },
  { to: "/app/ranking",   icon: Trophy,          label: "Ranking",  modulo: "ranking" },
  { to: "/app/feed",      icon: Rss,             label: "Feed",     modulo: "feed" },
  { to: "/app/horarios",  icon: CalendarDays,    label: "Agenda",   modulo: "agenda" },
  { to: "/app/perfil",    icon: User,            label: "Conta",    modulo: null },
];

export default function MobileNav() {
  const { count: alertCount } = useAlertas();
  const { temAcesso } = usePermissao();
  const [modalModulo, setModalModulo] = useState<string | null>(null);

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-zena-green-dark border-t border-white/10 flex md:hidden pb-safe">
        {links.map(({ to, icon: Icon, label, modulo }) => {
          const bloqueado = modulo !== null && !temAcesso(modulo);

          if (bloqueado) {
            return (
              <button
                key={to}
                onClick={() => setModalModulo(modulo)}
                className="flex-1 flex flex-col items-center justify-center py-3 gap-1 text-zena-mint/35 relative"
              >
                <div className="relative">
                  <Icon size={22} />
                  <Lock size={10} className="absolute -top-1 -right-2" />
                </div>
                <span className="text-[10px] font-medium">{label}</span>
              </button>
            );
          }

          return (
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
          );
        })}
      </nav>

      {modalModulo && (
        <ModalUpsell
          modulo={modalModulo}
          onClose={() => setModalModulo(null)}
        />
      )}
    </>
  );
}
