import { Router, Response } from "express";
import prisma from "../lib/prisma";
import { authMiddleware, AuthRequest } from "../middleware/auth";

const router = Router();
router.use(authMiddleware);

router.get("/paciente/:pacienteId", async (req: AuthRequest, res: Response) => {
  const pacienteId = req.params["pacienteId"] as string;
  const paciente = await prisma.paciente.findFirst({
    where: { id: pacienteId, nutricionistaId: req.nutricionistaId as string },
  });
  if (!paciente) return res.status(404).json({ error: "Paciente não encontrada" });

  const anamnese = await prisma.anamnese.findUnique({ where: { pacienteId } });
  res.json(anamnese || null);
});

router.put("/paciente/:pacienteId", async (req: AuthRequest, res: Response) => {
  const pacienteId = req.params["pacienteId"] as string;
  const paciente = await prisma.paciente.findFirst({
    where: { id: pacienteId, nutricionistaId: req.nutricionistaId as string },
  });
  if (!paciente) return res.status(404).json({ error: "Paciente não encontrada" });

  const data = req.body;
  const anamnese = await prisma.anamnese.upsert({
    where: { pacienteId },
    update: data,
    create: { pacienteId, ...data },
  });
  res.json(anamnese);
});

export default router;
