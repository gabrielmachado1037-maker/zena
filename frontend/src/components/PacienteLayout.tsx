import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Home, SquarePen, Trophy, BarChart3, Stethoscope, User, Clock } from "lucide-react";
import { usePacienteAuth } from "../contexts/PacienteAuthContext";
import { statusParceria } from "../lib/parceria";
import apiPaciente from "../lib/apiPaciente";
import { PacienteDataProvider } from "../lib/paciente-data";
import EmailVerificacaoBannerPaciente from "./EmailVerificacaoBannerPaciente";
import api from "../lib/api";
import { pingNotificacaoAberta } from "../lib/pushPaciente";

const BG = "#09090B";

const TABS = [
  { to: "/paciente/dashboard", icon: Home,        label: "Início" },
  { to: "/paciente/registro",  icon: SquarePen,   label: "Registro" },
  { to: "/paciente/desafios",  icon: Trophy,      label: "Desafios" },
  { to: "/paciente/ranking",   icon: BarChart3,   label: "Ranking" },
  { to: "/paciente/parceria",  icon: Stethoscope, label: "Nutri" },
  { to: "/paciente/conta",     icon: User,        label: "Perfil" },
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
  const { token, loading, paciente, logout } = usePacienteAuth();
  const location = useLocation();

  // Gate B2B: acesso definido pela nutri venceu → tela de "acesso terminou".
  // Otimista (não segura a UI enquanto checa); só bloqueia quando confirma vencido.
  const [bloqueadoB2b, setBloqueadoB2b] = useState(false);
  useEffect(() => {
    if (!token || paciente?.avulso) return; // avulso não tem prazo B2B
    let vivo = true;
    apiPaciente.get<{ bloqueado: boolean }>("/paciente-app/acesso")
      .then(({ data }) => vivo && setBloqueadoB2b(!!data.bloqueado))
      .catch(() => { /* offline: não bloqueia */ });
    return () => { vivo = false; };
  }, [token, paciente?.avulso]);

  // Gate do paciente AVULSO (B2C): sem acesso de marketplace ativo, o app fica
  // focado na escolha/contratação (Opção A). null = ainda verificando.
  // Re-checa ao navegar enquanto ainda não confirmou acesso — assim, logo após
  // pagar, o paciente é liberado sem precisar recarregar. Depois de ativo, para.
  const [acessoAtivo, setAcessoAtivo] = useState<boolean | null>(null);
  useEffect(() => {
    if (!token || !paciente?.avulso || acessoAtivo === true) return;
    if (location.pathname.startsWith("/paciente/parceria")) return; // na área do marketplace não precisa checar
    let vivo = true;
    setAcessoAtivo(null);
    statusParceria().then((s) => vivo && setAcessoAtivo(s.ativo)).catch(() => vivo && setAcessoAtivo(false));
    return () => { vivo = false; };
    // acessoAtivo fora das deps de propósito (evita loop de re-fetch); relê o valor atual a cada navegação.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, paciente?.avulso, location.pathname]);

  useEffect(() => {
    if (!token) return;
    subscribePush(token);
    // Registra o acesso (base da reativação). Fire-and-forget.
    api.post("/paciente-app/ping", {}, { headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
  }, [token]);

  // Rastreio de abertura de notificação: deep-link ?n=<logId> → registra e limpa a URL.
  useEffect(() => {
    if (!token) return;
    const params = new URLSearchParams(location.search);
    const n = params.get("n");
    if (!n) return;
    pingNotificacaoAberta(n);
    params.delete("n");
    const qs = params.toString();
    window.history.replaceState({}, "", location.pathname + (qs ? `?${qs}` : "") + location.hash);
  }, [token, location.search, location.pathname, location.hash]);

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

  // Acesso B2B vencido → tela de bloqueio (paciente perde o app até a nutri renovar).
  if (!paciente?.avulso && bloqueadoB2b) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center px-8 text-center" style={{ background: BG }}>
        <div className="grid size-16 place-items-center rounded-full" style={{ background: "rgba(255,93,93,0.12)" }}>
          <Clock size={30} color="#FF5D5D" />
        </div>
        <h1 className="mt-5 text-[22px] font-extrabold text-white">Seu acesso terminou</h1>
        <p className="mt-2 max-w-xs text-body-md" style={{ color: "#A1A1AA" }}>
          O período de acesso ao app venceu. Fale com seu nutricionista para renovar e continuar sua evolução.
        </p>
        <button
          onClick={logout}
          className="mt-7 rounded-xl border border-white/10 px-5 py-2.5 text-body-sm font-semibold text-white transition-colors hover:bg-white/5"
        >
          Sair
        </button>
      </div>
    );
  }

  // Paciente avulso sem acesso ativo → só pode ficar na área do marketplace.
  if (paciente?.avulso) {
    const naParceria = location.pathname.startsWith("/paciente/parceria");
    if (!naParceria) {
      if (acessoAtivo === null) {
        return (
          <div className="min-h-screen flex items-center justify-center" style={{ background: BG }}>
            <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "#7CFF5B", borderTopColor: "transparent" }} />
          </div>
        );
      }
      if (!acessoAtivo) return <Navigate to="/paciente/parceria" replace />;
    }
  }

  return (
    <PacienteDataProvider>
      <div className="nexvel-dash min-h-[100dvh] pt-[env(safe-area-inset-top)] pb-[calc(6rem_+_env(safe-area-inset-bottom))]" style={{ background: BG }}>
        <EmailVerificacaoBannerPaciente />
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
