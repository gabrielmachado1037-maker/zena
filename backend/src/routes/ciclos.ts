import { Router, Response } from "express";
import { z } from "zod";
import prisma from "../lib/prisma";
import { authMiddleware, AuthRequest, authPacienteMiddleware, PacienteAuthRequest } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { checkModulo } from "../middleware/checkModulo";
import { calcularProgressoCiclo, calcularStatusCiclo, encerrarCiclo } from "../services/cicloService";

const router = Router();

const criarCicloSchema = z.object({
  titulo: z.string().optional().nullable(),
  dataInicio: z.string({ error: "dataInicio e dataFim são obrigatórios" }).min(1, "dataInicio e dataFim são obrigatórios"),
  dataFim: z.string({ error: "dataInicio e dataFim são obrigatórios" }).min(1, "dataInicio e dataFim são obrigatórios"),
  premioDescricao: z.string().optional().nullable(),
  premioTipo: z.string().optional().nullable(),
});
// pacienteId obrigatório: sem ele o updateMany atingiria TODOS os participantes do ciclo.
const mensagemNutriSchema = z.object({
  pacienteId: z.string({ error: "pacienteId é obrigatório" }).min(1, "pacienteId é obrigatório"),
  mensagem: z.string({ error: "Mensagem é obrigatória" }),
});

// ─── Rotas do paciente (antes das /:id para evitar conflito) ──────────────────

// GET /api/ciclos/paciente/atual
router.get("/paciente/atual", authPacienteMiddleware, async (req: PacienteAuthRequest, res: Response) => {
  const ciclo = await prisma.ciclo.findFirst({
    where: { nutricionistaId: req.nutricionistaId!, status: { in: ["ativo", "aquecimento"] } },
    orderBy: { numero: "desc" },
  });

  // Feed de encerramento recente (últimas 24h) — mostrar mesmo sem ciclo ativo
  const ontemTs = Date.now() - 24 * 60 * 60 * 1000;
  const encerramento = await prisma.feedEncerramento.findFirst({
    where: { nutricionistaId: req.nutricionistaId!, publicadoEm: { gte: new Date(ontemTs) } },
    orderBy: { publicadoEm: "desc" },
    include: { vencedor: { select: { id: true, nome: true } }, ciclo: true },
  });

  if (!ciclo) return res.json({ ciclo: null, encerramento_recente: encerramento });

  const { percentual, diasRestantes } = calcularProgressoCiclo(ciclo);
  const statusCalculado = calcularStatusCiclo(ciclo);

  const [top5, minhaPosicao, totalParticipantes] = await Promise.all([
    prisma.cicloParticipante.findMany({
      where: { cicloId: ciclo.id },
      orderBy: { pontosCiclo: "desc" },
      take: 5,
      include: { paciente: { select: { id: true, nome: true, fotoPerfilUrl: true } } },
    }),
    prisma.cicloParticipante.findUnique({
      where: { cicloId_pacienteId: { cicloId: ciclo.id, pacienteId: req.pacienteId! } },
    }),
    prisma.cicloParticipante.count({ where: { cicloId: ciclo.id } }),
  ]);

  return res.json({
    ciclo: { ...ciclo, percentual, diasRestantes, status: statusCalculado },
    ranking_top5: top5,
    minha_posicao: minhaPosicao,
    total_participantes: totalParticipantes,
    encerramento_recente: encerramento,
  });
});

// GET /api/ciclos/paciente/:cicloId/relatorio
router.get("/paciente/:cicloId/relatorio", authPacienteMiddleware, async (req: PacienteAuthRequest, res: Response) => {
  const relatorio = await prisma.relatorioCiclo.findUnique({
    where: { cicloId_pacienteId: { cicloId: req.params.cicloId as string, pacienteId: req.pacienteId! } },
    include: { ciclo: true },
  });
  if (!relatorio) return res.status(404).json({ error: "Relatório não disponível ainda" });

  const top3 = await prisma.cicloParticipante.findMany({
    where: { cicloId: req.params.cicloId as string },
    orderBy: { pontosCiclo: "desc" },
    take: 3,
    include: { paciente: { select: { id: true, nome: true } } },
  });

  return res.json({ ...relatorio, top3 });
});

// ─── Rotas do nutricionista ───────────────────────────────────────────────────

// GET /api/ciclos/atual
router.get("/atual", authMiddleware, checkModulo("gamificacao"), async (req: AuthRequest, res: Response) => {
  const ciclo = await prisma.ciclo.findFirst({
    where: { nutricionistaId: req.nutricionistaId!, status: { in: ["ativo", "aquecimento"] } },
    orderBy: { numero: "desc" },
    include: {
      participantes: {
        orderBy: { pontosCiclo: "desc" },
        take: 5,
        include: { paciente: { select: { id: true, nome: true, fotoPerfilUrl: true } } },
      },
      feedEncerramento: true,
    },
  });

  if (!ciclo) return res.json({ ciclo: null });

  const { percentual, diasRestantes } = calcularProgressoCiclo(ciclo);
  const totalParticipantes = await prisma.cicloParticipante.count({ where: { cicloId: ciclo.id } });

  return res.json({
    ciclo,
    diasRestantes,
    percentual,
    status: calcularStatusCiclo(ciclo),
    ranking_top5: ciclo.participantes,
    total_participantes: totalParticipantes,
  });
});

// GET /api/ciclos
router.get("/", authMiddleware, checkModulo("gamificacao"), async (req: AuthRequest, res: Response) => {
  const ciclos = await prisma.ciclo.findMany({
    where: { nutricionistaId: req.nutricionistaId! },
    orderBy: { numero: "desc" },
    include: { _count: { select: { participantes: true } } },
  });
  return res.json(ciclos);
});

// POST /api/ciclos
router.post("/", authMiddleware, checkModulo("gamificacao"), validateBody(criarCicloSchema), async (req: AuthRequest, res: Response) => {
  const { titulo, dataInicio, dataFim, premioDescricao, premioTipo } = req.body as {
    titulo?: string;
    dataInicio: string;
    dataFim: string;
    premioDescricao?: string;
    premioTipo?: string;
  };

  if (!dataInicio || !dataFim) {
    return res.status(400).json({ error: "dataInicio e dataFim são obrigatórios" });
  }

  const ultimo = await prisma.ciclo.findFirst({
    where: { nutricionistaId: req.nutricionistaId! },
    orderBy: { numero: "desc" },
  });
  const numero = (ultimo?.numero ?? 0) + 1;

  const ciclo = await prisma.ciclo.create({
    data: {
      nutricionistaId: req.nutricionistaId!,
      numero,
      titulo,
      dataInicio: new Date(dataInicio),
      dataFim: new Date(dataFim),
      premioDescricao,
      premioTipo: premioTipo ?? "reconhecimento",
      status: "ativo",
    },
  });

  const pacientes = await prisma.paciente.findMany({
    where: { nutricionistaId: req.nutricionistaId!, ativo: true },
    select: { id: true },
  });
  if (pacientes.length > 0) {
    await prisma.cicloParticipante.createMany({
      data: pacientes.map(p => ({ cicloId: ciclo.id, pacienteId: p.id })),
      skipDuplicates: true,
    });
  }

  return res.status(201).json(ciclo);
});

// GET /api/ciclos/:id/ranking — antes de /:id para não conflitar
router.get("/:id/ranking", authMiddleware, checkModulo("gamificacao"), async (req: AuthRequest, res: Response) => {
  const participantes = await prisma.cicloParticipante.findMany({
    where: { cicloId: req.params.id as string, ciclo: { nutricionistaId: req.nutricionistaId! } },
    orderBy: { pontosCiclo: "desc" },
    include: { paciente: { select: { id: true, nome: true, fotoPerfilUrl: true } } },
  });
  return res.json(participantes);
});

// GET /api/ciclos/:id/relatorio/:pacienteId
router.get("/:id/relatorio/:pacienteId", authMiddleware, checkModulo("gamificacao"), async (req: AuthRequest, res: Response) => {
  const relatorio = await prisma.relatorioCiclo.findUnique({
    where: { cicloId_pacienteId: { cicloId: req.params.id as string, pacienteId: req.params.pacienteId as string } },
  });
  if (!relatorio) return res.status(404).json({ error: "Relatório não encontrado" });
  return res.json(relatorio);
});

// PUT /api/ciclos/:id/encerrar
router.put("/:id/encerrar", authMiddleware, checkModulo("gamificacao"), async (req: AuthRequest, res: Response) => {
  const ciclo = await prisma.ciclo.findFirst({
    where: { id: req.params.id as string, nutricionistaId: req.nutricionistaId! },
  });
  if (!ciclo) return res.status(404).json({ error: "Ciclo não encontrado" });
  if (ciclo.status === "encerrado") return res.status(400).json({ error: "Ciclo já encerrado" });

  const proximoCiclo = await encerrarCiclo(ciclo.id);
  return res.json({ ok: true, proximoCiclo });
});

// PUT /api/ciclos/:id/mensagem-nutri
router.put("/:id/mensagem-nutri", authMiddleware, checkModulo("gamificacao"), validateBody(mensagemNutriSchema), async (req: AuthRequest, res: Response) => {
  const { pacienteId, mensagem } = req.body as { pacienteId: string; mensagem: string };
  // Escopo por nutri: o ciclo (via relação) tem que ser desta nutricionista (evita IDOR por cicloId).
  const result = await prisma.relatorioCiclo.updateMany({
    where: { cicloId: req.params.id as string, pacienteId, ciclo: { nutricionistaId: req.nutricionistaId! } },
    data: { mensagemNutri: mensagem },
  });
  return res.json({ ok: true, updated: result.count });
});

// GET /api/ciclos/:id
router.get("/:id", authMiddleware, checkModulo("gamificacao"), async (req: AuthRequest, res: Response) => {
  const ciclo = await prisma.ciclo.findFirst({
    where: { id: req.params.id as string, nutricionistaId: req.nutricionistaId! },
    include: {
      participantes: {
        orderBy: { pontosCiclo: "desc" },
        include: { paciente: { select: { id: true, nome: true, fotoPerfilUrl: true } } },
      },
      feedEncerramento: true,
    },
  });
  if (!ciclo) return res.status(404).json({ error: "Ciclo não encontrado" });

  const { percentual, diasRestantes } = calcularProgressoCiclo(ciclo);
  return res.json({ ...ciclo, percentual, diasRestantes });
});

export default router;
