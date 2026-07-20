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
import dashboardRouter from "./routes/dashboard";
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
import { verificarSeguranca } from "./lib/verificacaoSeguranca";
import { assinarMidia, testarAssinatura } from "./lib/midia";
import prisma from "./lib/prisma";

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

// Envs que NÃO impedem o boot, mas cuja ausência quebra um fluxo inteiro em
// silêncio — o backend responde normalmente e o dono só descobre pelo email de
// erro do provedor, semanas depois (foi o que aconteceu com ASAAS_WEBHOOK_TOKEN:
// 100% dos webhooks Pix rejeitados com 401 sem ninguém notar). Aqui o custo do
// alerta é uma linha de log; o custo do silêncio é pagamento que não vira acesso.
const ENV_DEGRADA: Array<{ key: string; impacto: string }> = [
  { key: "ASAAS_WEBHOOK_TOKEN", impacto: "webhooks Asaas rejeitados (401) → pagamento Pix não libera plano nem baixa cobrança" },
  { key: "NEXVEL_ASAAS_API_KEY", impacto: "checkout Pix responde 503 → ninguém consegue assinar por Pix" },
  { key: "STRIPE_SECRET_KEY", impacto: "checkout de cartão indisponível" },
  { key: "STRIPE_WEBHOOK_SECRET", impacto: "webhooks Stripe rejeitados → assinatura paga não libera acesso" },
  { key: "RESEND_API_KEY", impacto: "nenhum email sai (recuperação de senha, convites)" },
  { key: "SUPABASE_URL", impacto: "storage inacessível: upload falha e DELETE de foto (LGPD) não apaga nada" },
  { key: "SUPABASE_SERVICE_KEY", impacto: "upload de fotos de paciente falha" },
  { key: "VAPID_PUBLIC_KEY", impacto: "push desativado silenciosamente" },
  { key: "VAPID_PRIVATE_KEY", impacto: "push vira no-op mesmo com a chave pública setada — o app diz 'ativado' e nada sai" },
  { key: "FRONTEND_URL", impacto: "links de recuperação de senha apontam para localhost → lockout" },
  { key: "SENTRY_DSN", impacto: "nenhum erro reportado — as falhas acima ficam invisíveis" },
];
const degradadas = ENV_DEGRADA.filter((e) => !process.env[e.key]);
if (degradadas.length > 0) {
  console.error(`[STARTUP] ⚠️  ${degradadas.length} variável(is) faltando — funcionalidade degradada, mas o servidor vai subir:`);
  for (const { key, impacto } of degradadas) console.error(`[STARTUP]    · ${key} → ${impacto}`);
}

// ASAAS_ENV é o caso invertido: a ausência não desliga nada, ela aponta o
// sistema inteiro para o sandbox. Em produção isso é pior que uma falha —
// o checkout responde 200 com um QR Code que não cobra dinheiro nenhum.
if (process.env.NODE_ENV === "production" && process.env.ASAAS_ENV !== "production") {
  console.error(
    `[STARTUP] 🚨 NODE_ENV=production mas ASAAS_ENV="${process.env.ASAAS_ENV ?? "(vazio)"}" — todo o Pix está indo para o SANDBOX. ` +
    "Cobranças não são reais. Defina ASAAS_ENV=production."
  );
}

const app = express();
const PORT = parseInt(process.env.PORT || "3001", 10);
const isProd = process.env.NODE_ENV === "production";

// Atrás do proxy da Render, req.ip devolvia o IP do load balancer — o MESMO
// para todo mundo. Como express-rate-limit chaveia por req.ip, os limiters de
// login/cadastro/email viravam um balde único global: 5 tentativas erradas de
// qualquer pessoa (ou de um script) travavam o login de TODAS as clínicas por
// 15 minutos, e a proteção anti-brute-force por IP não existia de fato.
// "1" = confia em exatamente um hop (o proxy da Render). Com `true`, o cliente
// poderia forjar X-Forwarded-For e escolher a própria chave, virando opt-out.
app.set("trust proxy", 1);

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

// Antes das rotas: troca URL pública do Supabase por URL assinada e temporária
// em QUALQUER resposta JSON. Central de propósito — assinar rota a rota deixaria
// buracos silenciosos assim que uma rota nova esquecesse de fazê-lo.
app.use(assinarMidia);

app.use("/api/auth", authRouter);
app.use("/api/auth/paciente", authPacienteRouter);
app.use("/api/paciente-app", pacienteAppRouter);
app.use("/api/pacientes", pacientesRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/onboarding", onboardingRouter);
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

// Prova que a assinatura de mídia funciona ANTES de fechar o bucket no
// Supabase — fechar sem isso significa descobrir pelo app quebrado. Não expõe
// dado: assina um caminho fixo e informa só se conseguiu.
app.get("/api/health/midia", async (_req, res: Response) => {
  try {
    // Precisa de um objeto que EXISTE: a API de assinatura do Supabase recusa
    // caminho inexistente, então um caminho fictício daria falso negativo.
    const amostra =
      (await prisma.pacienteUser.findFirst({ where: { fotoUrl: { not: null } }, select: { fotoUrl: true } }))?.fotoUrl ??
      (await prisma.registroFotos.findFirst({ where: { frenteUrl: { not: null } }, select: { frenteUrl: true } }))?.frenteUrl ??
      (await prisma.paciente.findFirst({ where: { fotoPerfilUrl: { not: null } }, select: { fotoPerfilUrl: true } }))?.fotoPerfilUrl;

    if (!amostra) return res.json({ assinaturaFunciona: null, motivo: "nenhuma mídia cadastrada para testar" });

    const ok = await testarAssinatura(amostra);
    res.json({ assinaturaFunciona: ok });
  } catch (e) {
    res.status(500).json({ assinaturaFunciona: false, erro: (e as Error).message.slice(0, 120) });
  }
});

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

// Roda no fim, com o app já montado — precisa enxergar a config final.
verificarSeguranca(app);

app.listen(PORT, () => console.log(`Zena backend rodando na porta ${PORT}`));
