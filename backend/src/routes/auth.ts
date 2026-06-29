import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import rateLimit from "express-rate-limit";
import prisma from "../lib/prisma";
import { emailBoasVindas, emailRecuperacaoSenha } from "../lib/email";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import { uploadFoto } from "../lib/supabase";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET!;

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: "Muitas tentativas. Tente novamente em 15 minutos." },
  standardHeaders: true,
  legacyHeaders: false,
});

const emailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: { error: "Muitas solicitações. Tente novamente em 1 hora." },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post("/register", async (req: Request, res: Response) => {
  const { nome, email, senha, crn, nomeConsultorio } = req.body;
  if (!nome || !email || !senha || !crn) {
    return res.status(400).json({ error: "Campos obrigatórios faltando" });
  }

  const existe = await prisma.nutricionista.findUnique({ where: { email } });
  if (existe) return res.status(409).json({ error: "E-mail já cadastrado" });

  const hash = await bcrypt.hash(senha, 10);
  const trialEnd = new Date();
  trialEnd.setDate(trialEnd.getDate() + 29);

  const nutri = await prisma.nutricionista.create({
    data: { nome, email, senha: hash, crn, trialEnd, nomeConsultorio: nomeConsultorio || null },
  });

  emailBoasVindas(nome, email).catch(console.error);

  const token = jwt.sign({ id: nutri.id }, JWT_SECRET, { expiresIn: "7d" });
  res.json({ token, nutricionista: { id: nutri.id, nome: nutri.nome, email: nutri.email, crn: nutri.crn, foto: null, nomeConsultorio: nutri.nomeConsultorio, logoConsultorio: nutri.logoConsultorio, enderecoConsultorio: nutri.enderecoConsultorio, planoSlug: null, subscriptionStatus: "trial", modulosAtivos: [] } });
});

router.post("/login", loginLimiter, async (req: Request, res: Response) => {
  const { email, senha } = req.body;

  const nutri = await prisma.nutricionista.findUnique({ where: { email } });
  if (!nutri) return res.status(401).json({ error: "Credenciais inválidas" });

  const ok = await bcrypt.compare(senha, nutri.senha);
  if (!ok) return res.status(401).json({ error: "Credenciais inválidas" });

  const token = jwt.sign({ id: nutri.id }, JWT_SECRET, { expiresIn: "7d" });
  res.json({ token, nutricionista: { id: nutri.id, nome: nutri.nome, email: nutri.email, crn: nutri.crn, foto: nutri.foto ?? null, nomeConsultorio: nutri.nomeConsultorio, logoConsultorio: nutri.logoConsultorio, enderecoConsultorio: nutri.enderecoConsultorio, planoSlug: nutri.planoSlug ?? null, subscriptionStatus: nutri.subscriptionStatus ?? "trial", modulosAtivos: nutri.modulosAtivos ?? [] } });
});

router.post("/esqueci-senha", emailLimiter, async (req: Request, res: Response) => {
  const { email } = req.body;
  const nutri = await prisma.nutricionista.findUnique({ where: { email } });

  // Always return 200 to not reveal if email exists
  if (!nutri) return res.json({ ok: true });

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 hora

  await prisma.tokenRedefinicao.create({
    data: { nutricionistaId: nutri.id, token, expiresAt },
  });

  emailRecuperacaoSenha(email, token, nutri.nome).catch(console.error);
  res.json({ ok: true });
});

router.post("/redefinir-senha", async (req: Request, res: Response) => {
  const { token, novaSenha } = req.body;
  if (!token || !novaSenha) return res.status(400).json({ error: "Dados inválidos" });

  const registro = await prisma.tokenRedefinicao.findUnique({ where: { token } });
  if (!registro || registro.usado || registro.expiresAt < new Date()) {
    return res.status(400).json({ error: "Link inválido ou expirado" });
  }

  const hash = await bcrypt.hash(novaSenha, 10);
  await prisma.nutricionista.update({
    where: { id: registro.nutricionistaId },
    data: { senha: hash },
  });
  await prisma.tokenRedefinicao.update({ where: { token }, data: { usado: true } });

  res.json({ ok: true });
});

router.get("/me", authMiddleware, async (req: AuthRequest, res: Response) => {
  const nutri = await prisma.nutricionista.findUnique({
    where: { id: req.nutricionistaId as string },
    select: { id: true, nome: true, email: true, crn: true, nomeConsultorio: true, logoConsultorio: true, enderecoConsultorio: true },
  });
  if (!nutri) return res.status(404).json({ error: "Não encontrado" });
  res.json(nutri);
});

router.put("/perfil", authMiddleware, async (req: AuthRequest, res: Response) => {
  const { nome, crn, senhaAtual, novaSenha, nomeConsultorio, logoConsultorio, enderecoConsultorio } = req.body;
  if (!nome || !crn) return res.status(400).json({ error: "Nome e CRN são obrigatórios" });

  const nutri = await prisma.nutricionista.findUnique({ where: { id: req.nutricionistaId as string } });
  if (!nutri) return res.status(404).json({ error: "Não encontrado" });

  const updateData: any = {
    nome,
    crn,
    nomeConsultorio: nomeConsultorio ?? nutri.nomeConsultorio,
    logoConsultorio: logoConsultorio !== undefined ? logoConsultorio : nutri.logoConsultorio,
    enderecoConsultorio: enderecoConsultorio !== undefined ? enderecoConsultorio : nutri.enderecoConsultorio,
  };

  if (novaSenha) {
    if (!senhaAtual) return res.status(400).json({ error: "Informe a senha atual para alterá-la" });
    const ok = await bcrypt.compare(senhaAtual, nutri.senha);
    if (!ok) return res.status(400).json({ error: "Senha atual incorreta" });
    if (novaSenha.length < 6) return res.status(400).json({ error: "Nova senha deve ter pelo menos 6 caracteres" });
    updateData.senha = await bcrypt.hash(novaSenha, 10);
  }

  const atualizado = await prisma.nutricionista.update({
    where: { id: nutri.id },
    data: updateData,
    select: { id: true, nome: true, email: true, crn: true, nomeConsultorio: true, logoConsultorio: true, enderecoConsultorio: true },
  });

  res.json(atualizado);
});

router.put("/perfil/foto", authMiddleware, async (req: AuthRequest, res: Response) => {
  const { fotoBase64 } = req.body as { fotoBase64: string };
  if (!fotoBase64?.startsWith("data:image/")) {
    return res.status(400).json({ error: "Imagem inválida" });
  }
  const path = `nutri/${req.nutricionistaId!}/${Date.now()}.jpg`;
  const foto = await uploadFoto(path, fotoBase64);
  await prisma.nutricionista.update({ where: { id: req.nutricionistaId! }, data: { foto } });
  return res.json({ foto });
});

router.put("/consultorio", authMiddleware, async (req: AuthRequest, res: Response) => {
  const { nomeConsultorio, logoConsultorio, enderecoConsultorio } = req.body;
  const atualizado = await prisma.nutricionista.update({
    where: { id: req.nutricionistaId as string },
    data: {
      nomeConsultorio: nomeConsultorio !== undefined ? nomeConsultorio : undefined,
      logoConsultorio: logoConsultorio !== undefined ? logoConsultorio : undefined,
      enderecoConsultorio: enderecoConsultorio !== undefined ? enderecoConsultorio : undefined,
    },
    select: { id: true, nome: true, email: true, crn: true, nomeConsultorio: true, logoConsultorio: true, enderecoConsultorio: true },
  });
  res.json(atualizado);
});

export default router;
