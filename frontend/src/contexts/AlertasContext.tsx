import { createContext, useContext, useState, type ReactNode } from "react";

interface AlertasCtxType {
  count: number;
  setCount: (n: number) => void;
}

const AlertasCtx = createContext<AlertasCtxType>({ count: 0, setCount: () => {} });

export function AlertasProvider({ children }: { children: ReactNode }) {
  const [count, setCount] = useState(0);
  return <AlertasCtx.Provider value={{ count, setCount }}>{children}</AlertasCtx.Provider>;
}

export const useAlertas = () => useContext(AlertasCtx);
