import { Navigate, useLocation } from "react-router-dom";
import { usePermissao } from "../hooks/usePermissao";
import type { ReactNode } from "react";

interface Props {
  modulo: string;
  children: ReactNode;
}

export default function RotaProtegida({ modulo, children }: Props) {
  const { temAcesso } = usePermissao();
  const location = useLocation();

  if (!temAcesso(modulo)) {
    return (
      <Navigate
        to={`/app/planos?modulo=${modulo}&origem=url_direta`}
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  return <>{children}</>;
}
