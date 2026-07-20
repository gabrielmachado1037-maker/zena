import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import prisma from "../lib/prisma";
import { authMiddleware, AuthRequest, authPacienteMiddleware, PacienteAuthRequest } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { emailVerificacaoPaciente, emailRecuperacaoSenhaPaciente } from "../lib/email";
import { normalizarCodigo, ultimos4Telefone } from "../lib/convite";
import { buscarPacienteUserPorEmail, buscarPacienteUserParaLogin, buscarPacienteUserParaRecuperacao, normalizarEmail } from "../lib/email-lookup";
import { limitePorConta } from "../lib/limitePorConta";
import { hashSenha, gastarTempoDeSenha, precisaRehash } from "../lib/senha";

const registerSchema = z.object({
  email: z.email({ error: "E-mail inválido." }),
  senha: z.string({ error: "A senha deve ter ao menos 6 caracteres." }).min(6, "A senha deve ter ao menos 6 caracteres."),
  // Agora é o código do CONVITE individual (por paciente), não mais o código global da clínica.
  codigoVinculo: z.string({ error: "Informe o código de convite." }).trim().min(1, "Informe o código de convite."),
  // 2ª validação de identidade: últimos 4 dígitos do telefone cadastrado pela nutri.
  telefone4: z.string().trim().optional(),
  // Consentimento LGPD: aceite explícito dos Termos + Política de Privacidade (obrigatório).
  aceiteTermos: z.boolean({ error: "É necessário aceitar os Termos de Uso e a Política de Privacidade." })
    .refine((v) => v === true, { error: "É necessário aceitar os Termos de Uso e a Política de Privacidade." }),
});

// Versão vigente dos Termos/Privacidade (bate com "Última atualização" mostrada ao usuário).
// O servidor é a autoridade — carimba a versão que considera atual, não o cliente.
const TERMOS_VERSAO = "2026-06";

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

const esqueciSenhaSchema = z.object({
  email: z.string({ error: "Informe o e-mail." }).trim().min(1, "Informe o e-mail."),
});

// Mensagens idênticas às que a rota já devolvia, para não mudar o texto que o
// app do paciente mostra hoje.
const redefinirSenhaSchema = z.object({
  token: z.string({ error: "Dados inválidos." }).min(1, "Dados inválidos."),
  novaSenha: z
    .string({ error: "Dados inválidos." })
    .min(6, "A senha deve ter ao menos 6 caracteres."),
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

// Complementa o limiter acima: aquele é por IP e não vê o ataque distribuído
// (mesma conta, um IP por tentativa). Ver src/lib/limitePorConta.ts.
const loginPorConta = limitePorConta("Muitas tentativas nesta conta. Tente novamente em 15 minutos.");

// Cadastro depende do código de vínculo (6 dígitos) — limita a adivinhação.
const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: "Muitas tentativas de cadastro. Tente novamente em 15 minutos." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rotas que consomem token de uso único vindo do e-mail. Ver auth.ts: o token
// é randomBytes(32), então o limite não protege o segredo — evita martelar.
const tokenLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: "Muitas tentativas. Tente novamente em 15 minutos." },
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

// Mensagem única do spec quando o convite não pertence a quem tenta usar / já foi consumido.
const MSG_CONVITE_INDIVIDUAL =
  "Este convite é individual e já está vinculado a um paciente específico. Solicite um novo convite ao seu nutricionista.";

// POST /api/auth/paciente/register
router.post("/register", registerLimiter, validateBody(registerSchema), async (req: Request, res: Response) => {
  const { email, senha, codigoVinculo, telefone4, aceiteTermos } = req.body;
  if (!email || !senha || !codigoVinculo) {
    return res.status(400).json({ error: "E-mail, senha e código de convite são obrigatórios." });
  }
  if (senha.length < 6) {
    return res.status(400).json({ error: "Senha deve ter pelo menos 6 caracteres." });
  }
  if (aceiteTermos !== true) {
    return res.status(400).json({ error: "É necessário aceitar os Termos de Uso e a Política de Privacidade." });
  }

  const codigo = normalizarCodigo(codigoVinculo);
  // 1. O convite existe? (é individual — cada código pertence a UM paciente)
  const paciente = await prisma.paciente.findUnique({
    where: { conviteCodigo: codigo },
    include: { nutricionista: true },
  });
  if (!paciente) {
    return res.status(404).json({ error: "Código de convite inválido. Solicite um novo convite ao seu nutricionista." });
  }

  // 2. Está ativo / não foi utilizado / não expirou / não foi cancelado?
  if (paciente.conviteStatus === "utilizado") {
    return res.status(409).json({ error: MSG_CONVITE_INDIVIDUAL });
  }
  if (paciente.conviteStatus === "cancelado") {
    return res.status(410).json({ error: "Este convite foi cancelado. Solicite um novo convite ao seu nutricionista." });
  }
  const expirado = paciente.conviteStatus === "expirado" ||
    (paciente.conviteExpiraEm != null && paciente.conviteExpiraEm < new Date());
  if (expirado || paciente.conviteStatus !== "pendente") {
    return res.status(410).json({ error: "Este convite expirou. Solicite um novo convite ao seu nutricionista." });
  }

  // 3. Pertence EXATAMENTE a este paciente? 2ª validação: últimos 4 do telefone
  //    (se a nutri não cadastrou telefone, cai no e-mail pré-cadastrado como prova).
  const last4 = ultimos4Telefone(paciente.telefone);
  if (last4) {
    if (String(telefone4 ?? "").replace(/\D/g, "").slice(-4) !== last4) {
      // Mensagem específica: é falha de IDENTIDADE (dígitos errados), não "convite usado".
      return res.status(403).json({ error: "Os últimos 4 dígitos do telefone não conferem com o cadastro feito pela sua nutricionista." });
    }
  } else if (paciente.email) {
    if (paciente.email.trim().toLowerCase() !== String(email).trim().toLowerCase()) {
      return res.status(403).json({ error: "O e-mail informado não confere com o cadastrado pela sua nutricionista. Use o mesmo e-mail." });
    }
  }

  // 4. Defesa em profundidade: 1 conta por paciente; e o e-mail de login precisa ser livre.
  const jaTemConta = await prisma.pacienteUser.findUnique({ where: { pacienteId: paciente.id } });
  if (jaTemConta) {
    return res.status(409).json({ error: MSG_CONVITE_INDIVIDUAL });
  }
  // Insensível a caixa — senão o mesmo e-mail em caixa diferente vira 2ª conta.
  const jaExiste = await buscarPacienteUserPorEmail(email);
  if (jaExiste) {
    return res.status(409).json({ error: "Este e-mail já possui conta. Faça login." });
  }

  // 5. Cria a conta e QUEIMA o convite na mesma transação (nunca reutilizável).
  const hash = await hashSenha(senha);
  let pacienteUser;
  try {
    pacienteUser = await prisma.$transaction(async (tx) => {
      const pu = await tx.pacienteUser.create({
        data: {
          // Sempre minúsculo: a unicidade do banco é sensível a caixa.
          email: normalizarEmail(email),
          senha: hash,
          pacienteId: paciente.id,
          aceiteTermos: true,
          aceiteTermosEm: new Date(),
          aceiteTermosVersao: TERMOS_VERSAO,
        },
      });
      await tx.paciente.update({
        where: { id: paciente.id },
        data: { conviteStatus: "utilizado", conviteUsadoEm: new Date() },
      });
      return pu;
    });
  } catch (e: unknown) {
    // Corrida: outro cadastro acabou de consumir este convite/paciente.
    if ((e as { code?: string })?.code === "P2002") {
      return res.status(409).json({ error: MSG_CONVITE_INDIVIDUAL });
    }
    throw e;
  }

  await criarEnviarVerificacaoPaciente(pacienteUser.id, pacienteUser.email, paciente.nome);
  const { accessToken, refreshToken } = await emitirParTokens(pacienteUser.id, paciente.id, paciente.nutricionistaId);

  res.status(201).json({
    token: accessToken,
    refreshToken,
    paciente: {
      id: paciente.id,
      nome: paciente.nome,
      email: pacienteUser.email,
      nutricionistaNome: paciente.nutricionista.nome,
      nomeConsultorio: paciente.nutricionista.nomeConsultorio,
      fotoUrl: null,
      emailVerificado: false,
    },
  });
});

// POST /api/auth/paciente/esqueci-senha — envia link de redefinição (sempre 200, não revela se o e-mail existe).
router.post("/esqueci-senha", emailLimiter, validateBody(esqueciSenhaSchema), async (req: Request, res: Response) => {
  const email = String(req.body?.email ?? "").trim().toLowerCase();

  const pacienteUser = await buscarPacienteUserParaRecuperacao(email);
  // Sempre 200 — não vaza se o e-mail tem conta.
  if (!pacienteUser) return res.json({ ok: true });

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 hora
  await prisma.tokenRedefinicaoPaciente.create({
    data: { pacienteUserId: pacienteUser.id, token, expiresAt },
  });
  emailRecuperacaoSenhaPaciente(pacienteUser.email, token, pacienteUser.paciente.nome).catch(console.error);
  res.json({ ok: true });
});

// POST /api/auth/paciente/redefinir-senha — troca a senha via token do e-mail.
router.post("/redefinir-senha", tokenLimiter, validateBody(redefinirSenhaSchema), async (req: Request, res: Response) => {
  const token = String(req.body?.token ?? "");
  const novaSenha = String(req.body?.novaSenha ?? "");

  const registro = await prisma.tokenRedefinicaoPaciente.findUnique({ where: { token } });
  if (!registro || registro.usado || registro.expiresAt < new Date()) {
    return res.status(400).json({ error: "Link inválido ou expirado. Solicite um novo." });
  }

  const hash = await hashSenha(novaSenha);
  await prisma.$transaction([
    prisma.pacienteUser.update({ where: { id: registro.pacienteUserId }, data: { senha: hash } }),
    prisma.tokenRedefinicaoPaciente.update({ where: { token }, data: { usado: true } }),
    // Expulsa sessões antigas: sem isso, quem tivesse invadido continuava com
    // acesso ao prontuário por até 30 dias mesmo depois da troca de senha.
    prisma.refreshTokenPaciente.updateMany({
      where: { pacienteUserId: registro.pacienteUserId, revogado: false },
      data: { revogado: true },
    }),
  ]);
  res.json({ ok: true });
});

// POST /api/auth/paciente/login
router.post("/login", loginLimiter, validateBody(loginSchema), loginPorConta, async (req: Request, res: Response) => {
  const { email, senha } = req.body;
  if (!email || !senha) {
    return res.status(400).json({ error: "Email e senha são obrigatórios." });
  }

  const pacienteUser = await buscarPacienteUserParaLogin(email);
  // Iguala o tempo de resposta do e-mail inexistente — sem isso dá para
  // descobrir quem é paciente da plataforma medindo a latência (ver comentário
  // em auth.ts). Aqui a inferência é ainda mais sensível: revela tratamento.
  if (!pacienteUser) {
    await gastarTempoDeSenha(senha);
    return res.status(401).json({ error: "Credenciais inválidas." });
  }

  const ok = await bcrypt.compare(senha, pacienteUser.senha);
  if (!ok) return res.status(401).json({ error: "Credenciais inválidas." });

  // Ver auth.ts: regrava o hash antigo no custo atual, aproveitando que a senha
  // em claro só existe aqui. Best-effort — não pode impedir o login.
  if (precisaRehash(pacienteUser.senha)) {
    hashSenha(senha)
      .then((novo) => prisma.pacienteUser.update({ where: { id: pacienteUser.id }, data: { senha: novo } }))
      .catch((e) => console.error("[rehash paciente]", e));
  }

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
router.post("/verificar-email", tokenLimiter, validateBody(verificarEmailSchema), async (req: Request, res: Response) => {
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

// (Removidas as rotas do código de vínculo GLOBAL da clínica — gerar-codigo /
//  codigo-vinculo. O vínculo agora é individual por paciente, gerado no cadastro.)

export default router;
