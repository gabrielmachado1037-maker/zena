import { Router, Response } from "express";
import { z } from "zod";
import prisma from "../lib/prisma";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { checkModulo } from "../middleware/checkModulo";
import { uploadFeedFoto } from "../lib/supabase";
import { enviarNotificacaoPaciente } from "./notificacoes";

const router = Router();
router.use(authMiddleware);
router.use(checkModulo("feed"));

const CATEGORIAS_VALIDAS = ["REFEICAO", "TREINO", "MOMENTO"];
const PRIVACIDADES_VALIDAS = ["PUBLICO", "APENAS_NUTRI"];

const muralSchema = z.object({
  mensagem: z.string({ error: "Mensagem é obrigatória" }).trim().min(1, "Mensagem é obrigatória"),
});
const feedPostSchema = z.object({
  pacienteId: z.string({ error: "pacienteId e mensagem são obrigatórios" }).min(1, "pacienteId e mensagem são obrigatórios"),
  mensagem: z.string({ error: "pacienteId e mensagem são obrigatórios" }).trim().min(1, "pacienteId e mensagem são obrigatórios"),
  categoria: z.string().optional(),
  privacidade: z.string().optional(),
  fotoBase64: z.string().optional().nullable(),
});
const curtirSchema = z.object({ delta: z.number().optional() });
const comentarioSchema = z.object({
  texto: z.string({ error: "Texto obrigatório" }).trim().min(1, "Texto obrigatório").max(500, "Máximo 500 caracteres"),
});

// GET /api/feed?page=1&limit=20&categoria=REFEICAO
router.get("/", async (req: AuthRequest, res: Response) => {
  const nutricionistaId = req.nutricionistaId!;
  const page      = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit     = Math.min(50, parseInt(req.query.limit as string) || 20);
  const skip      = (page - 1) * limit;
  const categoria = req.query.categoria as string | undefined;

  const where: Record<string, unknown> = { nutricionistaId };
  if (categoria && CATEGORIAS_VALIDAS.includes(categoria)) where.categoria = categoria;
  if (req.query.semana) where.criadoEm = { gte: new Date(Date.now() - 7 * 86_400_000) };

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

const INCLUDE_POST = {
  paciente: { select: { id: true, nome: true, pacienteUser: { select: { fotoUrl: true } } } },
  _count: { select: { comentarios: true } },
} as const;

// POST /api/feed/mural — publica um aviso da nutri no Mural (sem paciente-alvo).
router.post("/mural", validateBody(muralSchema), async (req: AuthRequest, res: Response) => {
  const nutricionistaId = req.nutricionistaId!;
  const { mensagem } = req.body as { mensagem: string };
  if (!mensagem?.trim()) return res.status(400).json({ error: "Mensagem é obrigatória" });

  const nutriSnap = await prisma.nutricionista.findUnique({ where: { id: nutricionistaId }, select: { foto: true } });
  const post = await prisma.feedPost.create({
    data: {
      tipo: "MURAL",
      categoria: "MOMENTO",
      privacidade: "PUBLICO",
      pacienteId: null,
      nutricionistaId,
      mensagem: mensagem.trim(),
      autorAvatarUrl: nutriSnap?.foto ?? null,
      autorNutri: true,
    },
    include: INCLUDE_POST,
  });
  return res.status(201).json(post);
});

// GET /api/feed/engajadores — top pacientes por curtidas recebidas (dados reais).
router.get("/engajadores", async (req: AuthRequest, res: Response) => {
  const nutricionistaId = req.nutricionistaId!;
  const grupos = await prisma.feedPost.groupBy({
    by: ["pacienteId"],
    where: { nutricionistaId, pacienteId: { not: null } },
    _sum: { curtidas: true },
    _count: { _all: true },
  });
  const ordenado = grupos
    .map((g) => ({ pacienteId: g.pacienteId as string, curtidas: g._sum.curtidas ?? 0, posts: g._count._all }))
    .sort((a, b) => b.curtidas - a.curtidas || b.posts - a.posts)
    .slice(0, 5);

  const pacs = await prisma.paciente.findMany({
    where: { id: { in: ordenado.map((o) => o.pacienteId) }, nutricionistaId },
    select: { id: true, nome: true, pacienteUser: { select: { fotoUrl: true } } },
  });
  const byId = new Map(pacs.map((p) => [p.id, p]));

  return res.json(
    ordenado
      .filter((o) => byId.has(o.pacienteId))
      .map((o) => ({
        pacienteId: o.pacienteId,
        nome: byId.get(o.pacienteId)!.nome,
        foto: byId.get(o.pacienteId)!.pacienteUser?.fotoUrl ?? null,
        curtidas: o.curtidas,
        posts: o.posts,
      }))
  );
});

// POST /api/feed — body: { pacienteId, mensagem, categoria?, privacidade?, fotoBase64? }
router.post("/", validateBody(feedPostSchema), async (req: AuthRequest, res: Response) => {
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
router.post("/:id/curtir", validateBody(curtirSchema), async (req: AuthRequest, res: Response) => {
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
router.post("/:id/comentarios", validateBody(comentarioSchema), async (req: AuthRequest, res: Response) => {
  const { texto } = req.body as { texto: string };

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
