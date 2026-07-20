import { Router, Response } from "express";
import { z } from "zod";
import prisma from "../lib/prisma";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { planoMiddleware } from "../middleware/plano";
import { checkModulo } from "../middleware/checkModulo";
import { PLANOS_REFEICOES, resolverPlanoRefeicoes, MIN_REFEICOES, MAX_REFEICOES } from "../config/ligas";
import { gerarRelatorioMensal, gerarInsightsIA } from "../services/relatorioService";
import { gerarCodigoConvite, conviteExpiraEm } from "../lib/convite";
import { anonimizarPaciente } from "../lib/anonimizarPaciente";
import { scoreAderencia30 } from "../lib/adesao";

const router = Router();
router.use(authMiddleware);
router.use(planoMiddleware);
// Prontuário completo (/:id e subrotas) exige módulo 'prontuario'
router.use("/:id", checkModulo("prontuario"));

// Isolamento multi-tenant: o paciente (:id) TEM que ser desta nutricionista.
// router.param dispara para TODA rota /:id (defesa em profundidade contra IDOR).
router.param("id", async (req, res, next, id) => {
  const r = req as AuthRequest;
  const dono = await prisma.paciente.findFirst({
    where: { id: String(id), nutricionistaId: r.nutricionistaId as string },
    select: { id: true },
  });
  if (!dono) {
    res.status(404).json({ error: "Paciente não encontrada" });
    return;
  }
  next();
});

/* ── Schemas (required só onde DB/rota exige; a validação de negócio de cada rota é mantida) ── */
const num = () => z.union([z.string(), z.number()]);
const criarPacienteSchema = z.object({
  nome: z.string({ error: "Nome é obrigatório." }).trim().min(1, "Nome é obrigatório."),
  email: z.string().optional().nullable(),
  telefone: z.string().optional().nullable(),
  objetivo: z.string().optional().nullable(),
  dataInicio: z.string({ error: "Data de início é obrigatória." }).min(1, "Data de início é obrigatória."),
  pesoMeta: num().optional().nullable(),
});
const atualizarPacienteSchema = z.object({
  nome: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  telefone: z.string().optional().nullable(),
  objetivo: z.string().optional().nullable(),
  pesoMeta: num().optional().nullable(),
  ativo: z.boolean().optional(),
  dataNascimento: z.string().optional().nullable(),
  sexo: z.string().optional().nullable(),
  altura: num().optional().nullable(),
});
const planoMissoesSchema = z.object({
  numRefeicoes: z.number().optional(),
  refeicoes: z.array(z.object({ key: z.string(), label: z.string() })).optional(),
  aguaMetaMl: z.number().optional(),
  sonoMetaHoras: z.number().optional(),
  treinoDias: z.array(z.number()).optional(),
});
const consultaSchema = z.object({
  data: z.string({ error: "Data é obrigatória." }).min(1, "Data é obrigatória."),
  status: z.string().optional().nullable(),
  notas: z.string().optional().nullable(),
});
const consultaPatchSchema = z.object({
  status: z.string().optional().nullable(),
  notas: z.string().optional().nullable(),
});
const contatoSchema = z.object({
  tipo: z.string().optional().nullable(),
  resumo: z.string().optional().nullable(),
  data: z.string({ error: "Data é obrigatória." }).min(1, "Data é obrigatória."),
});
const fotoInicialSchema = z.object({
  fotoInicial: z.string().optional().nullable(),
});

router.get("/", async (req: AuthRequest, res: Response) => {
  const now = new Date();
  const page = Math.max(1, parseInt(String(req.query.page ?? "1")));
  const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit ?? "50"))));
  const busca = String(req.query.busca ?? "").trim();
  const status = String(req.query.status ?? "todos");

  // anonimizadoEm: null → pacientes excluídos (LGPD) não aparecem na lista da nutri.
  const where: any = { nutricionistaId: req.nutricionistaId as string, anonimizadoEm: null };
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

  // Score de aderência (30d) por paciente — mesma janela/fórmula do Dashboard (scoreAderencia30).
  const ha30 = new Date(now.getTime() - 30 * 86_400_000);
  const checkins30 = await prisma.registro.groupBy({
    by: ["pacienteId"],
    where: { pacienteId: { in: pacientes.map((p) => p.id) }, data: { gte: ha30 } },
    _count: { _all: true },
  });
  const reg30ByPac: Record<string, number> = {};
  for (const c of checkins30) reg30ByPac[c.pacienteId] = c._count._all;

  // Tendência de aderência (por paciente): check-ins dos últimos 7 dias vs os 7 anteriores —
  // mesma definição do aderenciaSemana do Dashboard (check-in ÷ dias possíveis), aqui base = 7.
  const ha7 = new Date(now.getTime() - 7 * 86_400_000);
  const ha14 = new Date(now.getTime() - 14 * 86_400_000);
  const reg14 = await prisma.registro.findMany({
    where: { pacienteId: { in: pacientes.map((p) => p.id) }, data: { gte: ha14 } },
    select: { pacienteId: true, data: true },
  });
  const trendByPac: Record<string, { r7: number; p7: number }> = {};
  for (const r of reg14) {
    let b = trendByPac[r.pacienteId];
    if (!b) b = trendByPac[r.pacienteId] = { r7: 0, p7: 0 };
    if (new Date(r.data) >= ha7) b.r7++; else b.p7++;
  }
  const aderenciaDeltaDe = (pid: string): number | null => {
    const b = trendByPac[pid];
    if (!b || (b.r7 === 0 && b.p7 === 0)) return null; // sem amostra → sem tendência
    const atual = Math.round(Math.min(b.r7 / 7, 1) * 100);
    const anterior = Math.round(Math.min(b.p7 / 7, 1) * 100);
    return atual - anterior;
  };

  const result = pacientes.map((p) => {
    const ultimaConsulta = p.consultas.find((c) => new Date(c.data) < now) ?? null;
    const proximaConsulta = [...p.consultas].reverse().find((c) => new Date(c.data) >= now) ?? null;

    let cobrancaStatus: "em_dia" | "pendente" | "vencido" = "em_dia";
    if (p.cobrancas.length > 0) {
      cobrancaStatus = new Date(p.cobrancas[0].vencimento) < now ? "vencido" : "pendente";
    }

    return {
      ...p,
      score: scoreAderencia30(reg30ByPac[p.id] || 0),
      aderenciaDelta: aderenciaDeltaDe(p.id),
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

router.post("/", validateBody(criarPacienteSchema), async (req: AuthRequest, res: Response) => {
  const { nome, email, telefone, objetivo, dataInicio, pesoMeta } = req.body;
  // Gera automaticamente o convite individual (uso único) já no cadastro do paciente.
  const paciente = await gerarPacienteComConvite({
    nome,
    email,
    telefone,
    objetivo,
    dataInicio: new Date(dataInicio),
    pesoMeta: pesoMeta ? parseFloat(pesoMeta) : null,
    nutricionistaId: req.nutricionistaId!,
  });
  res.json(paciente);
});

// Cria o paciente já com um conviteCodigo único (retry em caso de colisão do índice único).
async function gerarPacienteComConvite(data: Record<string, unknown>) {
  for (let tentativa = 0; tentativa < 5; tentativa++) {
    try {
      return await prisma.paciente.create({
        data: { ...data, conviteCodigo: gerarCodigoConvite(), conviteStatus: "pendente", conviteExpiraEm: conviteExpiraEm() } as never,
      });
    } catch (e: unknown) {
      // P2002 = colisão do índice único do código → tenta outro
      if ((e as { code?: string })?.code === "P2002" && tentativa < 4) continue;
      throw e;
    }
  }
  throw new Error("Não foi possível gerar o código de convite.");
}

// POST /:id/convite — nutri (re)gera o convite do paciente. Regenerar invalida o código anterior.
// Só permite se o paciente ainda não vinculou conta (convite não utilizado).
router.post("/:id/convite", async (req: AuthRequest, res: Response) => {
  const id = req.params["id"] as string;
  const paciente = await prisma.paciente.findFirst({
    where: { id, nutricionistaId: req.nutricionistaId as string },
    select: { conviteStatus: true },
  });
  if (!paciente) return res.status(404).json({ error: "Paciente não encontrada" });
  if (paciente.conviteStatus === "utilizado") {
    return res.status(409).json({ error: "Este paciente já vinculou a conta — o convite não pode ser gerado de novo." });
  }

  for (let tentativa = 0; tentativa < 5; tentativa++) {
    try {
      const upd = await prisma.paciente.update({
        where: { id },
        data: { conviteCodigo: gerarCodigoConvite(), conviteStatus: "pendente", conviteExpiraEm: conviteExpiraEm(), conviteUsadoEm: null },
        select: { conviteCodigo: true, conviteStatus: true, conviteExpiraEm: true },
      });
      return res.json(upd);
    } catch (e: unknown) {
      if ((e as { code?: string })?.code === "P2002" && tentativa < 4) continue;
      throw e;
    }
  }
  return res.status(500).json({ error: "Não foi possível gerar o código de convite." });
});

router.put("/:id", validateBody(atualizarPacienteSchema), async (req: AuthRequest, res: Response) => {
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

// DELETE /:id — exclui o paciente (LGPD: anonimiza PII/fotos/login, cancela o convite,
// preserva o prontuário anonimizado). Irreversível. IDOR já coberto por router.param.
router.delete("/:id", async (req: AuthRequest, res: Response) => {
  await anonimizarPaciente(req.params["id"] as string);
  res.json({ ok: true });
});

// PUT /:id/plano-missoes — nutri configura o plano de missões da paciente:
// nº de refeições (3–6), meta de água (ml), meta de sono (horas) e dias de treino.
// Aditivo: só atualiza os campos enviados; não altera registros já feitos.
router.put("/:id/plano-missoes", validateBody(planoMissoesSchema), async (req: AuthRequest, res: Response) => {
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
    const ia = await gerarInsightsIA(relatorio);
    relatorio.insightsIA = ia?.resumo.length ? ia.resumo : null;
    relatorio.focoIA = ia?.foco.length ? ia.foco : null;
  }

  return res.json(relatorio);
});

router.post("/:id/consultas", validateBody(consultaSchema), async (req: AuthRequest, res: Response) => {
  const pacienteId = req.params["id"] as string;
  const { data, status, notas } = req.body;
  const consulta = await prisma.consulta.create({
    data: { pacienteId, data: new Date(data), status: status || "agendada", notas },
  });
  res.json(consulta);
});

router.patch("/:id/consultas/:consultaId", validateBody(consultaPatchSchema), async (req: AuthRequest, res: Response) => {
  const pacienteId = req.params["id"] as string;
  const consultaId = req.params["consultaId"] as string;
  // A consulta precisa pertencer a este paciente (que já é desta nutri via middleware).
  const existente = await prisma.consulta.findFirst({
    where: { id: consultaId, pacienteId },
    select: { id: true },
  });
  if (!existente) return res.status(404).json({ error: "Consulta não encontrada" });
  const { status, notas } = req.body;
  const consulta = await prisma.consulta.update({
    where: { id: consultaId },
    data: { status, notas },
  });
  res.json(consulta);
});

// Registros de contato manual
router.post("/:id/contatos", validateBody(contatoSchema), async (req: AuthRequest, res: Response) => {
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
router.patch("/:id/foto-inicial", validateBody(fotoInicialSchema), async (req: AuthRequest, res: Response) => {
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
