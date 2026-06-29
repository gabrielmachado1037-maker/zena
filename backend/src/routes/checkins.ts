import { Router, Response } from "express";
import prisma from "../lib/prisma";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import { checkModulo } from "../middleware/checkModulo";

const router = Router();
router.use(authMiddleware);
router.use(checkModulo("gamificacao"));

router.get("/paciente/:pacienteId", async (req: AuthRequest, res: Response) => {
  const pacienteId = req.params["pacienteId"] as string;

  const paciente = await prisma.paciente.findFirst({
    where: { id: pacienteId, nutricionistaId: req.nutricionistaId as string },
  });
  if (!paciente) return res.status(404).json({ error: "Paciente não encontrada" });

  const checkIns = await prisma.checkIn.findMany({
    where: { pacienteId },
    orderBy: { criadoEm: "desc" },
  });

  res.json(checkIns);
});

export default router;
