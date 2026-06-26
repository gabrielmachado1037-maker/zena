import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import prisma from "../lib/prisma";
import { emailBoasVindas, emailRecuperacaoSenha } from "../lib/email";
import { authMiddleware, AuthRequest } from "../middleware/auth";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "zena-secret-2024";

router.post("/register", async (req: Request, res: Response) => {
  const { nome, email, senha, crn } = req.body;
  if (!nome || !email || !senha || !crn) {
    return res.status(400).json({ error: "Campos obrigatórios faltando" });
  }

  const existe = await prisma.nutricionista.findUnique({ where: { email } });
  if (existe) return res.status(409).json({ error: "E-mail já cadastrado" });

  const hash = await bcrypt.hash(senha, 10);
  const trialEnd = new Date();
  trialEnd.setDate(trialEnd.getDate() + 29);

  const nutri = await prisma.nutricionista.create({
    data: { nome, email, senha: hash, crn, trialEnd },
  });

  emailBoasVindas(nome, email).catch(console.error);

  const token = jwt.sign({ id: nutri.id }, JWT_SECRET, { expiresIn: "7d" });
  res.json({ token, nutricionista: { id: nutri.id, nome: nutri.nome, email: nutri.email, crn: nutri.crn } });
});

router.post("/login", async (req: Request, res: Response) => {
  const { email, senha } = req.body;

  const nutri = await prisma.nutricionista.findUnique({ where: { email } });
  if (!nutri) return res.status(401).json({ error: "Credenciais inválidas" });

  const ok = await bcrypt.compare(senha, nutri.senha);
  if (!ok) return res.status(401).json({ error: "Credenciais inválidas" });

  const token = jwt.sign({ id: nutri.id }, JWT_SECRET, { expiresIn: "7d" });
  res.json({ token, nutricionista: { id: nutri.id, nome: nutri.nome, email: nutri.email, crn: nutri.crn } });
});

router.post("/esqueci-senha", async (req: Request, res: Response) => {
  const { email } = req.body;
  const nutri = await prisma.nutricionista.findUnique({ where: { email } });

  // Always return 200 to not reveal if email exists
  if (!nutri) return res.json({ ok: true });

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 hora

  await prisma.tokenRedefinicao.create({
    data: { nutricionistaId: nutri.id, token, expiresAt },
  });

  emailRecuperacaoSenha(email, token).catch(console.error);
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
    select: { id: true, nome: true, email: true, crn: true },
  });
  if (!nutri) return res.status(404).json({ error: "Não encontrado" });
  res.json(nutri);
});

router.put("/perfil", authMiddleware, async (req: AuthRequest, res: Response) => {
  const { nome, crn, senhaAtual, novaSenha } = req.body;
  if (!nome || !crn) return res.status(400).json({ error: "Nome e CRN são obrigatórios" });

  const nutri = await prisma.nutricionista.findUnique({ where: { id: req.nutricionistaId as string } });
  if (!nutri) return res.status(404).json({ error: "Não encontrado" });

  const updateData: { nome: string; crn: string; senha?: string } = { nome, crn };

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
    select: { id: true, nome: true, email: true, crn: true },
  });

  res.json(atualizado);
});

export default router;
