import { useEffect } from "react";
import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Home, SquarePen, Trophy, BarChart3, User } from "lucide-react";
import { usePacienteAuth } from "../contexts/PacienteAuthContext";
import { PacienteDataProvider } from "../lib/paciente-data";
import api from "../lib/api";

const BG = "#0D0D1A";

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
      className="fixed bottom-0 left-0 right-0 z-40 flex pb-safe"
      style={{ background: BG, borderTop: "1px solid rgba(255,255,255,0.06)" }}
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
              className="flex items-center justify-center rounded-xl"
              style={{
                width: 40, height: 30,
                background: active ? "#7C3AED" : "transparent",
              }}
            >
              <Icon size={19} color={active ? "#FFFFFF" : "#64748B"} strokeWidth={2} />
            </span>
            <span
              className="text-[10px] font-medium"
              style={{ color: active ? "#A78BFA" : "#64748B" }}
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
          style={{ borderColor: "#7C3AED", borderTopColor: "transparent" }}
        />
      </div>
    );
  }

  if (!token) return <Navigate to="/login-paciente" replace />;

  return (
    <PacienteDataProvider>
      <div className="nexvel-dash min-h-screen pb-24" style={{ background: BG }}>
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
