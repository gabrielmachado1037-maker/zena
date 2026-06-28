import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRouter from "./routes/auth";
import pacientesRouter from "./routes/pacientes";
import cobrancasRouter from "./routes/cobrancas";
import dashboardRouter from "./routes/dashboard";
import publicaRouter from "./routes/publica";
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
import dailyQuoteRouter from "./routes/daily-quote";
import rankingRouter from "./routes/ranking";
import feedRouter from "./routes/feed";
import planosAlimentaresRouter from "./routes/planosAlimentares";
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
  console.warn("[STARTUP] ENCRYPTION_KEY não configurada — chaves Asaas serão salvas sem criptografia.");
}

const app = express();
const PORT = parseInt(process.env.PORT || "3001", 10);

const allowedOrigins = process.env.FRONTEND_URL
  ? [process.env.FRONTEND_URL, "http://localhost:5173"]
  : ["http://localhost:5173"];

app.use(cors({ origin: allowedOrigins, credentials: true }));

// Stripe webhook needs raw body — must be before express.json()
app.post("/api/billing/webhook", express.raw({ type: "application/json" }), (req: Request, res: Response) => {
  webhookHandler(req, res);
});

app.use(express.json({ limit: "10mb" }));

app.use("/api/auth", authRouter);
app.use("/api/pacientes", pacientesRouter);
app.use("/api/cobrancas", cobrancasRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/public", publicaRouter);
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
app.use("/api/daily-quote", dailyQuoteRouter);
app.use("/api/ranking", rankingRouter);
app.use("/api/feed", feedRouter);
app.use("/api/planos-alimentares", planosAlimentaresRouter);

app.get("/api/health", (_, res) => res.json({ ok: true }));

initCron();

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("[ERROR]", err.message, err.stack);
  res.status(500).json({ error: err.message });
});

app.listen(PORT, () => console.log(`Zena backend rodando na porta ${PORT}`));
