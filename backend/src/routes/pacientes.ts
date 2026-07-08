import { Router, Response } from "express";
import prisma from "../lib/prisma";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import { planoMiddleware } from "../middleware/plano";
import { checkModulo } from "../middleware/checkModulo";
import { gerarFeedAutomatico } from "../lib/feedAutomatico";
import { PLANOS_REFEICOES, resolverPlanoRefeicoes, MIN_REFEICOES, MAX_REFEICOES } from "../config/ligas";
import { gerarRelatorioMensal, gerarInsightsIA } from "../services/relatorioService";

const router = Router();
router.use(authMiddleware);
router.use(planoMiddleware);
// Prontuário completo (/:id e subrotas) exige módulo 'prontuario'
router.use("/:id", checkModulo("prontuario"));

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

// PUT /:id/plano-missoes — nutri configura o plano de missões da paciente:
// nº de refeições (3–6), meta de água (ml), meta de sono (horas) e dias de treino.
// Aditivo: só atualiza os campos enviados; não altera registros já feitos.
router.put("/:id/plano-missoes", async (req: AuthRequest, res: Response) => {
  const id = req.params["id"] as string;
  const { numRefeicoes, refeicoes, aguaMetaMl, sonoMetaHoras, treinoDias } = req.body as {
    numRefeicoes?: number; refeicoes?: { key: string; label: string }[];
    aguaMetaMl?: number; sonoMetaHoras?: number; treinoDias?: number[];
  };

  const paciente = await prisma.paciente.findFirst({ where: { id, nutricionistaId: req.nutricionistaId as string } });
  if (!paciente) return res.status(404).json({ error: "Paciente não encontrada" });

  const data: { planoRefeicoes?: { key: string; label: string }[]; aguaMetaMl?: number; sonoMetaHoras?: number; treinoDias?: number[] } = {};

  if (numRefeicoes !== undefined || refeicoes !== undefined) {
    // Preferência: preset por quantidade (3–6). Também aceita lista custom [{key,label}].
    let plano: { key: string; label: string }[] | null = null;
    if (typeof numRefeicoes === "number" && PLANOS_REFEICOES[numRefeicoes]) plano = PLANOS_REFEICOES[numRefeicoes];
    else if (Array.isArray(refeicoes) && refeicoes.length >= MIN_REFEICOES) plano = resolverPlanoRefeicoes(refeicoes);
    if (!plano) return res.status(400).json({ error: `Informe numRefeicoes entre ${MIN_REFEICOES} e ${MAX_REFEICOES}.` });
    data.planoRefeicoes = plano;
  }
  if (aguaMetaMl !== undefined) {
    if (typeof aguaMetaMl !== "number" || aguaMetaMl < 500 || aguaMetaMl > 8000) {
      return res.status(400).json({ error: "Meta de água inválida (500–8000 ml)." });
    }
    data.aguaMetaMl = Math.round(aguaMetaMl);
  }
  if (sonoMetaHoras !== undefined) {
    if (typeof sonoMetaHoras !== "number" || sonoMetaHoras < 4 || sonoMetaHoras > 12) {
      return res.status(400).json({ error: "Meta de sono inválida (4–12 h)." });
    }
    data.sonoMetaHoras = Math.round(sonoMetaHoras);
  }
  if (treinoDias !== undefined) {
    if (!Array.isArray(treinoDias) || treinoDias.some((d) => typeof d !== "number" || d < 0 || d > 6)) {
      return res.status(400).json({ error: "Dias de treino inválidos (0–6)." });
    }
    data.treinoDias = Array.from(new Set(treinoDias.map((d) => Math.round(d)))).sort((a, b) => a - b);
  }

  if (Object.keys(data).length === 0) {
    return res.status(400).json({ error: "Nada para atualizar." });
  }

  const updated = await prisma.paciente.update({
    where: { id },
    data,
    select: { planoRefeicoes: true, aguaMetaMl: true, sonoMetaHoras: true, treinoDias: true },
  });
  res.json({
    planoRefeicoes: updated.planoRefeicoes,
    aguaMetaMl: updated.aguaMetaMl,
    sonoMetaHoras: updated.sonoMetaHoras,
    treinoDias: updated.treinoDias,
  });
});

// GET /:id/relatorio-mensal?inicio=AAAA-MM-DD&fim=AAAA-MM-DD&ia=1
// Relatório do paciente num intervalo livre (ciclo escolhido pela nutri, ex.: 15→15).
// Só leitura. ?ia=1 acrescenta a leitura em "voz de nutricionista" (fallback: regras).
router.get("/:id/relatorio-mensal", async (req: AuthRequest, res: Response) => {
  const id = req.params["id"] as string;

  const paciente = await prisma.paciente.findFirst({
    where: { id, nutricionistaId: req.nutricionistaId as string },
    select: { id: true },
  });
  if (!paciente) return res.status(404).json({ error: "Paciente não encontrada" });

  // Datas: default = últimos 30 dias. Aceita YYYY-MM-DD (interpretado em UTC).
  const hoje = new Date();
  const fimStr = String(req.query.fim ?? "").trim();
  const iniStr = String(req.query.inicio ?? "").trim();
  const fim = fimStr ? new Date(`${fimStr}T00:00:00Z`) : new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), hoje.getUTCDate()));
  const inicio = iniStr ? new Date(`${iniStr}T00:00:00Z`) : new Date(fim.getTime() - 29 * 86_400_000);

  if (isNaN(inicio.getTime()) || isNaN(fim.getTime())) return res.status(400).json({ error: "Datas inválidas." });
  if (inicio.getTime() > fim.getTime()) return res.status(400).json({ error: "A data inicial deve ser anterior à final." });
  if (fim.getTime() - inicio.getTime() > 366 * 86_400_000) return res.status(400).json({ error: "Intervalo máximo de 12 meses." });

  const relatorio = await gerarRelatorioMensal(id, inicio, fim);
  if (!relatorio) return res.status(404).json({ error: "Paciente não encontrada" });

  if (String(req.query.ia ?? "") === "1") {
    relatorio.insightsIA = await gerarInsightsIA(relatorio);
  }

  return res.json(relatorio);
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
