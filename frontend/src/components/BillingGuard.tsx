import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import api from "../lib/api";

interface BillingStatus {
  planoAtivo: boolean;
  emTrial: boolean;
}

/** Bloqueia o acesso quando o plano expirou (nem ativo, nem em trial),
 *  redirecionando para /app/planos. Mesma regra usada no Layout. */
export default function BillingGuard({ children }: { children: React.ReactNode }) {
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
      <div className="min-h-screen bg-nexvel-bg-primary flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-nexvel-purple-light border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const expirado = billing && !billing.planoAtivo && !billing.emTrial;
  const naPlanos = location.pathname === "/app/planos" || location.pathname === "/app/billing";
  if (expirado && !naPlanos) return <Navigate to="/app/planos" replace />;

  return <>{children}</>;
}
