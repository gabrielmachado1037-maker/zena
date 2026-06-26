import express, { Request, Response } from "express";
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
import { initCron } from "./cron";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());

// Stripe webhook needs raw body — must be before express.json()
app.post("/api/billing/webhook", express.raw({ type: "application/json" }), (req: Request, res: Response) => {
  webhookHandler(req, res);
});

app.use(express.json({ limit: "5mb" }));

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

app.get("/api/health", (_, res) => res.json({ ok: true }));

initCron();

app.listen(PORT, () => console.log(`Zena backend rodando na porta ${PORT}`));
