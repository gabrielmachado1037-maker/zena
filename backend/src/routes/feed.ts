import { Router, Response } from "express";
import prisma from "../lib/prisma";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import { uploadFeedFoto } from "../lib/supabase";
import { enviarNotificacaoPaciente } from "./notificacoes";

const router = Router();
router.use(authMiddleware);

const CATEGORIAS_VALIDAS = ["REFEICAO", "TREINO", "MOMENTO"];
const PRIVACIDADES_VALIDAS = ["PUBLICO", "APENAS_NUTRI"];

// GET /api/feed?page=1&limit=20&categoria=REFEICAO
router.get("/", async (req: AuthRequest, res: Response) => {
  const nutricionistaId = req.nutricionistaId!;
  const page      = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit     = Math.min(50, parseInt(req.query.limit as string) || 20);
  const skip      = (page - 1) * limit;
  const categoria = req.query.categoria as string | undefined;

  const where: Record<string, unknown> = { nutricionistaId };
  if (categoria && CATEGORIAS_VALIDAS.includes(categoria)) where.categoria = categoria;

  const [posts, total] = await Promise.all([
    prisma.feedPost.findMany({
      where,
      orderBy: { criadoEm: "desc" },
      skip,
      take: limit,
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
    }),
    prisma.feedPost.count({ where }),
  ]);

  return res.json({ posts, total, page, pages: Math.ceil(total / limit) });
});

// POST /api/feed — body: { pacienteId, mensagem, categoria?, privacidade?, fotoBase64? }
router.post("/", async (req: AuthRequest, res: Response) => {
  const nutricionistaId = req.nutricionistaId!;
  const { pacienteId, mensagem, categoria = "MOMENTO", privacidade = "PUBLICO", fotoBase64 } = req.body as {
    pacienteId: string;
    mensagem: string;
    categoria?: string;
    privacidade?: string;
    fotoBase64?: string;
  };

  if (!pacienteId || !mensagem?.trim()) {
    return res.status(400).json({ error: "pacienteId e mensagem são obrigatórios" });
  }
  if (!CATEGORIAS_VALIDAS.includes(categoria)) {
    return res.status(400).json({ error: "Categoria inválida" });
  }
  if (!PRIVACIDADES_VALIDAS.includes(privacidade)) {
    return res.status(400).json({ error: "Privacidade inválida" });
  }

  const [paciente, nutriSnap] = await Promise.all([
    prisma.paciente.findFirst({ where: { id: pacienteId, nutricionistaId } }),
    prisma.nutricionista.findUnique({ where: { id: nutricionistaId }, select: { foto: true } }),
  ]);
  if (!paciente) return res.status(404).json({ error: "Paciente não encontrado" });

  let fotoUrl: string | null = null;
  if (fotoBase64?.startsWith("data:image/")) {
    const path = `nutri/${nutricionistaId}/${Date.now()}-${pacienteId.slice(-6)}.jpg`;
    fotoUrl = await uploadFeedFoto(path, fotoBase64);
  }

  const post = await prisma.feedPost.create({
    data: {
      tipo: "CONQUISTA",
      categoria,
      privacidade,
      pacienteId,
      nutricionistaId,
      mensagem: mensagem.trim(),
      fotoUrl,
      autorAvatarUrl: nutriSnap?.foto ?? null,
      autorNutri: true,
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

  return res.status(201).json(post);
});

// POST /api/feed/:id/curtir  — body: { delta: 1 | -1 }
router.post("/:id/curtir", async (req: AuthRequest, res: Response) => {
  const id    = String(req.params.id);
  const delta = req.body.delta === -1 ? -1 : 1;

  const post = await prisma.feedPost.findFirst({
    where: { id, nutricionistaId: req.nutricionistaId! },
  });
  if (!post) return res.status(404).json({ error: "Post não encontrado" });

  const updated = await prisma.feedPost.update({
    where: { id },
    data: { curtidas: Math.max(0, post.curtidas + delta) },
    select: { id: true, curtidas: true },
  });

  return res.json(updated);
});

// DELETE /api/feed/:id
router.delete("/:id", async (req: AuthRequest, res: Response) => {
  const id   = String(req.params.id);
  const post = await prisma.feedPost.findFirst({
    where: { id, nutricionistaId: req.nutricionistaId! },
  });
  if (!post) return res.status(404).json({ error: "Post não encontrado" });

  await prisma.feedPost.delete({ where: { id } });
  return res.json({ ok: true });
});

// GET /api/feed/:id/comentarios
router.get("/:id/comentarios", async (req: AuthRequest, res: Response) => {
  const post = await prisma.feedPost.findFirst({
    where: { id: String(req.params.id), nutricionistaId: req.nutricionistaId! },
  });
  if (!post) return res.status(404).json({ error: "Post não encontrado" });

  const comentarios = await prisma.feedComentario.findMany({
    where: { feedPostId: post.id },
    orderBy: { createdAt: "asc" },
  });
  return res.json(comentarios);
});

// POST /api/feed/:id/comentarios
router.post("/:id/comentarios", async (req: AuthRequest, res: Response) => {
  const { texto } = req.body as { texto: string };
  if (!texto?.trim()) return res.status(400).json({ error: "Texto obrigatório" });
  if (texto.length > 500) return res.status(400).json({ error: "Máximo 500 caracteres" });

  const post = await prisma.feedPost.findFirst({
    where: { id: String(req.params.id), nutricionistaId: req.nutricionistaId! },
  });
  if (!post) return res.status(404).json({ error: "Post não encontrado" });

  const nutri = await prisma.nutricionista.findUnique({
    where: { id: req.nutricionistaId! },
    select: { nome: true, foto: true },
  });

  const comentario = await prisma.feedComentario.create({
    data: {
      feedPostId:    post.id,
      autorId:       req.nutricionistaId!,
      autorTipo:     "NUTRICIONISTA",
      autorNome:     nutri!.nome,
      autorAvatarUrl: nutri?.foto ?? null,
      texto:         texto.trim(),
    },
  });

  // Push para o paciente dono do post (fire-and-forget)
  enviarNotificacaoPaciente(
    post.pacienteId,
    "Sua nutricionista comentou 💬",
    "Ela deixou uma mensagem no seu post!",
    "/paciente/feed"
  ).catch(() => null);

  return res.status(201).json(comentario);
});

export default router;
