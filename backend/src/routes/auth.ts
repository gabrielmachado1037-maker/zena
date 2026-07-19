import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import prisma from "../lib/prisma";
import { emailBoasVindas, emailRecuperacaoSenha, emailVerificacao } from "../lib/email";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import { uploadFoto } from "../lib/supabase";
import { validateBody } from "../middleware/validate";
import { excluirNutricionista } from "../lib/excluirNutricionista";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET!;

const registerSchema = z.object({
  nome: z.string({ error: "Informe o nome." }).trim().min(1, "Informe o nome."),
  email: z.email({ error: "E-mail inválido." }),
  senha: z.string({ error: "A senha deve ter ao menos 6 caracteres." }).min(6, "A senha deve ter ao menos 6 caracteres."),
  crn: z.string({ error: "Informe o CRN." }).trim().min(1, "Informe o CRN."),
  nomeConsultorio: z.string().trim().optional(),
  aceiteTermos: z.literal(true, { error: "É necessário aceitar os Termos de Uso e a Política de Privacidade." }),
});

const loginSchema = z.object({
  email: z.string({ error: "Informe o e-mail." }).trim().min(1, "Informe o e-mail."),
  senha: z.string({ error: "Informe a senha." }).min(1, "Informe a senha."),
});

const verificarEmailSchema = z.object({
  token: z.string({ error: "Token inválido." }).min(1, "Token inválido."),
});

const refreshSchema = z.object({
  refreshToken: z.string({ error: "Sessão inválida." }).min(1, "Sessão inválida."),
});

// ── Tokens: access curto (30min) + refresh longo (30d) revogável, rotacionado ──
const ACCESS_TTL = "30m";
const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const hashToken = (t: string) => crypto.createHash("sha256").update(t).digest("hex");

// Emite um par access+refresh; persiste só o HASH do refresh. familyId liga a
// cadeia de rotações (reuso de um refresh já rotacionado derruba a família toda).
async function emitirParTokens(nutricionistaId: string, familyId?: string) {
  const accessToken = jwt.sign({ id: nutricionistaId }, JWT_SECRET, { expiresIn: ACCESS_TTL });
  const refreshToken = crypto.randomBytes(48).toString("hex");
  const fam = familyId ?? crypto.randomBytes(16).toString("hex");
  await prisma.refreshToken.create({
    data: { nutricionistaId, tokenHash: hashToken(refreshToken), familyId: fam, expiresAt: new Date(Date.now() + REFRESH_TTL_MS) },
  });
  return { accessToken, refreshToken };
}

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

// Cadastro de nutri — sem isto, um script cria contas em massa (cada uma dispara
// e-mails de boas-vindas/verificação = e-mail bombing pelo domínio verificado).
const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: "Muitas tentativas de cadastro. Tente novamente em 15 minutos." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Versão vigente dos Termos/Privacidade aceitos no cadastro (LGPD).
const TERMOS_VERSAO = "2026-07-12";

// Contas criadas antes do aceite existir têm aceiteTermosEm=null (o consentimento
// não foi retroagido). Comparar a versão também faz o gate servir a atualizações
// futuras dos Termos: bumpar TERMOS_VERSAO pede o aceite de todo mundo de novo.
const precisaAceitarTermos = (n: { aceiteTermosEm: Date | null; aceiteTermosVersao: string | null }) =>
  !n.aceiteTermosEm || n.aceiteTermosVersao !== TERMOS_VERSAO;

// Gera um token de verificação (24h) e dispara o e-mail (best-effort).
async function criarEnviarVerificacao(nutricionistaId: string, email: string, nome: string) {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24 horas
  await prisma.tokenVerificacaoEmail.create({ data: { nutricionistaId, token, expiresAt } });
  emailVerificacao(email, token, nome).catch(console.error);
}

router.post("/register", registerLimiter, validateBody(registerSchema), async (req: Request, res: Response) => {
  const { nome, email, senha, crn, nomeConsultorio, aceiteTermos } = req.body;
  if (!nome || !email || !senha || !crn) {
    return res.status(400).json({ error: "Campos obrigatórios faltando" });
  }
  if (!aceiteTermos) {
    return res.status(400).json({ error: "É necessário aceitar os Termos de Uso e a Política de Privacidade." });
  }
  if (String(senha).length < 6) {
    return res.status(400).json({ error: "A senha deve ter ao menos 6 caracteres." });
  }

  const existe = await prisma.nutricionista.findUnique({ where: { email } });
  if (existe) return res.status(409).json({ error: "E-mail já cadastrado" });

  const hash = await bcrypt.hash(senha, 10);
  const trialEnd = new Date();
  trialEnd.setDate(trialEnd.getDate() + 14);

  const nutri = await prisma.nutricionista.create({
    data: {
      nome, email, senha: hash, crn, trialEnd, nomeConsultorio: nomeConsultorio || null,
      aceiteTermosEm: new Date(), aceiteTermosVersao: TERMOS_VERSAO,
    },
  });

  emailBoasVindas(nome, email).catch(console.error);
  await criarEnviarVerificacao(nutri.id, email, nome);

  const { accessToken, refreshToken } = await emitirParTokens(nutri.id);
  res.json({ token: accessToken, refreshToken, nutricionista: { id: nutri.id, nome: nutri.nome, email: nutri.email, crn: nutri.crn, foto: null, nomeConsultorio: nutri.nomeConsultorio, logoConsultorio: nutri.logoConsultorio, enderecoConsultorio: nutri.enderecoConsultorio, planoSlug: null, subscriptionStatus: "trial", modulosAtivos: [], emailVerificado: false } });
});

router.post("/login", loginLimiter, validateBody(loginSchema), async (req: Request, res: Response) => {
  const { email, senha } = req.body;

  const nutri = await prisma.nutricionista.findUnique({ where: { email } });
  if (!nutri) return res.status(401).json({ error: "Credenciais inválidas" });

  const ok = await bcrypt.compare(senha, nutri.senha);
  if (!ok) return res.status(401).json({ error: "Credenciais inválidas" });

  const { accessToken, refreshToken } = await emitirParTokens(nutri.id);
  res.json({ token: accessToken, refreshToken, nutricionista: { id: nutri.id, nome: nutri.nome, email: nutri.email, crn: nutri.crn, foto: nutri.foto ?? null, nomeConsultorio: nutri.nomeConsultorio, logoConsultorio: nutri.logoConsultorio, enderecoConsultorio: nutri.enderecoConsultorio, planoSlug: nutri.planoSlug ?? null, subscriptionStatus: nutri.subscriptionStatus ?? "trial", modulosAtivos: nutri.modulosAtivos ?? [], emailVerificado: nutri.emailVerificado } });
});

// POST /auth/refresh — troca um refresh válido por um novo par (rotação + detecção de reuso).
router.post("/refresh", validateBody(refreshSchema), async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  const registro = await prisma.refreshToken.findUnique({ where: { tokenHash: hashToken(refreshToken) } });

  if (!registro || registro.expiresAt < new Date()) {
    return res.status(401).json({ error: "Sessão expirada." });
  }
  if (registro.revogado) {
    // Refresh já rotacionado sendo reapresentado = provável roubo → derruba a família toda.
    await prisma.refreshToken.updateMany({ where: { familyId: registro.familyId }, data: { revogado: true } });
    return res.status(401).json({ error: "Sessão inválida." });
  }

  // Rotaciona: revoga o atual e emite um novo par na mesma família.
  await prisma.refreshToken.update({ where: { id: registro.id }, data: { revogado: true } });
  const par = await emitirParTokens(registro.nutricionistaId, registro.familyId);
  res.json({ token: par.accessToken, refreshToken: par.refreshToken });
});

// POST /auth/logout — revoga o refresh apresentado (best-effort; sempre 200).
router.post("/logout", async (req: Request, res: Response) => {
  const rt = req.body?.refreshToken;
  if (typeof rt === "string" && rt) {
    await prisma.refreshToken.updateMany({ where: { tokenHash: hashToken(rt) }, data: { revogado: true } });
  }
  res.json({ ok: true });
});

// POST /verificar-email — consome o token e marca o e-mail como verificado.
router.post("/verificar-email", validateBody(verificarEmailSchema), async (req: Request, res: Response) => {
  const { token } = req.body;
  const registro = await prisma.tokenVerificacaoEmail.findUnique({ where: { token } });
  if (!registro || registro.usado || registro.expiresAt < new Date()) {
    return res.status(400).json({ error: "Link inválido ou expirado" });
  }
  await prisma.$transaction([
    prisma.nutricionista.update({ where: { id: registro.nutricionistaId }, data: { emailVerificado: true } }),
    prisma.tokenVerificacaoEmail.update({ where: { token }, data: { usado: true } }),
  ]);
  res.json({ ok: true });
});

// POST /reenviar-verificacao — reenvia o e-mail de verificação (autenticado, rate-limit).
router.post("/reenviar-verificacao", emailLimiter, authMiddleware, async (req: AuthRequest, res: Response) => {
  const nutri = await prisma.nutricionista.findUnique({ where: { id: req.nutricionistaId as string } });
  if (!nutri) return res.status(404).json({ error: "Não encontrado" });
  if (nutri.emailVerificado) return res.json({ ok: true, jaVerificado: true });
  await criarEnviarVerificacao(nutri.id, nutri.email, nutri.nome);
  res.json({ ok: true });
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
    select: { id: true, nome: true, email: true, crn: true, nomeConsultorio: true, logoConsultorio: true, enderecoConsultorio: true, emailVerificado: true, aceiteTermosEm: true, aceiteTermosVersao: true },
  });
  if (!nutri) return res.status(404).json({ error: "Não encontrado" });
  res.json({ ...nutri, precisaAceitarTermos: precisaAceitarTermos(nutri) });
});

// POST /auth/aceitar-termos — registra o consentimento de quem entrou antes do
// aceite existir (ou antes da versão vigente). Idempotente: reaceitar só recarimba.
router.post("/aceitar-termos", authMiddleware, async (req: AuthRequest, res: Response) => {
  await prisma.nutricionista.update({
    where: { id: req.nutricionistaId as string },
    data: { aceiteTermosEm: new Date(), aceiteTermosVersao: TERMOS_VERSAO },
  });
  res.json({ ok: true, aceiteTermosVersao: TERMOS_VERSAO });
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

// GET /api/auth/exportar — portabilidade (LGPD, Art. 18): baixa os dados do nutri
// (a clínica) + os dados das pacientes vinculadas, em JSON.
router.get("/exportar", authMiddleware, async (req: AuthRequest, res: Response) => {
  const nid = req.nutricionistaId as string;

  const [nutri, pacientes] = await Promise.all([
    prisma.nutricionista.findUnique({
      where: { id: nid },
      select: {
        nome: true, email: true, crn: true, tipoProfissional: true, plano: true,
        nomeConsultorio: true, enderecoConsultorio: true, aceiteTermosEm: true,
        aceiteTermosVersao: true, createdAt: true,
      },
    }),
    prisma.paciente.findMany({ where: { nutricionistaId: nid }, orderBy: { dataInicio: "asc" } }),
  ]);
  const pids = pacientes.map((p) => p.id);
  const P = { in: pids };

  const [
    anamneses, medicoes, registros, checkins, consultas, cobrancas, planos,
    desafios, progressoDesafios, conquistas, mensagensChat, mensagensNutri,
    ciclos, horarios,
  ] = await Promise.all([
    prisma.anamnese.findMany({ where: { pacienteId: P } }),
    prisma.medicao.findMany({ where: { pacienteId: P }, orderBy: { data: "asc" } }),
    prisma.registro.findMany({ where: { pacienteId: P }, orderBy: { data: "asc" } }),
    prisma.checkIn.findMany({ where: { pacienteId: P }, orderBy: { criadoEm: "asc" } }),
    prisma.consulta.findMany({ where: { pacienteId: P }, orderBy: { data: "asc" } }),
    prisma.cobranca.findMany({ where: { pacienteId: P }, orderBy: { vencimento: "asc" } }),
    prisma.planoAlimentar.findMany({ where: { pacienteId: P } }),
    prisma.desafio.findMany({ where: { nutricionistaId: nid } }),
    prisma.desafioProgresso.findMany({ where: { pacienteId: P } }),
    prisma.conquista.findMany({ where: { pacienteId: P } }),
    prisma.mensagemChat.findMany({ where: { nutricionistaId: nid }, orderBy: { criadoEm: "asc" } }),
    prisma.mensagemNutri.findMany({ where: { nutricionistaId: nid }, orderBy: { createdAt: "asc" } }),
    prisma.ciclo.findMany({ where: { nutricionistaId: nid }, orderBy: { numero: "asc" } }),
    prisma.horarioDisponivel.findMany({ where: { nutricionistaId: nid } }),
  ]);

  const dump = {
    _meta: {
      exportadoEm: new Date().toISOString(),
      formato: "JSON",
      descricao: "Exportação de dados (LGPD, Art. 18 — portabilidade). Dados do nutricionista e das pacientes vinculadas.",
      titular: nutri?.nome ?? null,
    },
    nutricionista: nutri,
    pacientes,
    anamneses,
    medicoes,
    registros,
    checkins,
    consultas,
    cobrancas,
    planosAlimentares: planos,
    desafios,
    progressoDesafios,
    conquistas,
    mensagensChat,
    mensagensNutri,
    ciclos,
    horarios,
  };

  res.setHeader("Content-Disposition", 'attachment; filename="dados-nexvel-clinica.json"');
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.status(200).send(JSON.stringify(dump, null, 2));
});

// DELETE /api/auth/conta — eliminação (LGPD): apaga a conta do nutri E todos os
// dados das pacientes vinculadas. Exige a senha atual (ação destrutiva/irreversível).
router.delete("/conta", authMiddleware, async (req: AuthRequest, res: Response) => {
  const { senha } = req.body as { senha?: string };
  if (!senha) return res.status(400).json({ error: "Informe a senha para confirmar a exclusão." });

  const nutri = await prisma.nutricionista.findUnique({ where: { id: req.nutricionistaId as string } });
  if (!nutri) return res.status(404).json({ error: "Não encontrado" });

  const ok = await bcrypt.compare(senha, nutri.senha);
  if (!ok) return res.status(400).json({ error: "Senha incorreta." });

  await excluirNutricionista(nutri.id);
  return res.json({ ok: true });
});

export default router;
