import { useEffect } from "react";
import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Home, SquarePen, Trophy, BarChart3, User } from "lucide-react";
import { usePacienteAuth } from "../contexts/PacienteAuthContext";
import { PacienteDataProvider } from "../lib/paciente-data";
import api from "../lib/api";

const BG = "#09090B";

const TABS = [
  { to: "/paciente/dashboard", icon: Home,       label: "Início" },
  { to: "/paciente/registro",  icon: SquarePen,  label: "Registro" },
  { to: "/paciente/desafios",  icon: Trophy,     label: "Desafios" },
  { to: "/paciente/ranking",   icon: BarChart3,  label: "Ranking" },
  { to: "/paciente/conta",     icon: User,       label: "Perfil" },
];

function PacienteNav() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 flex pb-safe backdrop-blur-lg"
      style={{ background: "rgba(9,9,11,0.92)", borderTop: "1px solid #2A2F38" }}
    >
      {TABS.map(({ to, icon: Icon, label }) => {
        const active = location.pathname === to || location.pathname.startsWith(to + "/");
        return (
          <button
            key={to}
            onClick={() => navigate(to)}
            className="flex-1 flex flex-col items-center justify-center gap-1 pt-2.5 pb-1.5"
          >
            <span
              className="flex items-center justify-center rounded-xl transition-colors"
              style={{
                width: 40, height: 30,
                background: active ? "#7CFF5B" : "transparent",
                boxShadow: active ? "0 0 16px rgba(124,255,91,0.35)" : undefined,
              }}
            >
              <Icon size={19} color={active ? "#08130A" : "#6B7280"} strokeWidth={active ? 2.4 : 2} />
            </span>
            <span
              className="text-[10px] font-medium transition-colors"
              style={{ color: active ? "#7CFF5B" : "#6B7280" }}
            >
              {label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

async function subscribePush(token: string) {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
  try {
    const { data } = await api.get<{ key: string | null }>("/notificacoes/vapid-public-key");
    if (!data.key) return;
    const reg = await navigator.serviceWorker.ready;
    const existing = await reg.pushManager.getSubscription();
    const sub = existing ?? await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(data.key),
    });
    await api.post(
      "/paciente-app/push/subscribe",
      {
        endpoint: sub.endpoint,
        keys: {
          p256dh: arrayBufferToBase64(sub.getKey("p256dh")!),
          auth: arrayBufferToBase64(sub.getKey("auth")!),
        },
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );
  } catch { /* push is optional */ }
}

function urlBase64ToUint8Array(b: string) {
  const padding = "=".repeat((4 - (b.length % 4)) % 4);
  const base64 = (b + padding).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from([...atob(base64)].map(c => c.charCodeAt(0)));
}

function arrayBufferToBase64(buf: ArrayBuffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

export default function PacienteLayout() {
  const { token, loading } = usePacienteAuth();
  const location = useLocation();

  useEffect(() => {
    if (token) subscribePush(token);
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: BG }}>
        <div
          className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: "#7CFF5B", borderTopColor: "transparent" }}
        />
      </div>
    );
  }

  if (!token) return <Navigate to="/login-paciente" replace />;

  return (
    <PacienteDataProvider>
      <div className="nexvel-dash min-h-[100dvh] pt-[env(safe-area-inset-top)] pb-[calc(6rem_+_env(safe-area-inset-bottom))]" style={{ background: BG }}>
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: "easeOut" }}
        >
          <Outlet />
        </motion.div>
        <PacienteNav />
      </div>
    </PacienteDataProvider>
  );
}
