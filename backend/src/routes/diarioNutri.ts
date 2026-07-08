import { Router, Response } from "express";
import prisma from "../lib/prisma";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import { planoMiddleware } from "../middleware/plano";

const router = Router();
router.use(authMiddleware);
router.use(planoMiddleware);

async function pacienteDoNutri(id: string, nutricionistaId: string) {
  return prisma.paciente.findFirst({ where: { id, nutricionistaId } });
}

// GET /api/diario/:id — diário de bordo completo do paciente (liga, registros, conquistas, desafios, mensagens)
router.get("/:id", async (req: AuthRequest, res: Response) => {
  const id = String(req.params.id);
  const nutricionistaId = req.nutricionistaId as string;

  const paciente = await prisma.paciente.findFirst({
    where: { id, nutricionistaId },
    select: {
      id: true, nome: true, email: true, objetivo: true, pesoMeta: true,
      fotoPerfilUrl: true, fotoInicial: true,
      pontosTotal: true, ligaAtual: true, ligaNivel: true,
      streakAtual: true, streakMaximo: true, ultimoCheckin: true, diasInativo: true, barraCongelada: true,
      planoRefeicoes: true,
    },
  });
  if (!paciente) return res.status(404).json({ error: "Paciente não encontrado" });

  const [registros, conquistas, desafios, mensagens, medicoes, fotosEvolucao, pontosLog, streakMarcos] =
    await Promise.all([
      prisma.registro.findMany({ where: { pacienteId: id }, orderBy: { data: "desc" }, take: 60 }),
      prisma.conquista.findMany({ where: { pacienteId: id }, orderBy: { createdAt: "desc" } }),
      prisma.desafioProgresso.findMany({
        where: { pacienteId: id },
        include: { desafio: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.mensagemNutri.findMany({ where: { pacienteId: id }, orderBy: { createdAt: "desc" }, take: 50 }),
      prisma.medicao.findMany({ where: { pacienteId: id }, orderBy: { data: "asc" } }),
      prisma.fotoEvolucao.findMany({ where: { pacienteId: id }, orderBy: { data: "desc" } }),
      prisma.pontosLog.findMany({ where: { pacienteId: id }, orderBy: { data: "desc" }, take: 90 }),
      prisma.streakMarco.findMany({ where: { pacienteId: id }, orderBy: { concedidoEm: "desc" } }),
    ]);

  res.json({ paciente, registros, conquistas, desafios, mensagens, medicoes, fotosEvolucao, pontosLog, streakMarcos });
});

// POST /api/diario/:id/mensagem — nutricionista envia mensagem ao paciente
router.post("/:id/mensagem", async (req: AuthRequest, res: Response) => {
  const id = String(req.params.id);
  const nutricionistaId = req.nutricionistaId as string;
  const { tipo, conteudo } = req.body as { tipo?: string; conteudo?: string };

  if (!conteudo || !conteudo.trim()) return res.status(400).json({ error: "Mensagem vazia" });
  if (!(await pacienteDoNutri(id, nutricionistaId))) return res.status(404).json({ error: "Paciente não encontrado" });

  const msg = await prisma.mensagemNutri.create({
    data: { nutricionistaId, pacienteId: id, tipo: tipo || "motivacional", conteudo: conteudo.trim() },
  });
  res.status(201).json(msg);
});

// PATCH /api/diario/:id/registro/:registroId/ajuste-lido — marca pedido de ajuste como lido
router.patch("/:id/registro/:registroId/ajuste-lido", async (req: AuthRequest, res: Response) => {
  const id = String(req.params.id);
  const registroId = String(req.params.registroId);
  const nutricionistaId = req.nutricionistaId as string;

  if (!(await pacienteDoNutri(id, nutricionistaId))) return res.status(404).json({ error: "Paciente não encontrado" });

  const registro = await prisma.registro.updateMany({
    where: { id: registroId, pacienteId: id },
    data: { ajusteLido: true },
  });
  res.json(registro);
});

export default router;
