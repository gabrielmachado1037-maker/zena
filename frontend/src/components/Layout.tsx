import { useEffect, useState } from "react";
import { Outlet, useLocation, Navigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import api from "../lib/api";

interface BillingStatus {
  planoAtivo: boolean;
  emTrial: boolean;
}

export default function Layout() {
  const location = useLocation();
  const [billing, setBilling] = useState<BillingStatus | null>(null);
  const [checked, setChecked] = useState(false);

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
  const naBilling = location.pathname === "/app/billing";

  if (expirado && !naBilling) {
    return <Navigate to="/app/billing" replace />;
  }

  return (
    <div className="flex min-h-screen bg-zena-cream">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
