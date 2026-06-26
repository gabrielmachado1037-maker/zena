import { Router, Response } from "express";
import prisma from "../lib/prisma";
import { authMiddleware, AuthRequest } from "../middleware/auth";

const router = Router();
router.use(authMiddleware);

router.post("/", async (req: AuthRequest, res: Response) => {
  const { pacienteId, template, textoEnviado } = req.body;

  const paciente = await prisma.paciente.findFirst({
    where: { id: pacienteId, nutricionistaId: req.nutricionistaId as string },
  });
  if (!paciente) return res.status(404).json({ error: "Paciente não encontrada" });

  const msg = await prisma.mensagemWhatsApp.create({
    data: { pacienteId, template, textoEnviado },
  });
  res.json(msg);
});

router.get("/paciente/:pacienteId", async (req: AuthRequest, res: Response) => {
  const pacienteId = req.params["pacienteId"] as string;

  const paciente = await prisma.paciente.findFirst({
    where: { id: pacienteId, nutricionistaId: req.nutricionistaId as string },
  });
  if (!paciente) return res.status(404).json({ error: "Paciente não encontrada" });

  const msgs = await prisma.mensagemWhatsApp.findMany({
    where: { pacienteId },
    orderBy: { criadoEm: "desc" },
    take: 30,
  });
  res.json(msgs);
});

export default router;
