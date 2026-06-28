import { Router, Response } from "express";
import prisma from "../lib/prisma";
import { authMiddleware, AuthRequest } from "../middleware/auth";

const router = Router();
router.use(authMiddleware);

// GET /api/planos-alimentares — todos os pacientes com o plano mais recente
router.get("/", async (req: AuthRequest, res: Response) => {
  const nutricionistaId = req.nutricionistaId!;
  const busca = String(req.query.busca ?? "").trim();
  const filtro = String(req.query.filtro ?? "todos"); // todos | com_plano | sem_plano

  const where: any = { nutricionistaId, ativo: true };
  if (busca) where.nome = { contains: busca, mode: "insensitive" };

  const pacientes = await prisma.paciente.findMany({
    where,
    orderBy: { nome: "asc" },
    select: {
      id: true,
      nome: true,
      objetivo: true,
      planosAlimentares: {
        orderBy: { dataCriacao: "desc" },
        take: 1,
        select: {
          id: true,
          dataCriacao: true,
          cafeManha: true,
          lancheManha: true,
          almoco: true,
          lancheTarde: true,
          jantar: true,
          ceia: true,
          observacoes: true,
        },
      },
    },
  });

  const result = pacientes
    .map(p => ({
      id: p.id,
      nome: p.nome,
      objetivo: p.objetivo,
      plano: p.planosAlimentares[0] ?? null,
    }))
    .filter(p => {
      if (filtro === "com_plano") return p.plano !== null;
      if (filtro === "sem_plano") return p.plano === null;
      return true;
    });

  return res.json({ pacientes: result, total: result.length });
});

// GET /api/planos-alimentares/:pacienteId — histórico completo de planos de um paciente
router.get("/:pacienteId", async (req: AuthRequest, res: Response) => {
  const pacienteId = String(req.params.pacienteId);

  const paciente = await prisma.paciente.findFirst({
    where: { id: pacienteId, nutricionistaId: req.nutricionistaId! },
    select: { id: true, nome: true },
  });
  if (!paciente) return res.status(404).json({ error: "Paciente não encontrado" });

  const planos = await prisma.planoAlimentar.findMany({
    where: { pacienteId },
    orderBy: { dataCriacao: "desc" },
  });

  return res.json({ paciente, planos });
});

export default router;
