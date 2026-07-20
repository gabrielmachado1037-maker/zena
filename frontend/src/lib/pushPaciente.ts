import apiPaciente from "./apiPaciente";
import { registrarSubscription } from "./pushConflito";

// Helpers de Web Push (paciente). Centraliza o subscribe + fuso + rastreio de abertura,
// evitando duplicar a conversão de chave espalhada pelo app.

function urlBase64ToUint8Array(b: string) {
  const padding = "=".repeat((4 - (b.length % 4)) % 4);
  const base64 = (b + padding).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from([...atob(base64)].map((c) => c.charCodeAt(0)));
}
function arrayBufferToBase64(buf: ArrayBuffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

export function pushSuportado(): boolean {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

/** Permissão já decidida (granted/denied)? Se sim, não faz sentido mostrar o opt-in. */
export function permissaoDecidida(): boolean {
  return pushSuportado() && Notification.permission !== "default";
}

export type ResultadoPush = "ok" | "negado" | "indisponivel";

/** Pede permissão (gesto do usuário), subscreve e salva o fuso do dispositivo. */
export async function ativarPushPaciente(): Promise<ResultadoPush> {
  if (!pushSuportado()) return "indisponivel";
  const perm = await Notification.requestPermission();
  if (perm !== "granted") return "negado";
  try {
    const { data } = await apiPaciente.get<{ key: string | null }>("/notificacoes/vapid-public-key");
    if (!data.key) return "indisponivel";
    const reg = await navigator.serviceWorker.ready;
    // Troca o endpoint se o backend acusar que ele é de outra conta (409) —
    // acontece quando o aparelho já foi usado por outro paciente.
    const sub = await registrarSubscription(
      reg,
      urlBase64ToUint8Array(data.key),
      (s) => apiPaciente.post("/paciente-app/push/subscribe", {
        endpoint: s.endpoint,
        keys: { p256dh: arrayBufferToBase64(s.getKey("p256dh")!), auth: arrayBufferToBase64(s.getKey("auth")!) },
      }),
    );
    if (!sub) return "indisponivel";
    // Salva o fuso do dispositivo (quiet hours respeitam o horário do paciente).
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz) await apiPaciente.put("/paciente-app/prefs-notificacao", { timezone: tz }).catch(() => {});
    return "ok";
  } catch {
    return "indisponivel";
  }
}

/** Registra a abertura de uma notificação (deep-link ?n=<logId>). */
export async function pingNotificacaoAberta(id: string): Promise<void> {
  await apiPaciente.post("/paciente-app/notificacao-aberta", { id }).catch(() => {});
}
