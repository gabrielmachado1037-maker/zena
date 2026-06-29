import { Router, Response } from "express";
import prisma from "../lib/prisma";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import { checkModulo } from "../middleware/checkModulo";

const router = Router();
router.use(authMiddleware);
router.use(checkModulo("agenda"));

router.get("/", async (req: AuthRequest, res: Response) => {
  const { inicio, fim } = req.query;
  const where: any = { paciente: { nutricionistaId: req.nutricionistaId } };
  if (inicio && fim) {
    where.data = {
      gte: new Date(inicio as string),
      lte: new Date((fim as string) + "T23:59:59"),
    };
  }
  const consultas = await prisma.consulta.findMany({
    where,
    include: { paciente: { select: { id: true, nome: true } } },
    orderBy: { data: "asc" },
  });
  res.json(consultas);
});

router.post("/", async (req: AuthRequest, res: Response) => {
  const { pacienteId, data, tipo, notas } = req.body;
  const paciente = await prisma.paciente.findFirst({
    where: { id: pacienteId, nutricionistaId: req.nutricionistaId },
  });
  if (!paciente) return res.status(404).json({ error: "Paciente não encontrada" });
  const consulta = await prisma.consulta.create({
    data: {
      pacienteId,
      data: new Date(data),
      tipo: tipo || "consulta",
      notas: notas || null,
      status: "agendada",
    },
    include: { paciente: { select: { id: true, nome: true } } },
  });
  res.json(consulta);
});

router.patch("/:id", async (req: AuthRequest, res: Response) => {
  const id = req.params["id"] as string;
  const consulta = await prisma.consulta.findFirst({
    where: { id, paciente: { nutricionistaId: req.nutricionistaId } },
  });
  if (!consulta) return res.status(404).json({ error: "Consulta não encontrada" });
  const { status, data, notas, tipo } = req.body;
  const updated = await prisma.consulta.update({
    where: { id },
    data: {
      ...(status !== undefined && { status }),
      ...(data !== undefined && { data: new Date(data) }),
      ...(notas !== undefined && { notas }),
      ...(tipo !== undefined && { tipo }),
    },
    include: { paciente: { select: { id: true, nome: true } } },
  });
  res.json(updated);
});

export default router;
