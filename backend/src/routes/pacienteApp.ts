import { Router, Response } from "express";
import prisma from "../lib/prisma";
import { authPacienteMiddleware, PacienteAuthRequest } from "../middleware/auth";
import { uploadFeedFoto } from "../lib/supabase";

const router = Router();
router.use(authPacienteMiddleware);

// ─── Feed ──────────────────────────────────────────────────────────────────────

// GET /api/paciente-app/feed
router.get("/feed", async (req: PacienteAuthRequest, res: Response) => {
  const posts = await prisma.feedPost.findMany({
    where: {
      nutricionistaId: req.nutricionistaId!,
      OR: [
        { privacidade: "PUBLICO" },
        { pacienteId: req.pacienteId!, privacidade: "APENAS_NUTRI" },
      ],
    },
    include: {
      paciente: { select: { nome: true } },
      _count: { select: { comentarios: true } },
    },
    orderBy: { criadoEm: "desc" },
    take: 50,
  });
  res.json(posts);
});

// POST /api/paciente-app/feed
router.post("/feed", async (req: PacienteAuthRequest, res: Response) => {
  const { mensagem, categoria = "MOMENTO", privacidade = "PUBLICO", fotoBase64 } = req.body as {
    mensagem: string;
    categoria?: string;
    privacidade?: string;
    fotoBase64?: string;
  };
  if (!mensagem?.trim()) return res.status(400).json({ error: "Mensagem é obrigatória." });

  let fotoUrl: string | null = null;
  if (fotoBase64?.startsWith("data:image/")) {
    const path = `paciente/${req.pacienteId!}/${Date.now()}.jpg`;
    fotoUrl = await uploadFeedFoto(path, fotoBase64);
  }

  const post = await prisma.feedPost.create({
    data: {
      tipo: "CONQUISTA",
      categoria,
      privacidade,
      mensagem: mensagem.trim(),
      fotoUrl,
      pacienteId: req.pacienteId!,
      nutricionistaId: req.nutricionistaId!,
      autorNutri: false,
    },
    include: {
      paciente: { select: { nome: true } },
      _count: { select: { comentarios: true } },
    },
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

// ─── Comentários ──────────────────────────────────────────────────────────────

// GET /api/paciente-app/feed/:id/comentarios
router.get("/feed/:id/comentarios", async (req: PacienteAuthRequest, res: Response) => {
  const post = await prisma.feedPost.findFirst({
    where: { id: String(req.params.id), nutricionistaId: req.nutricionistaId! },
  });
  if (!post) return res.status(404).json({ error: "Post não encontrado" });
  if (post.privacidade === "APENAS_NUTRI" && post.pacienteId !== req.pacienteId) {
    return res.status(403).json({ error: "Acesso negado" });
  }

  const comentarios = await prisma.feedComentario.findMany({
    where: { feedPostId: post.id },
    orderBy: { createdAt: "asc" },
  });
  return res.json(comentarios);
});

// POST /api/paciente-app/feed/:id/comentarios
router.post("/feed/:id/comentarios", async (req: PacienteAuthRequest, res: Response) => {
  const { texto } = req.body as { texto: string };
  if (!texto?.trim()) return res.status(400).json({ error: "Texto obrigatório" });
  if (texto.length > 500) return res.status(400).json({ error: "Máximo 500 caracteres" });

  const post = await prisma.feedPost.findFirst({
    where: { id: String(req.params.id), nutricionistaId: req.nutricionistaId! },
  });
  if (!post) return res.status(404).json({ error: "Post não encontrado" });
  if (post.privacidade === "APENAS_NUTRI" && post.pacienteId !== req.pacienteId) {
    return res.status(403).json({ error: "Post privado" });
  }

  const paciente = await prisma.paciente.findUnique({
    where: { id: req.pacienteId! },
    select: { nome: true },
  });

  const comentario = await prisma.feedComentario.create({
    data: {
      feedPostId: post.id,
      autorId:    req.pacienteId!,
      autorTipo:  "PACIENTE",
      autorNome:  paciente!.nome,
      texto:      texto.trim(),
    },
  });
  return res.status(201).json(comentario);
});

// ─── Push notifications (paciente) ────────────────────────────────────────────

// POST /api/paciente-app/push/subscribe
router.post("/push/subscribe", async (req: PacienteAuthRequest, res: Response) => {
  const { endpoint, keys } = req.body as { endpoint: string; keys: { p256dh: string; auth: string } };
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return res.status(400).json({ error: "Subscription inválida" });
  }
  await prisma.pushSubscriptionPaciente.upsert({
    where:  { endpoint },
    create: { pacienteId: req.pacienteId!, endpoint, p256dh: keys.p256dh, auth: keys.auth },
    update: { pacienteId: req.pacienteId!, p256dh: keys.p256dh, auth: keys.auth },
  });
  return res.json({ ok: true });
});

// DELETE /api/paciente-app/push/subscribe
router.delete("/push/subscribe", async (req: PacienteAuthRequest, res: Response) => {
  const { endpoint } = req.body as { endpoint: string };
  if (endpoint) {
    await prisma.pushSubscriptionPaciente.deleteMany({ where: { endpoint, pacienteId: req.pacienteId! } });
  }
  return res.json({ ok: true });
});

export default router;
