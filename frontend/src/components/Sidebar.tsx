import { useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { Home, Users, CalendarDays, FileText, Trophy, BarChart2, Rss, Settings, LogOut, Download } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { usePWAInstall } from "../hooks/usePWAInstall";

function getInitials(nome: string) {
  return nome.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
}

const NAV = [
  { to: "/app/dashboard", icon: Home,          label: "Início" },
  { to: "/app/pacientes", icon: Users,         label: "Pacientes" },
  { to: "/app/horarios",  icon: CalendarDays,  label: "Agenda" },
  { to: "/app/planos-alimentares", icon: FileText, label: "Planos" },
  { to: "/app/ranking",   icon: Trophy,         label: "Ranking" },
  { to: "/app/financeiro",icon: BarChart2,     label: "Financeiro" },
  { to: "/app/feed",      icon: Rss,           label: "Feed" },
  { to: "/app/perfil",    icon: Settings,      label: "Configurações" },
];

export default function Sidebar() {
  const { nutricionista, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { isInstallable, isIOS, install } = usePWAInstall();
  const [iosHint, setIosHint] = useState(false);

  function handleLogout() {
    logout();
    navigate("/login");
  }

  const firstName = nutricionista?.nome.split(" ")[0] ?? "";
  const initials = getInitials(nutricionista?.nome ?? "?");

  return (
    <aside className="hidden md:flex md:flex-col w-56 min-h-screen bg-zena-green-dark flex-shrink-0">

      {/* Logo */}
      <div className="px-5 pt-7 pb-6">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-[17px] leading-none tracking-tight">C</span>
          </div>
          <span className="text-white font-semibold text-[17px] tracking-wide">clinne</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-0.5">
        {NAV.map(({ to, icon: Icon, label }) => {
          const isActive = location.pathname === to || location.pathname.startsWith(to + "/");
          return (
            <Link
              key={label}
              to={to}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13.5px] font-medium transition-all ${
                isActive
                  ? "bg-white/10 text-white"
                  : "text-white/55 hover:text-white hover:bg-white/8"
              }`}
            >
              <Icon size={16} strokeWidth={isActive ? 2 : 1.5} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* PWA install */}
      {isInstallable && (
        <div className="px-3 pb-1">
          <button
            onClick={() => isIOS ? setIosHint(h => !h) : install()}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium text-white/40 hover:text-white/70 hover:bg-white/8 transition-all w-full"
          >
            <Download size={15} strokeWidth={1.5} />
            Instalar app
          </button>
          {iosHint && (
            <div className="mx-1 mt-1 px-3 py-2.5 bg-white/10 rounded-xl text-[11px] text-white/70 leading-relaxed">
              No Safari: toque em <strong>Compartilhar ↑</strong> →{" "}
              <strong>Adicionar à Tela de Início</strong>
              <button onClick={() => setIosHint(false)} className="block mt-1.5 text-white/40 hover:text-white text-[10px]">
                fechar
              </button>
            </div>
          )}
        </div>
      )}

      {/* Footer — perfil */}
      <div className="px-3 pb-5 pt-2 border-t border-white/8 mt-2">
        <Link
          to="/app/perfil"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/10 transition-colors group"
        >
          {nutricionista?.logoConsultorio ? (
            <img
              src={nutricionista.logoConsultorio}
              alt={firstName}
              className="w-8 h-8 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-semibold">{initials}</span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-white text-[13px] font-medium leading-tight truncate">{firstName}</p>
            <p className="text-white/40 text-[11px]">Ver meu perfil</p>
          </div>
          <button
            onClick={(e) => { e.preventDefault(); handleLogout(); }}
            className="text-white/25 hover:text-white/70 transition-colors flex-shrink-0"
            title="Sair"
          >
            <LogOut size={14} />
          </button>
        </Link>
      </div>
    </aside>
  );
}
