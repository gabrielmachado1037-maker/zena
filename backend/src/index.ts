import "./instrument"; // Sentry — precisa ser o primeiro import
import * as Sentry from "@sentry/node";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import authRouter from "./routes/auth";
import authPacienteRouter from "./routes/authPaciente";
import pacienteAppRouter from "./routes/pacienteApp";
import pacientesRouter from "./routes/pacientes";
import cobrancasRouter from "./routes/cobrancas";
import dashboardRouter from "./routes/dashboard";
import checkinsRouter from "./routes/checkins";
import mensagensRouter from "./routes/mensagens";
import anamneseRouter from "./routes/anamnese";
import horariosRouter from "./routes/horarios";
import lembretesRouter from "./routes/lembretes";
import billingRouter, { webhookHandler } from "./routes/billing";
import financeiroRouter from "./routes/financeiro";
import fotosRouter from "./routes/fotos";
import registroFotosRouter from "./routes/registroFotos";
import consultasRouter from "./routes/consultas";
import rankingRouter from "./routes/ranking";
import feedRouter from "./routes/feed";
import notificacoesRouter from "./routes/notificacoes";
import ciclosRouter from "./routes/ciclos";
import checklistDiarioRouter from "./routes/checklistDiario";
import registrosRouter from "./routes/registros";
import registrosFeedRouter from "./routes/registrosFeed";
import diarioNutriRouter from "./routes/diarioNutri";
import relatoriosRouter from "./routes/relatorios";
import desafiosRouter from "./routes/desafios";
import onboardingRouter from "./routes/onboarding";
import { initCron } from "./cron";

dotenv.config();

// Fail fast se variáveis críticas estiverem faltando
const REQUIRED_ENV = ["JWT_SECRET", "DATABASE_URL"];
const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
if (missing.length > 0) {
  console.error(`[STARTUP] Variáveis de ambiente faltando: ${missing.join(", ")}`);
  process.exit(1);
}
if (!process.env.ENCRYPTION_KEY || process.env.ENCRYPTION_KEY.length < 64) {
  console.error("[STARTUP] ENCRYPTION_KEY ausente ou inválida (esperado 64 caracteres hex). Configure-a para não salvar segredos em texto puro.");
  process.exit(1);
}

const app = express();
const PORT = parseInt(process.env.PORT || "3001", 10);
const isProd = process.env.NODE_ENV === "production";

// Headers de segurança (API JSON). crossOriginResourcePolicy: cross-origin
// porque o front consome via fetch/CORS de outra origem.
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));

// CORS por ambiente:
// - Allowlist explícita de produção = FRONTEND_URL + ALLOWED_ORIGINS (CSV opcional).
// - Fora de produção libera também localhost/127.0.0.1/IP de LAN (Vite faz fallback de porta; testes via --host no celular).
// - Requisições sem Origin (curl / apps mobile) seguem liberadas.
const allowlist = new Set(
  [process.env.FRONTEND_URL, ...(process.env.ALLOWED_ORIGINS?.split(",") ?? [])]
    .map((o) => o?.trim())
    .filter((o): o is string => !!o),
);
const isLocalhost = (o?: string) => !!o && /^http:\/\/(localhost|127\.0\.0\.1|(\d{1,3}\.){3}\d{1,3}):\d+$/.test(o);
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (allowlist.has(origin)) return cb(null, true);
    if (!isProd && isLocalhost(origin)) return cb(null, true);
    return cb(null, false);
  },
  credentials: true,
}));

// Stripe webhook needs raw body — must be before express.json()
app.post("/api/billing/webhook", express.raw({ type: "application/json" }), (req: Request, res: Response) => {
  webhookHandler(req, res);
});

app.use(express.json({ limit: "10mb" }));

app.use("/api/auth", authRouter);
app.use("/api/auth/paciente", authPacienteRouter);
app.use("/api/paciente-app", pacienteAppRouter);
app.use("/api/pacientes", pacientesRouter);
app.use("/api/cobrancas", cobrancasRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/onboarding", onboardingRouter);
app.use("/api/checkins", checkinsRouter);
app.use("/api/mensagens", mensagensRouter);
app.use("/api/anamnese", anamneseRouter);
app.use("/api/horarios", horariosRouter);
app.use("/api/lembretes", lembretesRouter);
app.use("/api/billing", billingRouter);
app.use("/api/financeiro", financeiroRouter);
app.use("/api/fotos", fotosRouter);
app.use("/api/registro-fotos", registroFotosRouter);
app.use("/api/consultas", consultasRouter);
app.use("/api/ranking", rankingRouter);
app.use("/api/feed", feedRouter);
app.use("/api/notificacoes", notificacoesRouter);
app.use("/api/ciclos", ciclosRouter);
app.use("/api/checklist", checklistDiarioRouter);
app.use("/api/registros", registrosRouter);
app.use("/api/registros-feed", registrosFeedRouter);
app.use("/api/diario", diarioNutriRouter);
app.use("/api/relatorios", relatoriosRouter);
app.use("/api/desafios", desafiosRouter);

app.get("/api/health", (_, res) => res.json({ ok: true }));

initCron();

// Captura os erros no Sentry (no-op sem SENTRY_DSN) — depois das rotas, antes do handler final.
Sentry.setupExpressErrorHandler(app);

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  // Erros de cliente explícitos (ex.: UploadError) — 4xx com mensagem segura para o usuário.
  const e = err as Error & { status?: number; statusCode?: number; expose?: boolean };
  const status = e.status ?? e.statusCode;
  if (typeof status === "number" && status >= 400 && status < 500 && e.expose) {
    return res.status(status).json({ error: err.message });
  }
  // Demais erros: log completo no servidor, mensagem genérica ao cliente (não vaza internals).
  console.error("[ERROR]", err.message, err.stack);
  res.status(500).json({ error: "Erro interno do servidor." });
});

app.listen(PORT, () => console.log(`Zena backend rodando na porta ${PORT}`));
