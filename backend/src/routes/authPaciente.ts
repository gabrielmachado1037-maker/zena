import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import prisma from "../lib/prisma";
import { authMiddleware, AuthRequest, authPacienteMiddleware, PacienteAuthRequest } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { emailVerificacaoPaciente } from "../lib/email";

const registerSchema = z.object({
  email: z.email({ error: "E-mail inválido." }),
  senha: z.string({ error: "A senha deve ter ao menos 6 caracteres." }).min(6, "A senha deve ter ao menos 6 caracteres."),
  codigoVinculo: z.string({ error: "Informe o código de vínculo." }).trim().min(1, "Informe o código de vínculo."),
});

const loginSchema = z.object({
  email: z.string({ error: "Informe o e-mail." }).trim().min(1, "Informe o e-mail."),
  senha: z.string({ error: "Informe a senha." }).min(1, "Informe a senha."),
});

const refreshSchema = z.object({
  refreshToken: z.string({ error: "Sessão inválida." }).min(1, "Sessão inválida."),
});

const verificarEmailSchema = z.object({
  token: z.string({ error: "Token inválido." }).min(1, "Token inválido."),
});

const hashVerif = () => crypto.randomBytes(32).toString("hex");

// Gera token de verificação de e-mail do paciente (24h) e dispara o e-mail (best-effort).
async function criarEnviarVerificacaoPaciente(pacienteUserId: string, email: string, nome: string) {
  const token = hashVerif();
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24);
  await prisma.tokenVerificacaoEmailPaciente.create({ data: { pacienteUserId, token, expiresAt } });
  emailVerificacaoPaciente(email, token, nome).catch(console.error);
}

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET!;

// ── Tokens: access curto (30min) + refresh longo (30d) revogável, rotacionado ──
const ACCESS_TTL = "30m";
const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const hashToken = (t: string) => crypto.createHash("sha256").update(t).digest("hex");

// Emite access+refresh para o paciente; persiste só o HASH do refresh.
async function emitirParTokens(
  pacienteUserId: string,
  pacienteId: string,
  nutricionistaId: string,
  familyId?: string,
) {
  const accessToken = jwt.sign(
    { id: pacienteUserId, role: "paciente", pacienteId, nutricionistaId },
    JWT_SECRET,
    { expiresIn: ACCESS_TTL },
  );
  const refreshToken = crypto.randomBytes(48).toString("hex");
  const fam = familyId ?? crypto.randomBytes(16).toString("hex");
  await prisma.refreshTokenPaciente.create({
    data: { pacienteUserId, tokenHash: hashToken(refreshToken), familyId: fam, expiresAt: new Date(Date.now() + REFRESH_TTL_MS) },
  });
  return { accessToken, refreshToken };
}

// Anti brute-force no app do paciente (mesmo padrão do login da nutri).
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: "Muitas tentativas. Tente novamente em 15 minutos." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Cadastro depende do código de vínculo (6 dígitos) — limita a adivinhação.
const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: "Muitas tentativas de cadastro. Tente novamente em 15 minutos." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Reenvio de verificação de e-mail.
const emailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: { error: "Muitas solicitações. Tente novamente em 1 hora." },
  standardHeaders: true,
  legacyHeaders: false,
});

// POST /api/auth/paciente/register
router.post("/register", registerLimiter, validateBody(registerSchema), async (req: Request, res: Response) => {
  const { email, senha, codigoVinculo } = req.body;
  if (!email || !senha || !codigoVinculo) {
    return res.status(400).json({ error: "Email, senha e código de vínculo são obrigatórios." });
  }
  if (senha.length < 6) {
    return res.status(400).json({ error: "Senha deve ter pelo menos 6 caracteres." });
  }

  const nutri = await prisma.nutricionista.findUnique({ where: { codigoVinculo } });
  if (!nutri) {
    return res.status(404).json({ error: "Código de vínculo inválido. Peça um novo código à sua nutricionista." });
  }

  const paciente = await prisma.paciente.findFirst({
    where: { nutricionistaId: nutri.id, email },
  });
  if (!paciente) {
    return res.status(404).json({ error: "E-mail não encontrado neste consultório. Use o mesmo e-mail cadastrado pela sua nutricionista." });
  }

  const jaExiste = await prisma.pacienteUser.findUnique({ where: { email } });
  if (jaExiste) {
    return res.status(409).json({ error: "E-mail já possui conta. Faça login." });
  }

  const hash = await bcrypt.hash(senha, 10);
  const pacienteUser = await prisma.pacienteUser.create({
    data: { email, senha: hash, pacienteId: paciente.id },
  });

  await criarEnviarVerificacaoPaciente(pacienteUser.id, pacienteUser.email, paciente.nome);
  const { accessToken, refreshToken } = await emitirParTokens(pacienteUser.id, paciente.id, nutri.id);

  res.status(201).json({
    token: accessToken,
    refreshToken,
    paciente: {
      id: paciente.id,
      nome: paciente.nome,
      email: pacienteUser.email,
      nutricionistaNome: nutri.nome,
      nomeConsultorio: nutri.nomeConsultorio,
      fotoUrl: null,
      emailVerificado: false,
    },
  });
});

// POST /api/auth/paciente/login
router.post("/login", loginLimiter, validateBody(loginSchema), async (req: Request, res: Response) => {
  const { email, senha } = req.body;
  if (!email || !senha) {
    return res.status(400).json({ error: "Email e senha são obrigatórios." });
  }

  const pacienteUser = await prisma.pacienteUser.findUnique({
    where: { email },
    include: { paciente: { include: { nutricionista: true } } },
  });
  if (!pacienteUser) return res.status(401).json({ error: "Credenciais inválidas." });

  const ok = await bcrypt.compare(senha, pacienteUser.senha);
  if (!ok) return res.status(401).json({ error: "Credenciais inválidas." });

  const { paciente } = pacienteUser;
  const { accessToken, refreshToken } = await emitirParTokens(pacienteUser.id, paciente.id, paciente.nutricionistaId);

  res.json({
    token: accessToken,
    refreshToken,
    paciente: {
      id: paciente.id,
      nome: paciente.nome,
      email: pacienteUser.email,
      nutricionistaNome: paciente.nutricionista.nome,
      nomeConsultorio: paciente.nutricionista.nomeConsultorio,
      fotoUrl: pacienteUser.fotoUrl ?? null,
      emailVerificado: pacienteUser.emailVerificado,
    },
  });
});

// POST /api/auth/paciente/refresh — troca um refresh válido por um novo par (rotação + reuso).
router.post("/refresh", validateBody(refreshSchema), async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  const registro = await prisma.refreshTokenPaciente.findUnique({ where: { tokenHash: hashToken(refreshToken) } });

  if (!registro || registro.expiresAt < new Date()) {
    return res.status(401).json({ error: "Sessão expirada." });
  }
  if (registro.revogado) {
    // Reuso de um refresh já rotacionado → derruba a família toda.
    await prisma.refreshTokenPaciente.updateMany({ where: { familyId: registro.familyId }, data: { revogado: true } });
    return res.status(401).json({ error: "Sessão inválida." });
  }

  // Reconstrói o payload a partir do vínculo atual do paciente.
  const pu = await prisma.pacienteUser.findUnique({
    where: { id: registro.pacienteUserId },
    include: { paciente: { select: { id: true, nutricionistaId: true } } },
  });
  if (!pu) return res.status(401).json({ error: "Sessão inválida." });

  await prisma.refreshTokenPaciente.update({ where: { id: registro.id }, data: { revogado: true } });
  const par = await emitirParTokens(pu.id, pu.paciente.id, pu.paciente.nutricionistaId, registro.familyId);
  res.json({ token: par.accessToken, refreshToken: par.refreshToken });
});

// POST /api/auth/paciente/logout — revoga o refresh apresentado (best-effort).
router.post("/logout", async (req: Request, res: Response) => {
  const rt = req.body?.refreshToken;
  if (typeof rt === "string" && rt) {
    await prisma.refreshTokenPaciente.updateMany({ where: { tokenHash: hashToken(rt) }, data: { revogado: true } });
  }
  res.json({ ok: true });
});

// POST /api/auth/paciente/verificar-email — consome o token e marca o e-mail como verificado.
router.post("/verificar-email", validateBody(verificarEmailSchema), async (req: Request, res: Response) => {
  const { token } = req.body;
  const registro = await prisma.tokenVerificacaoEmailPaciente.findUnique({ where: { token } });
  if (!registro || registro.usado || registro.expiresAt < new Date()) {
    return res.status(400).json({ error: "Link inválido ou expirado" });
  }
  await prisma.$transaction([
    prisma.pacienteUser.update({ where: { id: registro.pacienteUserId }, data: { emailVerificado: true } }),
    prisma.tokenVerificacaoEmailPaciente.update({ where: { token }, data: { usado: true } }),
  ]);
  res.json({ ok: true });
});

// POST /api/auth/paciente/reenviar-verificacao — reenvia o e-mail (autenticado, rate-limit).
router.post("/reenviar-verificacao", emailLimiter, authPacienteMiddleware, async (req: PacienteAuthRequest, res: Response) => {
  const pu = await prisma.pacienteUser.findUnique({
    where: { id: req.pacienteUserId! },
    include: { paciente: { select: { nome: true } } },
  });
  if (!pu) return res.status(404).json({ error: "Não encontrado" });
  if (pu.emailVerificado) return res.json({ ok: true, jaVerificado: true });
  await criarEnviarVerificacaoPaciente(pu.id, pu.email, pu.paciente.nome);
  res.json({ ok: true });
});

// POST /api/auth/paciente/gerar-codigo — nutricionista gera/renova código de vínculo
router.post("/gerar-codigo", authMiddleware, async (req: AuthRequest, res: Response) => {
  const codigo = crypto.randomInt(100000, 999999).toString();
  const nutri = await prisma.nutricionista.update({
    where: { id: req.nutricionistaId! },
    data: { codigoVinculo: codigo },
    select: { codigoVinculo: true },
  });
  res.json({ codigoVinculo: nutri.codigoVinculo });
});

// GET /api/auth/paciente/codigo-vinculo — nutricionista consulta código atual
router.get("/codigo-vinculo", authMiddleware, async (req: AuthRequest, res: Response) => {
  const nutri = await prisma.nutricionista.findUnique({
    where: { id: req.nutricionistaId! },
    select: { codigoVinculo: true },
  });
  res.json({ codigoVinculo: nutri?.codigoVinculo ?? null });
});

export default router;
