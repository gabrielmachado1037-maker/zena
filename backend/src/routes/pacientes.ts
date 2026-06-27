import { Router, Response } from "express";
import prisma from "../lib/prisma";
import { authMiddleware, AuthRequest } from "../middleware/auth";

const router = Router();
router.use(authMiddleware);

router.get("/", async (req: AuthRequest, res: Response) => {
  const pacientes = await prisma.paciente.findMany({
    where: { nutricionistaId: req.nutricionistaId as string },
    include: {
      medicoes: { orderBy: { data: "desc" }, take: 1 },
      consultas: { orderBy: { data: "desc" }, take: 1 },
    },
    orderBy: { createdAt: "desc" },
  });
  res.json(pacientes);
});

router.get("/:id", async (req: AuthRequest, res: Response) => {
  const id = req.params["id"] as string;
  const paciente = await prisma.paciente.findFirst({
    where: { id, nutricionistaId: req.nutricionistaId as string },
    include: {
      medicoes: { orderBy: { data: "desc" } },
      consultas: { orderBy: { data: "desc" } },
      cobrancas: { orderBy: { vencimento: "desc" } },
      planosAlimentares: { orderBy: { dataCriacao: "desc" } },
      checkIns: { orderBy: { criadoEm: "desc" }, take: 20 },
      mensagens: { orderBy: { criadoEm: "desc" }, take: 30 },
      anamnese: true,
    },
  });
  if (!paciente) return res.status(404).json({ error: "Paciente não encontrado" });
  res.json(paciente);
});

router.post("/", async (req: AuthRequest, res: Response) => {
  const { nome, email, telefone, objetivo, dataInicio, pesoMeta } = req.body;
  const paciente = await prisma.paciente.create({
    data: {
      nome,
      email,
      telefone,
      objetivo,
      dataInicio: new Date(dataInicio),
      pesoMeta: pesoMeta ? parseFloat(pesoMeta) : null,
      nutricionistaId: req.nutricionistaId!,
    },
  });
  res.json(paciente);
});

router.put("/:id", async (req: AuthRequest, res: Response) => {
  const id = req.params["id"] as string;
  const { nome, email, telefone, objetivo, pesoMeta, ativo, dataNascimento, sexo, altura } = req.body;
  const paciente = await prisma.paciente.findFirst({ where: { id, nutricionistaId: req.nutricionistaId as string } });
  if (!paciente) return res.status(404).json({ error: "Paciente não encontrada" });
  const updated = await prisma.paciente.update({
    where: { id },
    data: {
      nome, email, telefone, objetivo, ativo,
      pesoMeta: pesoMeta !== undefined ? (pesoMeta ? parseFloat(pesoMeta) : null) : undefined,
      altura: altura !== undefined ? (altura ? parseFloat(altura) : null) : undefined,
      dataNascimento: dataNascimento ? new Date(dataNascimento) : null,
      sexo: sexo || null,
    },
  });
  res.json(updated);
});

router.post("/:id/medicoes", async (req: AuthRequest, res: Response) => {
  const pacienteId = req.params["id"] as string;
  const { data, peso, gordura, musculo, cintura, quadril, laudo, observacoes } = req.body;
  const medicao = await prisma.medicao.create({
    data: {
      pacienteId,
      data: new Date(data),
      peso: parseFloat(peso),
      gordura: gordura ? parseFloat(gordura) : null,
      musculo: musculo ? parseFloat(musculo) : null,
      cintura: cintura ? parseFloat(cintura) : null,
      quadril: quadril ? parseFloat(quadril) : null,
      laudo,
      observacoes,
    },
  });
  res.json(medicao);
});

router.post("/:id/planos", async (req: AuthRequest, res: Response) => {
  const pacienteId = req.params["id"] as string;
  const { cafeManha, lancheManha, almoco, lancheTarde, jantar, ceia, observacoes } = req.body;
  const plano = await prisma.planoAlimentar.create({
    data: { pacienteId, cafeManha, lancheManha, almoco, lancheTarde, jantar, ceia, observacoes },
  });
  res.json(plano);
});

router.post("/:id/consultas", async (req: AuthRequest, res: Response) => {
  const pacienteId = req.params["id"] as string;
  const { data, status, notas } = req.body;
  const consulta = await prisma.consulta.create({
    data: { pacienteId, data: new Date(data), status: status || "agendada", notas },
  });
  res.json(consulta);
});

router.patch("/:id/consultas/:consultaId", async (req: AuthRequest, res: Response) => {
  const consultaId = req.params["consultaId"] as string;
  const { status, notas } = req.body;
  const consulta = await prisma.consulta.update({
    where: { id: consultaId },
    data: { status, notas },
  });
  res.json(consulta);
});

// Upload foto inicial (nutritionist sets the before photo)
router.patch("/:id/foto-inicial", async (req: AuthRequest, res: Response) => {
  const id = req.params["id"] as string;
  const { fotoInicial } = req.body;

  if (fotoInicial && fotoInicial.length > 1100000) {
    return res.status(400).json({ error: "Foto muito grande." });
  }

  const paciente = await prisma.paciente.updateMany({
    where: { id, nutricionistaId: req.nutricionistaId as string },
    data: { fotoInicial: fotoInicial || null },
  });
  res.json(paciente);
});

export default router;
