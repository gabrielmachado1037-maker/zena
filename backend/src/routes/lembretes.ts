import { Router, Response } from "express";
import { z } from "zod";
import prisma from "../lib/prisma";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import { validateBody } from "../middleware/validate";

const router = Router();
router.use(authMiddleware);

const lembreteSchema = z.object({ status: z.string().optional().nullable() });

router.get("/", async (req: AuthRequest, res: Response) => {
  const { status } = req.query;
  const lembretes = await prisma.lembrete.findMany({
    where: {
      nutricionistaId: req.nutricionistaId as string,
      ...(status ? { status: status as string } : {}),
    },
    include: { paciente: { select: { id: true, nome: true, telefone: true, linkUnico: true } } },
    orderBy: { criadoEm: "desc" },
    take: 30,
  });
  res.json(lembretes);
});

router.patch("/:id", validateBody(lembreteSchema), async (req: AuthRequest, res: Response) => {
  const id = req.params["id"] as string;
  const { status } = req.body;
  const lembrete = await prisma.lembrete.findFirst({
    where: { id, nutricionistaId: req.nutricionistaId as string },
  });
  if (!lembrete) return res.status(404).json({ error: "Lembrete não encontrado" });

  const updated = await prisma.lembrete.update({ where: { id }, data: { status } });
  res.json(updated);
});

export default router;
