import { useNavigate, useLocation } from "react-router-dom";
import {
  LayoutGrid, Users, Trophy, Award, ClipboardList,
  MessageSquare, BarChart3, Settings, LogOut,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import Avatar from "../Avatar";

const NAV = [
  { label: "Dashboard", icon: LayoutGrid, to: "/app/dashboard" },
  { label: "Pacientes", icon: Users, to: "/app/pacientes" },
  { label: "Ligas", icon: Trophy, to: "/app/ligas" },
  { label: "Desafios", icon: Award, to: "/app/desafios" },
  { label: "Registros", icon: ClipboardList, to: "/app/feed" },
  { label: "Mensagens", icon: MessageSquare, to: "/app/mensagens" },
  { label: "Relatórios", icon: BarChart3, to: "/app/relatorios" },
  { label: "Configurações", icon: Settings, to: "/app/perfil" },
];

const MOBILE = NAV.slice(0, 5);

export function DashboardSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { nutricionista, logout } = useAuth();
  const nome = nutricionista?.nome ?? "Nutricionista";

  const isActive = (to: string) => location.pathname === to || location.pathname.startsWith(to + "/");

  return (
    <>
      {/* Desktop */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:shrink-0 min-h-screen bg-nx-bg px-4 py-6">
        <div className="px-2 mb-8">
          <p className="text-on-surface font-extrabold tracking-tight text-[20px] leading-none text-nx-on-surface">NEXVEL</p>
          <p className="text-label-sm text-nx-primary uppercase mt-1">Nutrition Pro</p>
        </div>

        <nav className="flex-1 flex flex-col gap-1">
          {NAV.map(({ label, icon: Icon, to }) => {
            const active = isActive(to);
            return (
              <button
                key={label}
                onClick={() => navigate(to)}
                aria-current={active ? "page" : undefined}
                className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-body-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-nx-primary-container ${
                  active
                    ? "bg-nx-primary-container/20 text-nx-on-surface font-semibold"
                    : "text-nx-on-surface-variant hover:bg-nx-surface-hover hover:text-nx-on-surface"
                }`}
              >
                <Icon size={20} className={active ? "text-nx-primary" : "text-nx-outline group-hover:text-nx-on-surface"} />
                <span>{label}</span>
              </button>
            );
          })}
        </nav>

        {/* Upgrade PRO */}
        <button
          onClick={() => navigate("/app/planos")}
          className="mt-6 text-left rounded-2xl p-4 bg-gradient-to-br from-nx-primary-container to-[#a855f7] shadow-nx-glow"
        >
          <p className="text-white font-bold text-body-md">Upgrade to PRO</p>
          <p className="text-white/80 text-body-sm mt-0.5">Unlock clinical AI</p>
          <span className="mt-3 inline-block rounded-lg bg-white text-nx-primary-container font-semibold text-body-sm px-4 py-1.5">
            Seja pro
          </span>
        </button>

        {/* Perfil + logout */}
        <div className="mt-4 flex items-center gap-3 px-1">
          <Avatar src={nutricionista?.foto} nome={nome} tamanho={38} />
          <div className="flex-1 min-w-0">
            <p className="text-nx-on-surface text-body-sm font-semibold truncate">{nome}</p>
            <p className="text-nx-outline text-label-sm">Nutritionist</p>
          </div>
          <button onClick={logout} aria-label="Sair" className="text-nx-outline hover:text-nx-error transition-colors">
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      {/* Mobile bottom-nav */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 flex bg-nx-bg/90 backdrop-blur-lg border-t border-white/5 pb-safe">
        {MOBILE.map(({ label, icon: Icon, to }) => {
          const active = isActive(to);
          return (
            <button
              key={label}
              onClick={() => navigate(to)}
              className="flex-1 flex flex-col items-center gap-0.5 py-2.5"
              aria-current={active ? "page" : undefined}
            >
              <Icon size={20} className={active ? "text-nx-primary" : "text-nx-outline"} />
              <span className={`text-label-sm ${active ? "text-nx-primary" : "text-nx-outline"}`}>{label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
