import { Router, Response } from "express";
import prisma from "../lib/prisma";
import { authPacienteMiddleware, PacienteAuthRequest } from "../middleware/auth";
import { processarChecklist } from "../services/cicloService";

const router = Router();
router.use(authPacienteMiddleware);

// POST /api/checklist
router.post("/", async (req: PacienteAuthRequest, res: Response) => {
  const { refeicoesOk, aguaOk, treinoOk } = req.body as {
    refeicoesOk: boolean;
    aguaOk: boolean;
    treinoOk: boolean;
  };

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const jaFez = await prisma.checklistDiario.findUnique({
    where: { pacienteId_data: { pacienteId: req.pacienteId!, data: hoje } },
  });
  if (jaFez) return res.status(409).json({ error: "Checklist já enviado hoje" });

  const cicloAtivo = await prisma.ciclo.findFirst({
    where: { nutricionistaId: req.nutricionistaId!, status: { in: ["ativo", "aquecimento"] } },
    orderBy: { numero: "desc" },
  });

  const result = await processarChecklist(
    req.pacienteId!,
    cicloAtivo?.id ?? null,
    { refeicoesOk: !!refeicoesOk, aguaOk: !!aguaOk, treinoOk: !!treinoOk }
  );

  let posicaoAtual: number | null = null;
  let totalParticipantes: number | null = null;
  if (cicloAtivo) {
    const [part, total] = await Promise.all([
      prisma.cicloParticipante.findUnique({
        where: { cicloId_pacienteId: { cicloId: cicloAtivo.id, pacienteId: req.pacienteId! } },
      }),
      prisma.cicloParticipante.count({ where: { cicloId: cicloAtivo.id } }),
    ]);
    posicaoAtual = part?.posicaoAtual ?? null;
    totalParticipantes = total;
  }

  return res.status(201).json({ ...result, posicaoAtual, totalParticipantes });
});

// GET /api/checklist/hoje
router.get("/hoje", async (req: PacienteAuthRequest, res: Response) => {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const checklist = await prisma.checklistDiario.findUnique({
    where: { pacienteId_data: { pacienteId: req.pacienteId!, data: hoje } },
  });
  return res.json({ checklist, feito: !!checklist });
});

// GET /api/checklist/historico
router.get("/historico", async (req: PacienteAuthRequest, res: Response) => {
  const ha30dias = new Date();
  ha30dias.setDate(ha30dias.getDate() - 30);
  ha30dias.setHours(0, 0, 0, 0);

  const historico = await prisma.checklistDiario.findMany({
    where: { pacienteId: req.pacienteId!, data: { gte: ha30dias } },
    orderBy: { data: "desc" },
  });
  return res.json(historico);
});

export default router;
