import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import prisma from "../lib/prisma";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import { validateBody } from "../middleware/validate";

const registerSchema = z.object({
  email: z.email({ error: "E-mail inválido." }),
  senha: z.string({ error: "A senha deve ter ao menos 6 caracteres." }).min(6, "A senha deve ter ao menos 6 caracteres."),
  codigoVinculo: z.string({ error: "Informe o código de vínculo." }).trim().min(1, "Informe o código de vínculo."),
});

const loginSchema = z.object({
  email: z.string({ error: "Informe o e-mail." }).trim().min(1, "Informe o e-mail."),
  senha: z.string({ error: "Informe a senha." }).min(1, "Informe a senha."),
});

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET!;

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

  const token = jwt.sign(
    { id: pacienteUser.id, role: "paciente", pacienteId: paciente.id, nutricionistaId: nutri.id },
    JWT_SECRET,
    { expiresIn: "30d" }
  );

  res.status(201).json({
    token,
    paciente: {
      id: paciente.id,
      nome: paciente.nome,
      email: pacienteUser.email,
      nutricionistaNome: nutri.nome,
      nomeConsultorio: nutri.nomeConsultorio,
      fotoUrl: null,
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
  const token = jwt.sign(
    { id: pacienteUser.id, role: "paciente", pacienteId: paciente.id, nutricionistaId: paciente.nutricionistaId },
    JWT_SECRET,
    { expiresIn: "30d" }
  );

  res.json({
    token,
    paciente: {
      id: paciente.id,
      nome: paciente.nome,
      email: pacienteUser.email,
      nutricionistaNome: paciente.nutricionista.nome,
      nomeConsultorio: paciente.nutricionista.nomeConsultorio,
      fotoUrl: pacienteUser.fotoUrl ?? null,
    },
  });
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
