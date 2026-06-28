import { useEffect } from "react";
import api from "../lib/api";

function urlBase64ToUint8Array(base64: string): ArrayBuffer {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + pad).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr.buffer as ArrayBuffer;
}

export function usePushNotifications() {
  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    // Não pede se o usuário já decidiu
    if (Notification.permission === "denied") return;

    async function register() {
      // Busca a chave pública VAPID do backend
      const { data } = await api.get<{ key: string | null }>("/notificacoes/vapid-public-key");
      if (!data.key) return; // backend sem VAPID configurado

      const reg = await navigator.serviceWorker.ready;

      // Verifica se já existe subscription ativa
      const existing = await reg.pushManager.getSubscription();
      if (existing) {
        // Re-envia para garantir que está salva no banco
        await api.post("/notificacoes/subscribe", existing.toJSON()).catch(() => null);
        return;
      }

      // Pede permissão apenas se ainda não foi concedida
      if (Notification.permission !== "granted") {
        const perm = await Notification.requestPermission();
        if (perm !== "granted") return;
      }

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(data.key),
      });
      await api.post("/notificacoes/subscribe", sub.toJSON()).catch(() => null);
    }

    // Aguarda 3s para não bloquear o carregamento inicial
    const t = setTimeout(() => register().catch(console.error), 3000);
    return () => clearTimeout(t);
  }, []);
}
