import { useCallback, useEffect, useState } from "react";
import api from "../lib/api";

export interface FetchState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/** Fetch tipado sobre o cliente axios `api` (já injeta Authorization: Bearer <zena_token>). */
export function useFetch<T>(url: string | null): FetchState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(() => {
    if (!url) return;
    setLoading(true);
    setError(null);
    api
      .get<T>(url)
      .then((r) => setData(r.data))
      .catch((e) => setError(e?.response?.data?.error ?? e?.message ?? "Erro ao carregar"))
      .finally(() => setLoading(false));
  }, [url]);

  useEffect(() => {
    run();
  }, [run]);

  return { data, loading, error, refetch: run };
}
