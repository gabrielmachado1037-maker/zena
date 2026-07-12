import { Router, Response } from "express";
import { z } from "zod";
import prisma from "../lib/prisma";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { checkModulo } from "../middleware/checkModulo";

const router = Router();
router.use(authMiddleware);
router.use(checkModulo("agenda"));

const criarConsultaSchema = z.object({
  pacienteId: z.string({ error: "Paciente é obrigatório." }).min(1, "Paciente é obrigatório."),
  data: z.string({ error: "Data é obrigatória." }).min(1, "Data é obrigatória."),
  tipo: z.string().optional().nullable(),
  notas: z.string().optional().nullable(),
});
const patchConsultaSchema = z.object({
  status: z.string().optional().nullable(),
  data: z.string().optional().nullable(),
  notas: z.string().optional().nullable(),
  tipo: z.string().optional().nullable(),
});

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

router.post("/", validateBody(criarConsultaSchema), async (req: AuthRequest, res: Response) => {
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

router.patch("/:id", validateBody(patchConsultaSchema), async (req: AuthRequest, res: Response) => {
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
