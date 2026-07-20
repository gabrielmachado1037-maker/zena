import { useEffect } from "react";
import api from "../lib/api";
import { registrarSubscription } from "../lib/pushConflito";

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

      // Pede permissão apenas se ainda não foi concedida (e só se não houver
      // subscription — com uma ativa, a permissão já foi dada antes).
      const existing = await reg.pushManager.getSubscription();
      if (!existing && Notification.permission !== "granted") {
        const perm = await Notification.requestPermission();
        if (perm !== "granted") return;
      }

      // registrarSubscription reaproveita a subscription existente, e troca o
      // endpoint se o backend acusar que ele pertence a outra conta (409).
      await registrarSubscription(
        reg,
        urlBase64ToUint8Array(data.key),
        (sub) => api.post("/notificacoes/subscribe", sub.toJSON()),
      );
    }

    // Aguarda 3s para não bloquear o carregamento inicial
    const t = setTimeout(() => register().catch(console.error), 3000);
    return () => clearTimeout(t);
  }, []);
}
