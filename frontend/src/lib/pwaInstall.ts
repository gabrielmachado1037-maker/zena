// Detecção de plataforma / contexto para o guia de instalação do PWA.

export type Plataforma = "ios" | "android" | "desktop";

export function getPlataforma(): Plataforma {
  const ua = (navigator.userAgent || "").toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return "ios";
  if (/android/.test(ua)) return "android";
  return "desktop";
}

/** App já instalado (rodando em modo standalone / tela de início). */
export function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

/** Navegador embutido (WhatsApp/Instagram/Facebook/WebView) — não instala PWA;
 *  precisa abrir no Safari/Chrome primeiro. Detecção heurística (não 100%). */
export function isInAppBrowser(): boolean {
  const ua = (navigator.userAgent || "").toLowerCase();
  return (
    ua.includes("fban") || ua.includes("fbav") || // Facebook
    ua.includes("instagram") ||
    ua.includes("whatsapp") ||
    ua.includes("line/") ||
    ua.includes("; wv)") // Android WebView (embutido)
  );
}
