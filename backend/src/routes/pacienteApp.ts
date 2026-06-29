import { Router, Response } from "express";
import prisma from "../lib/prisma";
import { authPacienteMiddleware, PacienteAuthRequest } from "../middleware/auth";

const router = Router();
router.use(authPacienteMiddleware);

// ─── Feed ──────────────────────────────────────────────────────────────────────

// GET /api/paciente-app/feed
router.get("/feed", async (req: PacienteAuthRequest, res: Response) => {
  const posts = await prisma.feedPost.findMany({
    where: {
      nutricionistaId: req.nutricionistaId!,
      OR: [
        { privado: false },
        { pacienteId: req.pacienteId!, privado: true },
      ],
    },
    include: { paciente: { select: { nome: true } } },
    orderBy: { criadoEm: "desc" },
    take: 50,
  });
  res.json(posts);
});

// POST /api/paciente-app/feed
router.post("/feed", async (req: PacienteAuthRequest, res: Response) => {
  const { mensagem, privado } = req.body;
  if (!mensagem?.trim()) return res.status(400).json({ error: "Mensagem é obrigatória." });

  const post = await prisma.feedPost.create({
    data: {
      tipo: "CONQUISTA",
      mensagem: mensagem.trim(),
      pacienteId: req.pacienteId!,
      nutricionistaId: req.nutricionistaId!,
      privado: privado === true,
    },
    include: { paciente: { select: { nome: true } } },
  });
  res.status(201).json(post);
});

// POST /api/paciente-app/feed/:id/curtir
router.post("/feed/:id/curtir", async (req: PacienteAuthRequest, res: Response) => {
  const post = await prisma.feedPost.findFirst({
    where: { id: String(req.params.id), nutricionistaId: req.nutricionistaId! },
  });
  if (!post) return res.status(404).json({ error: "Post não encontrado." });

  const updated = await prisma.feedPost.update({
    where: { id: post.id },
    data: { curtidas: Math.max(0, post.curtidas + 1) },
  });
  res.json(updated);
});

// ─── Ranking ──────────────────────────────────────────────────────────────────

// GET /api/paciente-app/ranking
router.get("/ranking", async (req: PacienteAuthRequest, res: Response) => {
  const periodo = String(req.query.periodo ?? "semanal");
  const anoAtual = Number(req.query.ano) || new Date().getFullYear();

  const where: Record<string, unknown> = {
    nutricionistaId: req.nutricionistaId!,
    periodo,
    ano: anoAtual,
  };
  if (periodo === "semanal" && req.query.semana) where.semana = Number(req.query.semana);
  if (periodo === "mensal" && req.query.mes) where.mes = Number(req.query.mes);

  const pontuacoes = await prisma.rankingPontuacao.findMany({
    where,
    include: { paciente: { select: { id: true, nome: true } } },
    orderBy: { pontuacaoTotal: "desc" },
  });

  const ranking = pontuacoes.map((p, i) => ({
    posicao: i + 1,
    pacienteId: p.pacienteId,
    nome: p.paciente.nome,
    pontuacaoTotal: p.pontuacaoTotal,
    pctObjetivoPeso: p.pctObjetivoPeso,
    diasConsecutivosHabitos: p.diasConsecutivosHabitos,
    metasSemanaisBatidas: p.metasSemanaisBatidas,
    euMesmo: p.pacienteId === req.pacienteId,
  }));

  res.json({ ranking, minhaPosicao: ranking.find((r) => r.euMesmo) ?? null });
});

// ─── Consultas ────────────────────────────────────────────────────────────────

// GET /api/paciente-app/consultas
router.get("/consultas", async (req: PacienteAuthRequest, res: Response) => {
  const consultas = await prisma.consulta.findMany({
    where: { pacienteId: req.pacienteId! },
    orderBy: { data: "asc" },
  });
  const agora = new Date();
  res.json({
    proximas: consultas.filter((c) => new Date(c.data) >= agora && c.status !== "cancelada"),
    historico: consultas.filter((c) => new Date(c.data) < agora || c.status === "cancelada"),
  });
});

// ─── Pagamentos ───────────────────────────────────────────────────────────────

// GET /api/paciente-app/pagamentos
router.get("/pagamentos", async (req: PacienteAuthRequest, res: Response) => {
  const [cobrancas, planoCobranca, paciente] = await Promise.all([
    prisma.cobranca.findMany({
      where: { pacienteId: req.pacienteId! },
      orderBy: { vencimento: "desc" },
      take: 20,
    }),
    prisma.planoCobranca.findUnique({ where: { pacienteId: req.pacienteId! } }),
    prisma.paciente.findUnique({
      where: { id: req.pacienteId! },
      select: { nome: true, objetivo: true, dataInicio: true },
    }),
  ]);
  res.json({ cobrancas, planoCobranca, paciente });
});

// ─── Perfil do paciente ───────────────────────────────────────────────────────

// GET /api/paciente-app/me
router.get("/me", async (req: PacienteAuthRequest, res: Response) => {
  const paciente = await prisma.paciente.findUnique({
    where: { id: req.pacienteId! },
    include: {
      nutricionista: { select: { nome: true, nomeConsultorio: true, logoConsultorio: true } },
      medicoes: { orderBy: { data: "desc" }, take: 1 },
    },
  });
  if (!paciente) return res.status(404).json({ error: "Paciente não encontrado." });
  res.json(paciente);
});

export default router;
