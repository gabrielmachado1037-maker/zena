import { Router, Response } from "express";
import prisma from "../lib/prisma";
import { authMiddleware, AuthRequest } from "../middleware/auth";

const router = Router();
router.use(authMiddleware);

const TIPOS_VALIDOS = ["META_BATIDA", "PESO_ALCANCADO", "CONQUISTA"];

// GET /api/feed?page=1&limit=20
router.get("/", async (req: AuthRequest, res: Response) => {
  const nutricionistaId = req.nutricionistaId!;
  const page  = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(50, parseInt(req.query.limit as string) || 20);
  const skip  = (page - 1) * limit;

  const [posts, total] = await Promise.all([
    prisma.feedPost.findMany({
      where: { nutricionistaId },
      orderBy: { criadoEm: "desc" },
      skip,
      take: limit,
      include: {
        paciente: { select: { id: true, nome: true } },
      },
    }),
    prisma.feedPost.count({ where: { nutricionistaId } }),
  ]);

  return res.json({ posts, total, page, pages: Math.ceil(total / limit) });
});

// POST /api/feed
router.post("/", async (req: AuthRequest, res: Response) => {
  const nutricionistaId = req.nutricionistaId!;
  const { tipo, pacienteId, mensagem } = req.body as {
    tipo: string;
    pacienteId: string;
    mensagem: string;
  };

  if (!TIPOS_VALIDOS.includes(tipo)) {
    return res.status(400).json({ error: "Tipo inválido" });
  }
  if (!pacienteId || !mensagem?.trim()) {
    return res.status(400).json({ error: "pacienteId e mensagem são obrigatórios" });
  }

  const paciente = await prisma.paciente.findFirst({
    where: { id: pacienteId, nutricionistaId },
  });
  if (!paciente) {
    return res.status(404).json({ error: "Paciente não encontrado" });
  }

  const post = await prisma.feedPost.create({
    data: { tipo, pacienteId, nutricionistaId, mensagem: mensagem.trim() },
    include: { paciente: { select: { id: true, nome: true } } },
  });

  return res.status(201).json(post);
});

// POST /api/feed/:id/curtir  — body: { delta: 1 | -1 }
router.post("/:id/curtir", async (req: AuthRequest, res: Response) => {
  const id = String(req.params.id);
  const delta: number = req.body.delta === -1 ? -1 : 1;

  const post = await prisma.feedPost.findFirst({
    where: { id, nutricionistaId: req.nutricionistaId! },
  });
  if (!post) return res.status(404).json({ error: "Post não encontrado" });

  const updated = await prisma.feedPost.update({
    where: { id },
    data: { curtidas: { increment: delta } },
    select: { id: true, curtidas: true },
  });

  return res.json(updated);
});

// DELETE /api/feed/:id
router.delete("/:id", async (req: AuthRequest, res: Response) => {
  const id = String(req.params.id);
  const post = await prisma.feedPost.findFirst({
    where: { id, nutricionistaId: req.nutricionistaId! },
  });
  if (!post) return res.status(404).json({ error: "Post não encontrado" });

  await prisma.feedPost.delete({ where: { id } });
  return res.json({ ok: true });
});

export default router;
