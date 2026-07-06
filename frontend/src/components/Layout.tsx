import { useEffect, useState } from "react";
import { Outlet, useLocation, Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { DashboardSidebar } from "./dashboard2/Sidebar";
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
      <div className="min-h-screen bg-nx-bg flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-nx-evo border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const expirado = billing && !billing.planoAtivo && !billing.emTrial;
  const naPlanos = location.pathname === "/app/planos" || location.pathname === "/app/billing";

  if (expirado && !naPlanos) {
    return <Navigate to="/app/planos" replace />;
  }

  return (
    <div className="flex min-h-screen" style={{ background: "#09090B" }}>
      <DashboardSidebar />
      <main className="flex-1 min-w-0 overflow-auto pb-16 lg:pb-0" style={{ background: "#09090B" }}>
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
        >
          <Outlet />
        </motion.div>
      </main>
      {/* Banner de instalação — aparece acima da nav mobile */}
      {isInstallable && !installDismissed && (
        <div className="fixed bottom-16 left-0 right-0 z-30 px-3 pb-2 md:hidden">
          {iosHint ? (
            <div className="bg-nx-container border border-nx-border rounded-nx-lg p-4 shadow-nx-card">
              <p className="text-nx-on-surface font-semibold text-sm mb-1">Instalar no iPhone</p>
              <p className="text-nx-on-surface-variant text-xs leading-relaxed">
                Abra no <strong className="text-nx-on-surface">Safari</strong> → toque em <strong className="text-nx-on-surface">Compartilhar&nbsp;↑</strong> →{" "}
                <strong className="text-nx-on-surface">Adicionar à Tela de Início</strong>
              </p>
              <button
                onClick={() => { setIosHint(false); setInstallDismissed(true); }}
                className="mt-3 text-xs text-nx-outline hover:text-nx-on-surface"
              >
                Fechar
              </button>
            </div>
          ) : (
            <div className="bg-nx-container border border-nx-border rounded-nx-lg px-4 py-3 flex items-center gap-3 shadow-nx-card">
              <Download size={18} className="text-nx-evo flex-shrink-0" />
              <button
                onClick={() => isIOS ? setIosHint(true) : install()}
                className="flex-1 text-left text-nx-on-surface text-sm font-medium"
              >
                Instalar app no celular
              </button>
              <button
                onClick={() => setInstallDismissed(true)}
                className="text-nx-outline hover:text-nx-on-surface flex-shrink-0"
              >
                <X size={16} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
