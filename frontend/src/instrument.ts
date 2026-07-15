// Inicialização do Sentry (frontend) — importar antes de qualquer outro módulo
// no main.tsx. Sem VITE_SENTRY_DSN o SDK fica INERTE: não envia nada, não
// afeta o boot. Espelha o backend (backend/src/instrument.ts).
import * as Sentry from "@sentry/react";

const dsn = import.meta.env.VITE_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    integrations: [Sentry.browserTracingIntegration()],
    // Amostragem de performance (10%). Erros são sempre capturados.
    tracesSampleRate: 0.1,
    // App de saúde: nunca enviar PII (IP, cookies) para o Sentry. É o padrão do
    // SDK, mas explícito para não regredir por acidente.
    sendDefaultPii: false,
  });
}
