import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { NavLink } from "react-router-dom";
import { LayoutDashboard, Rss, Trophy, Calendar, CreditCard, User } from "lucide-react";
import { usePacienteAuth } from "../contexts/PacienteAuthContext";
import api from "../lib/api";

const TABS = [
  { to: "/paciente/dashboard",  icon: LayoutDashboard, label: "Dashboard" },
  { to: "/paciente/feed",        icon: Rss,             label: "Feed" },
  { to: "/paciente/ranking",     icon: Trophy,          label: "Ranking" },
  { to: "/paciente/consultas",   icon: Calendar,        label: "Consultas" },
  { to: "/paciente/pagamentos",  icon: CreditCard,      label: "Pagamentos" },
  { to: "/paciente/conta",       icon: User,            label: "Conta" },
];

const FRASE_KEY = "pac_frase_v1";

function getInitials(nome: string) {
  return nome.split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase();
}

function saudacaoDinamica(nome: string) {
  const h = new Date().getHours();
  const n = nome.split(" ")[0];
  if (h < 12) return `Bom dia, ${n}! ☀️`;
  if (h < 18) return `Boa tarde, ${n}! 👋`;
  return `Boa noite, ${n}! 🌙`;
}

function PacienteHeader({ frase }: { frase: string }) {
  const { paciente } = usePacienteAuth();
  if (!paciente) return null;
  return (
    <div
      className="px-5 pb-4"
      style={{
        background: "#1B4332",
        paddingTop: "max(env(safe-area-inset-top), 44px)",
      }}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-[17px] font-bold text-white leading-tight">
            {saudacaoDinamica(paciente.nome)}
          </p>
          {frase && (
            <p className="text-[12px] mt-0.5 line-clamp-1"
              style={{ color: "rgba(255,255,255,0.70)" }}>
              {frase}
            </p>
          )}
        </div>
        <div className="w-11 h-11 rounded-full overflow-hidden ring-2 ring-white/30 flex-shrink-0">
          {paciente.fotoUrl ? (
            <img src={paciente.fotoUrl} alt={paciente.nome} className="w-full h-full object-cover" />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center text-white font-bold text-[15px]"
              style={{ background: "#2D6A4F" }}
            >
              {getInitials(paciente.nome)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PacienteNav() {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 flex pb-safe border-t border-white/10"
      style={{ background: "#1B4332" }}
    >
      {TABS.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center justify-center pt-2.5 pb-1.5 gap-0.5 transition-colors ${
              isActive ? "text-white" : "text-white/45"
            }`
          }
        >
          {({ isActive }) => (
            <>
              <Icon size={18} />
              <span className="text-[8px] font-medium">{label}</span>
              {isActive && (
                <div className="w-1 h-1 bg-white rounded-full" />
              )}
              {!isActive && <div className="w-1 h-1" />}
            </>
          )}
        </NavLink>
      ))}
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
  const [frase, setFrase] = useState("");

  useEffect(() => {
    if (!token) return;
    const cached = sessionStorage.getItem(FRASE_KEY);
    if (cached) { setFrase(cached); return; }
    api
      .get<{ frase: string }>("/paciente-app/frase-motivacional", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then(r => {
        setFrase(r.data.frase);
        sessionStorage.setItem(FRASE_KEY, r.data.frase);
      })
      .catch(() => setFrase("Pequenas escolhas fazem grandes transformações."));
  }, [token]);

  useEffect(() => {
    if (token) subscribePush(token);
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#F9FAF8" }}>
        <div
          className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: "#52B788", borderTopColor: "transparent" }}
        />
      </div>
    );
  }

  if (!token) return <Navigate to="/login-paciente" replace />;

  return (
    <div className="min-h-screen pb-20" style={{ background: "#F5F5F0" }}>
      <PacienteHeader frase={frase} />
      <Outlet />
      <PacienteNav />
    </div>
  );
}
