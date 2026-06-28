import { Router, Response } from "express";
import prisma from "../lib/prisma";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import { planoMiddleware } from "../middleware/plano";
import { gerarFeedAutomatico } from "../lib/feedAutomatico";

const router = Router();
router.use(authMiddleware);
router.use(planoMiddleware);

router.get("/", async (req: AuthRequest, res: Response) => {
  const now = new Date();
  const page = Math.max(1, parseInt(String(req.query.page ?? "1")));
  const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit ?? "50"))));
  const busca = String(req.query.busca ?? "").trim();
  const status = String(req.query.status ?? "todos");

  const where: any = { nutricionistaId: req.nutricionistaId as string };
  if (busca) where.nome = { contains: busca, mode: "insensitive" };
  if (status === "ativo") where.ativo = true;
  if (status === "inativo") where.ativo = false;

  const [total, pacientes] = await prisma.$transaction([
    prisma.paciente.count({ where }),
    prisma.paciente.findMany({
      where,
      include: {
        medicoes: { orderBy: { data: "desc" }, take: 1 },
        consultas: { orderBy: { data: "desc" }, take: 10 },
        cobrancas: {
          where: { status: { not: "pago" } },
          orderBy: { vencimento: "asc" },
          take: 1,
          select: { status: true, vencimento: true },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  const result = pacientes.map((p) => {
    const ultimaConsulta = p.consultas.find((c) => new Date(c.data) < now) ?? null;
    const proximaConsulta = [...p.consultas].reverse().find((c) => new Date(c.data) >= now) ?? null;

    let cobrancaStatus: "em_dia" | "pendente" | "vencido" = "em_dia";
    if (p.cobrancas.length > 0) {
      cobrancaStatus = new Date(p.cobrancas[0].vencimento) < now ? "vencido" : "pendente";
    }

    return {
      ...p,
      ultimaConsulta: ultimaConsulta ? { data: ultimaConsulta.data } : null,
      proximaConsulta: proximaConsulta ? { data: proximaConsulta.data } : null,
      cobrancaStatus,
    };
  });

  res.json({ data: result, total, page, limit, totalPages: Math.ceil(total / limit) });
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
      registrosContato: { orderBy: { data: "desc" }, take: 50 },
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
  const pacienteId      = req.params["id"] as string;
  const nutricionistaId = req.nutricionistaId as string;
  const { data, peso, gordura, musculo, cintura, quadril, braco, coxa, laudo, observacoes } = req.body;
  const medicao = await prisma.medicao.create({
    data: {
      pacienteId,
      data: new Date(data),
      peso: parseFloat(peso),
      gordura: gordura ? parseFloat(gordura) : null,
      musculo: musculo ? parseFloat(musculo) : null,
      cintura: cintura ? parseFloat(cintura) : null,
      quadril: quadril ? parseFloat(quadril) : null,
      braco: braco ? parseFloat(braco) : null,
      coxa: coxa ? parseFloat(coxa) : null,
      laudo,
      observacoes,
    },
  });
  res.json(medicao);

  // fire-and-forget — não atrasa a resposta
  gerarFeedAutomatico(pacienteId, nutricionistaId, parseFloat(peso))
    .catch(err => console.error("[feedAutomatico]", err));
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

// Registros de contato manual
router.post("/:id/contatos", async (req: AuthRequest, res: Response) => {
  const pacienteId = req.params["id"] as string;
  const { tipo, resumo, data } = req.body;

  const paciente = await prisma.paciente.findFirst({
    where: { id: pacienteId, nutricionistaId: req.nutricionistaId as string },
  });
  if (!paciente) return res.status(404).json({ error: "Paciente não encontrado" });

  const dataDate = new Date(data as string);
  dataDate.setUTCHours(12, 0, 0, 0); // noon UTC to avoid timezone boundary issues

  const registro = await prisma.registroContato.create({
    data: { pacienteId, tipo: tipo || "outro", resumo, data: dataDate },
  });
  res.status(201).json(registro);
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
