import { Router, Response } from "express";
import { Prisma } from "@prisma/client";
import prisma from "../lib/prisma";
import { authMiddleware, AuthRequest } from "../middleware/auth";

// Onboarding de 1º acesso da nutricionista. As 4 etapas são DETECTADAS dos dados
// reais (não duplica regra de negócio); só o status geral e o "convite enviado"
// são persistidos. Grandfather: contas antigas já vêm com status "concluido".
const router = Router();
router.use(authMiddleware);

// GET /api/onboarding — status + as 4 etapas detectadas automaticamente.
router.get("/", async (req: AuthRequest, res: Response) => {
  const nutricionistaId = req.nutricionistaId as string;

  const [nutri, pacientes, personalizados, desafios, convitesUsados, primeiroPaciente] = await Promise.all([
    prisma.nutricionista.findUnique({
      where: { id: nutricionistaId },
      select: { onboardingStatus: true, onboardingConviteEnviado: true },
    }),
    prisma.paciente.count({ where: { nutricionistaId } }),
    prisma.paciente.count({
      where: {
        nutricionistaId,
        OR: [
          { aguaMetaMl: { not: null } },
          { sonoMetaHoras: { not: null } },
          { treinoDias: { isEmpty: false } },
          { planoRefeicoes: { not: Prisma.DbNull } },
        ],
      },
    }),
    prisma.desafio.count({ where: { nutricionistaId } }),
    prisma.paciente.count({ where: { nutricionistaId, conviteStatus: "utilizado" } }),
    prisma.paciente.findFirst({
      where: { nutricionistaId, anonimizadoEm: null },
      orderBy: { dataInicio: "asc" },
      select: { id: true, nome: true, conviteCodigo: true },
    }),
  ]);

  const passos = {
    paciente: pacientes > 0,
    personalizacao: personalizados > 0,
    desafio: desafios > 0,
    convite: !!nutri?.onboardingConviteEnviado || convitesUsados > 0,
  };
  const concluidos = Object.values(passos).filter(Boolean).length;

  res.json({
    status: nutri?.onboardingStatus ?? "concluido",
    passos,
    concluidos,
    total: 4,
    primeiroPaciente: primeiroPaciente ?? null,
  });
});

// POST /api/onboarding/iniciar — nutri clicou em "Começar configuração".
router.post("/iniciar", async (req: AuthRequest, res: Response) => {
  await prisma.nutricionista.updateMany({
    where: { id: req.nutricionistaId as string, onboardingStatus: "pendente" },
    data: { onboardingStatus: "andamento" },
  });
  res.json({ ok: true });
});

// POST /api/onboarding/convite-enviado — nutri compartilhou o convite (etapa 4).
router.post("/convite-enviado", async (req: AuthRequest, res: Response) => {
  await prisma.nutricionista.update({
    where: { id: req.nutricionistaId as string },
    data: { onboardingConviteEnviado: true },
  });
  res.json({ ok: true });
});

// POST /api/onboarding/concluir — 4 etapas prontas; nunca mais exibir.
router.post("/concluir", async (req: AuthRequest, res: Response) => {
  await prisma.nutricionista.update({
    where: { id: req.nutricionistaId as string },
    data: { onboardingStatus: "concluido" },
  });
  res.json({ ok: true });
});

export default router;
