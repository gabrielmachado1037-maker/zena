import { useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import api from "../lib/api";

// Contagem global de mensagens de pacientes não lidas (badge da barra do nutri).
// Rebusca ao montar, ao navegar (ex.: entrar/sair de uma conversa marca lidas),
// ao focar a janela e a cada 45s.
export function useMensagensNaoLidas(): number {
  const [total, setTotal] = useState(0);
  const location = useLocation();

  const buscar = useCallback(async () => {
    try {
      const { data } = await api.get<{ total: number }>("/mensagens/nao-lidas");
      setTotal(data?.total ?? 0);
    } catch {
      /* silencioso — badge some se a chamada falhar */
    }
  }, []);

  useEffect(() => { buscar(); }, [buscar, location.pathname]);

  useEffect(() => {
    const id = setInterval(buscar, 45_000);
    const onFocus = () => buscar();
    window.addEventListener("focus", onFocus);
    return () => { clearInterval(id); window.removeEventListener("focus", onFocus); };
  }, [buscar]);

  return total;
}
