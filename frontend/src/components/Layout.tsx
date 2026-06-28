import { useEffect, useState } from "react";
import { Outlet, useLocation, Navigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import MobileNav from "./MobileNav";
import api from "../lib/api";
import { usePWAInstall } from "../hooks/usePWAInstall";
import { usePushNotifications } from "../hooks/usePushNotifications";
import { Download, X } from "lucide-react";

interface BillingStatus {
  planoAtivo: boolean;
  emTrial: boolean;
}

export default function Layout() {
  const location = useLocation();
  const [billing, setBilling] = useState<BillingStatus | null>(null);
  const [checked, setChecked] = useState(false);
  const { isInstallable, isIOS, install } = usePWAInstall();
  usePushNotifications();
  const [installDismissed, setInstallDismissed] = useState(false);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    api.get<BillingStatus>("/billing/status")
      .then((r) => setBilling(r.data))
      .catch(() => setBilling({ planoAtivo: true, emTrial: true }))
      .finally(() => setChecked(true));
  }, []);

  if (!checked) {
    return (
      <div className="min-h-screen bg-zena-cream flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-zena-green-light border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const expirado = billing && !billing.planoAtivo && !billing.emTrial;
  const naPlanos = location.pathname === "/app/planos" || location.pathname === "/app/billing";

  if (expirado && !naPlanos) {
    return <Navigate to="/app/planos" replace />;
  }

  return (
    <div className="flex min-h-screen bg-zena-cream">
      <Sidebar />
      <main className="flex-1 overflow-auto pb-16 md:pb-0">
        <Outlet />
      </main>
      {/* Banner de instalação — aparece acima da nav mobile */}
      {isInstallable && !installDismissed && (
        <div className="fixed bottom-16 left-0 right-0 z-30 px-3 pb-2 md:hidden">
          {iosHint ? (
            <div className="bg-zena-green-dark border border-white/10 rounded-2xl p-4 shadow-2xl">
              <p className="text-white font-semibold text-sm mb-1">Instalar no iPhone</p>
              <p className="text-zena-mint text-xs leading-relaxed">
                Abra no <strong>Safari</strong> → toque em <strong>Compartilhar&nbsp;↑</strong> →{" "}
                <strong>Adicionar à Tela de Início</strong>
              </p>
              <button
                onClick={() => { setIosHint(false); setInstallDismissed(true); }}
                className="mt-3 text-xs text-zena-mint/60 hover:text-white"
              >
                Fechar
              </button>
            </div>
          ) : (
            <div className="bg-zena-green-dark border border-white/10 rounded-2xl px-4 py-3 flex items-center gap-3 shadow-2xl">
              <Download size={18} className="text-zena-mint flex-shrink-0" />
              <button
                onClick={() => isIOS ? setIosHint(true) : install()}
                className="flex-1 text-left text-white text-sm font-medium"
              >
                Instalar app no celular
              </button>
              <button
                onClick={() => setInstallDismissed(true)}
                className="text-white/40 hover:text-white flex-shrink-0"
              >
                <X size={16} />
              </button>
            </div>
          )}
        </div>
      )}
      <MobileNav />
    </div>
  );
}
