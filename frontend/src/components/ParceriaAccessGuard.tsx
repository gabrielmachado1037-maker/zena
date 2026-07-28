import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { statusParceria } from "../lib/parceria";

/**
 * Gate de front dos recursos do parceiro (ranking, chat, dieta, vídeo): sem
 * acesso de 30 dias ATIVO, redireciona ao hub /paciente/parceria (que mostra
 * renovar/escolher). Espelha o gate do backend (exigirAcessoParceria). Modelado
 * no BillingGuard. Fail-closed: erro de rede não libera o recurso pago.
 */
export default function ParceriaAccessGuard({ children }: { children: React.ReactNode }) {
  const [ativo, setAtivo] = useState<boolean | null>(null);

  useEffect(() => {
    statusParceria()
      .then((s) => setAtivo(s.ativo))
      .catch(() => setAtivo(false));
  }, []);

  if (ativo === null) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-2 border-nx-evo border-t-transparent" />
      </div>
    );
  }
  if (!ativo) return <Navigate to="/paciente/parceria" replace />;
  return <>{children}</>;
}
