import { Router, Response } from "express";
import prisma from "../lib/prisma";
import { authPacienteMiddleware, PacienteAuthRequest } from "../middleware/auth";
import { uploadFeedFoto, uploadAvatarPaciente } from "../lib/supabase";
import bcrypt from "bcryptjs";

const router = Router();
router.use(authPacienteMiddleware);

// ─── Feed ──────────────────────────────────────────────────────────────────────

// GET /api/paciente-app/feed
router.get("/feed", async (req: PacienteAuthRequest, res: Response) => {
  const posts = await prisma.feedPost.findMany({
    where: {
      nutricionistaId: req.nutricionistaId!,
      pacienteId: { not: null }, // exclui posts do Mural da nutri (sem paciente-alvo)
      OR: [
        { privacidade: "PUBLICO" },
        { pacienteId: req.pacienteId!, privacidade: "APENAS_NUTRI" },
      ],
    },
    include: {
      paciente: {
        select: {
          id: true,
          nome: true,
          pacienteUser: { select: { fotoUrl: true } },
        },
      },
      _count: { select: { comentarios: true } },
    },
    orderBy: { criadoEm: "desc" },
    take: 50,
  });
  res.json(posts);
});

// POST /api/paciente-app/feed
router.post("/feed", async (req: PacienteAuthRequest, res: Response) => {
  const { mensagem, categoria = "MOMENTO", privacidade, fotoBase64 } = req.body as {
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

  const pacienteUserSnap = await prisma.pacienteUser.findUnique({
    where: { pacienteId: req.pacienteId! },
    select: { fotoUrl: true, postPublicoPadrao: true },
  });

  // Se o cliente não especificar, usa a preferência de privacidade padrão do paciente.
  const privacidadeFinal =
    privacidade ?? (pacienteUserSnap?.postPublicoPadrao === false ? "APENAS_NUTRI" : "PUBLICO");

  const post = await prisma.feedPost.create({
    data: {
      tipo: "CONQUISTA",
      categoria,
      privacidade: privacidadeFinal,
      mensagem: mensagem.trim(),
      fotoUrl,
      autorAvatarUrl: pacienteUserSnap?.fotoUrl ?? null,
      pacienteId: req.pacienteId!,
      nutricionistaId: req.nutricionistaId!,
      autorNutri: false,
    },
    include: {
      paciente: {
        select: {
          id: true,
          nome: true,
          pacienteUser: { select: { fotoUrl: true } },
        },
      },
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
    include: {
      paciente: {
        select: {
          id: true,
          nome: true,
          pacienteUser: { select: { fotoUrl: true } },
        },
      },
    },
    orderBy: { pontuacaoTotal: "desc" },
  });

  const ranking = pontuacoes.map((p, i) => ({
    posicao: i + 1,
    pacienteId: p.pacienteId,
    nome: p.paciente.nome,
    fotoUrl: (p.paciente.pacienteUser as { fotoUrl?: string | null } | null)?.fotoUrl ?? null,
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

// GET /api/paciente-app/plano-alimentar
router.get("/plano-alimentar", async (req: PacienteAuthRequest, res: Response) => {
  const plano = await prisma.planoAlimentar.findFirst({
    where: { pacienteId: req.pacienteId! },
    orderBy: { dataCriacao: "desc" },
  });
  res.json({ plano });
});

// GET /api/paciente-app/me
router.get("/me", async (req: PacienteAuthRequest, res: Response) => {
  const [paciente, primeiroMedicao] = await Promise.all([
    prisma.paciente.findUnique({
      where: { id: req.pacienteId! },
      include: {
        nutricionista: { select: { nome: true, nomeConsultorio: true, logoConsultorio: true } },
        medicoes: { orderBy: { data: "desc" }, take: 1 },
        pacienteUser: { select: { fotoUrl: true, postPublicoPadrao: true } },
      },
    }),
    prisma.medicao.findFirst({
      where: { pacienteId: req.pacienteId! },
      orderBy: { data: "asc" },
    }),
  ]);
  if (!paciente) return res.status(404).json({ error: "Paciente não encontrado." });
  const { pacienteUser, ...rest } = paciente;
  res.json({
    ...rest,
    fotoUrl: pacienteUser?.fotoUrl ?? null,
    postPublicoPadrao: pacienteUser?.postPublicoPadrao ?? true,
    primeiroMedicao,
  });
});

// PUT /api/paciente-app/foto-perfil
router.put("/foto-perfil", async (req: PacienteAuthRequest, res: Response) => {
  const { fotoBase64 } = req.body as { fotoBase64: string };
  if (!fotoBase64?.startsWith("data:image/")) {
    return res.status(400).json({ error: "Imagem inválida" });
  }
  const path = `${req.pacienteId!}/${Date.now()}.jpg`;
  const fotoUrl = await uploadAvatarPaciente(path, fotoBase64);
  await Promise.all([
    prisma.pacienteUser.updateMany({ where: { pacienteId: req.pacienteId! }, data: { fotoUrl } }),
    prisma.paciente.update({ where: { id: req.pacienteId! }, data: { fotoPerfilUrl: fotoUrl } }),
  ]);
  return res.json({ fotoUrl });
});

// GET /api/paciente-app/frase-motivacional
router.get("/frase-motivacional", async (_req: PacienteAuthRequest, res: Response) => {
  const fallback = "Cada escolha saudável é um passo em direção à sua melhor versão.";
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.json({ frase: fallback });
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 60,
        messages: [{ role: "user", content: `Gere UMA frase motivacional curta (8 a 14 palavras) para um paciente em acompanhamento nutricional. Positiva e encorajadora. Responda APENAS JSON: {"frase": "texto"}` }],
      }),
    });
    const data = await r.json() as { content?: Array<{ text?: string }> };
    const text = data?.content?.[0]?.text ?? "";
    const parsed = JSON.parse(text) as { frase?: string };
    return res.json({ frase: parsed.frase ?? fallback });
  } catch {
    return res.json({ frase: fallback });
  }
});

// PUT /api/paciente-app/perfil
router.put("/perfil", async (req: PacienteAuthRequest, res: Response) => {
  const { nome, senhaAtual, novaSenha, postPublicoPadrao } = req.body as {
    nome?: string;
    senhaAtual?: string;
    novaSenha?: string;
    postPublicoPadrao?: boolean;
  };
  if (novaSenha) {
    if (!senhaAtual) return res.status(400).json({ error: "Senha atual é obrigatória" });
    if (novaSenha.length < 6) return res.status(400).json({ error: "Nova senha deve ter pelo menos 6 caracteres" });
    const user = await prisma.pacienteUser.findUnique({ where: { pacienteId: req.pacienteId! } });
    if (!user) return res.status(404).json({ error: "Usuário não encontrado" });
    const ok = await bcrypt.compare(senhaAtual, user.senha);
    if (!ok) return res.status(400).json({ error: "Senha atual incorreta" });
    const hash = await bcrypt.hash(novaSenha, 10);
    await prisma.pacienteUser.update({ where: { id: user.id }, data: { senha: hash } });
  }
  if (nome?.trim()) {
    await prisma.paciente.update({ where: { id: req.pacienteId! }, data: { nome: nome.trim() } });
  }
  if (typeof postPublicoPadrao === "boolean") {
    await prisma.pacienteUser.updateMany({
      where: { pacienteId: req.pacienteId! },
      data: { postPublicoPadrao },
    });
  }
  return res.json({ ok: true });
});

// DELETE /api/paciente-app/conta
router.delete("/conta", async (req: PacienteAuthRequest, res: Response) => {
  await prisma.pacienteUser.deleteMany({ where: { pacienteId: req.pacienteId! } });
  return res.json({ ok: true });
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

  const [paciente, pacienteUserSnap] = await Promise.all([
    prisma.paciente.findUnique({ where: { id: req.pacienteId! }, select: { nome: true } }),
    prisma.pacienteUser.findUnique({ where: { pacienteId: req.pacienteId! }, select: { fotoUrl: true } }),
  ]);

  const comentario = await prisma.feedComentario.create({
    data: {
      feedPostId:    post.id,
      autorId:       req.pacienteId!,
      autorTipo:     "PACIENTE",
      autorNome:     paciente!.nome,
      autorAvatarUrl: pacienteUserSnap?.fotoUrl ?? null,
      texto:         texto.trim(),
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
