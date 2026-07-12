// Inicialização do Sentry — DEVE ser importada antes de qualquer outro módulo
// (auto-instrumenta http/express, captura uncaughtException/unhandledRejection).
// Sem SENTRY_DSN o SDK fica inerte: não envia nada e não afeta o boot.
import * as dotenv from "dotenv";
import * as Sentry from "@sentry/node";

dotenv.config();

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || "development",
  // Amostragem de performance (10%). Erros são sempre capturados.
  tracesSampleRate: 0.1,
});
