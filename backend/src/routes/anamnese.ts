import { Router, Response } from "express";
import { z } from "zod";
import prisma from "../lib/prisma";
import { authMiddleware, AuthRequest } from "../middleware/auth";

const router = Router();
router.use(authMiddleware);

// Só os campos do modelo Anamnese; z.object descarta chaves desconhecidas (evita mass-assignment no upsert).
const anamneseSchema = z.object({
  queixaPrincipal: z.string().optional().nullable(),
  historicoDieta: z.string().optional().nullable(),
  restricoes: z.string().optional().nullable(),
  medicamentos: z.string().optional().nullable(),
  condicoesSaude: z.string().optional().nullable(),
  nivelAtividade: z.string().optional().nullable(),
  horasSono: z.number().int().optional().nullable(),
  nivelEstresse: z.number().int().optional().nullable(),
  refeicoesDia: z.number().int().optional().nullable(),
  comeCozinha: z.boolean().optional().nullable(),
  comeForaCasa: z.number().int().optional().nullable(),
  consumoAgua: z.number().optional().nullable(),
  motivacao: z.string().optional().nullable(),
  expectativas: z.string().optional().nullable(),
});

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

  const parsed = anamneseSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos." });
  }
  const data = parsed.data;
  const anamnese = await prisma.anamnese.upsert({
    where: { pacienteId },
    update: data,
    create: { pacienteId, ...data },
  });
  res.json(anamnese);
});

export default router;
