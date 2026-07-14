import { useNavigate, useLocation } from "react-router-dom";
import {
  LayoutGrid, Users, Trophy, Award, ClipboardList,
  MessageSquare, BarChart3, Settings, LogOut, Sparkles,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useMensagensNaoLidas } from "../../hooks/useMensagensNaoLidas";
import Avatar from "../Avatar";

const NAV = [
  { label: "Dashboard", icon: LayoutGrid, to: "/app/dashboard" },
  { label: "Pacientes", icon: Users, to: "/app/pacientes" },
  { label: "Ligas", icon: Trophy, to: "/app/ligas" },
  { label: "Desafios", icon: Award, to: "/app/desafios" },
  { label: "Mensagens", icon: MessageSquare, to: "/app/mensagens" },
  { label: "Registros", icon: ClipboardList, to: "/app/feed" },
  { label: "Insights", icon: BarChart3, to: "/app/relatorios" },
  { label: "Configurações", icon: Settings, to: "/app/perfil" },
];

const MOBILE = NAV.slice(0, 6);

// Badge vermelho de não-lidas (mostra 9+ acima de 9).
function BadgeNaoLidas({ count, className = "" }: { count: number; className?: string }) {
  if (count <= 0) return null;
  return (
    <span className={`min-w-[18px] h-[18px] px-1 grid place-items-center rounded-full bg-nx-danger text-white text-[10px] font-bold leading-none ${className}`}>
      {count > 9 ? "9+" : count}
    </span>
  );
}

export function DashboardSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { nutricionista, logout } = useAuth();
  const nome = nutricionista?.nome ?? "Nutricionista";
  const naoLidas = useMensagensNaoLidas();

  const isActive = (to: string) => location.pathname === to || location.pathname.startsWith(to + "/");

  return (
    <>
      {/* Desktop */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:shrink-0 min-h-screen bg-nx-bg border-r border-nx-border px-4 py-6">
        <div className="px-2 mb-8">
          <img src="/nexvel-wordmark.png" alt="Nexvel" className="block h-5 w-auto" />
          <p className="text-label-sm text-nx-on-surface-variant uppercase mt-1.5 tracking-[0.14em]">Nutrition Pro</p>
        </div>

        <nav className="flex-1 flex flex-col gap-1">
          {NAV.map(({ label, icon: Icon, to }) => {
            const active = isActive(to);
            return (
              <button
                key={label}
                onClick={() => navigate(to)}
                aria-current={active ? "page" : undefined}
                className={`group flex items-center gap-3 rounded-nx-md px-3 py-2.5 text-body-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-nx-evo/50 ${
                  active
                    ? "bg-nx-evo/10 text-nx-evo font-semibold"
                    : "text-nx-on-surface-variant hover:bg-nx-surface-hover hover:text-nx-on-surface"
                }`}
              >
                <Icon size={20} className={active ? "text-nx-evo" : "text-nx-outline group-hover:text-nx-on-surface"} />
                <span>{label}</span>
                {to === "/app/mensagens" && <BadgeNaoLidas count={naoLidas} className="ml-auto" />}
              </button>
            );
          })}
        </nav>

        {/* Plano PRO — card de superfície com CTA verde (único acento sólido do shell) */}
        <button
          onClick={() => navigate("/app/planos")}
          className="group mt-6 text-left rounded-nx-lg p-4 bg-nx-container border border-nx-border hover:border-nx-evo/40 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-nx-sm bg-nx-evo/12 text-nx-evo">
              <Sparkles size={16} />
            </span>
            <p className="text-nx-on-surface font-bold text-body-md">Nexvel PRO</p>
          </div>
          <p className="text-nx-on-surface-variant text-body-sm mt-2">Desbloqueie a IA clínica e recursos avançados.</p>
          <span className="mt-3 inline-flex rounded-nx-sm bg-nx-evo text-nx-on-evo font-semibold text-body-sm px-4 py-2 group-hover:bg-nx-evo-2 transition-colors">
            Conhecer o PRO
          </span>
        </button>

        {/* Perfil + logout */}
        <div className="mt-4 flex items-center gap-3 px-1">
          <Avatar src={nutricionista?.foto} nome={nome} tamanho={38} />
          <div className="flex-1 min-w-0">
            <p className="text-nx-on-surface text-body-sm font-semibold truncate">{nome}</p>
            <p className="text-nx-on-surface-variant text-label-sm">Nutricionista</p>
          </div>
          <button onClick={logout} aria-label="Sair" className="text-nx-outline hover:text-nx-danger transition-colors">
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      {/* Mobile bottom-nav */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 flex bg-nx-bg/92 backdrop-blur-lg border-t border-nx-border pb-safe">
        {MOBILE.map(({ label, icon: Icon, to }) => {
          const active = isActive(to);
          return (
            <button
              key={label}
              onClick={() => navigate(to)}
              className="flex-1 flex flex-col items-center gap-1 py-2"
              aria-current={active ? "page" : undefined}
            >
              <span
                className={`relative grid place-items-center rounded-full px-4 py-1 transition-colors ${
                  active ? "bg-nx-evo text-nx-on-evo shadow-nx-evo" : "text-nx-outline"
                }`}
              >
                <Icon size={20} />
                {to === "/app/mensagens" && <BadgeNaoLidas count={naoLidas} className="absolute -top-1 -right-0.5" />}
              </span>
              <span className={`text-label-sm ${active ? "text-nx-evo" : "text-nx-on-surface-variant"}`}>{label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
