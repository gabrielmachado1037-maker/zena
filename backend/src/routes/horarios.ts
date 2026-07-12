import { Router, Response } from "express";
import { z } from "zod";
import prisma from "../lib/prisma";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { checkModulo } from "../middleware/checkModulo";

const router = Router();
router.use(authMiddleware);
router.use(checkModulo("agenda"));

const horarioSchema = z.object({
  diaSemana: z.number({ error: "diaSemana e hora são obrigatórios" }),
  hora: z.string({ error: "diaSemana e hora são obrigatórios" }).min(1, "diaSemana e hora são obrigatórios"),
  duracaoMinutos: z.number().optional().nullable(),
});

router.get("/", async (req: AuthRequest, res: Response) => {
  const horarios = await prisma.horarioDisponivel.findMany({
    where: { nutricionistaId: req.nutricionistaId as string },
    orderBy: [{ diaSemana: "asc" }, { hora: "asc" }],
  });
  res.json(horarios);
});

router.post("/", validateBody(horarioSchema), async (req: AuthRequest, res: Response) => {
  const { diaSemana, hora, duracaoMinutos } = req.body;
  try {
    const horario = await prisma.horarioDisponivel.upsert({
      where: {
        nutricionistaId_diaSemana_hora: {
          nutricionistaId: req.nutricionistaId as string,
          diaSemana,
          hora,
        },
      },
      update: { ativo: true, duracaoMinutos: duracaoMinutos || 60 },
      create: {
        nutricionistaId: req.nutricionistaId as string,
        diaSemana,
        hora,
        duracaoMinutos: duracaoMinutos || 60,
      },
    });
    res.json(horario);
  } catch {
    res.status(400).json({ error: "Erro ao criar horário" });
  }
});

router.delete("/:id", async (req: AuthRequest, res: Response) => {
  const id = req.params["id"] as string;
  const horario = await prisma.horarioDisponivel.findFirst({
    where: { id, nutricionistaId: req.nutricionistaId as string },
  });
  if (!horario) return res.status(404).json({ error: "Horário não encontrado" });

  await prisma.horarioDisponivel.delete({ where: { id } });
  res.json({ ok: true });
});

export default router;
