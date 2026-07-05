import { Router, Response } from "express";
import prisma from "../lib/prisma";
import { authPacienteMiddleware, PacienteAuthRequest } from "../middleware/auth";
import { calcularPontosRegistro, calcularLiga } from "../config/ligas";

const router = Router();
router.use(authPacienteMiddleware);

// POST /api/registros
router.post("/", async (req: PacienteAuthRequest, res: Response) => {
  const {
    alimentacaoOk, treinoOk, aguaOk, sonoOk,
    tipoRegistro, fotoUrl, descricao, humor, tags,
  } = req.body as {
    alimentacaoOk: boolean; treinoOk: boolean; aguaOk: boolean; sonoOk: boolean;
    tipoRegistro?: string; fotoUrl?: string; descricao?: string; humor?: string; tags?: string[];
  };

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const jaFez = await prisma.registro.findUnique({
    where: { pacienteId_data: { pacienteId: req.pacienteId!, data: hoje } },
  });
  if (jaFez) return res.status(409).json({ error: "Registro já enviado hoje" });

  const { total: pontosGanhos, detalhes: pontosDetalhes } = calcularPontosRegistro({
    alimentacaoOk: !!alimentacaoOk, treinoOk: !!treinoOk, aguaOk: !!aguaOk, sonoOk: !!sonoOk,
  });

  const paciente = await prisma.paciente.findUnique({ where: { id: req.pacienteId! } });
  if (!paciente) return res.status(404).json({ error: "Paciente não encontrado" });

  const ontem = new Date(hoje);
  ontem.setDate(ontem.getDate() - 1);
  const registrouOntem = paciente.ultimoCheckin
    ? new Date(paciente.ultimoCheckin).getTime() === ontem.getTime()
    : false;

  const streakAtual = registrouOntem ? paciente.streakAtual + 1 : 1;
  const streakMaximo = Math.max(paciente.streakMaximo, streakAtual);
  const pontosTotal = paciente.pontosTotal + pontosGanhos;
  const liga = calcularLiga(pontosTotal);

  const [registro] = await prisma.$transaction([
    prisma.registro.create({
      data: {
        pacienteId: req.pacienteId!,
        data: hoje,
        alimentacaoOk: !!alimentacaoOk,
        treinoOk: !!treinoOk,
        aguaOk: !!aguaOk,
        sonoOk: !!sonoOk,
        tipoRegistro: tipoRegistro ?? "normal",
        fotoUrl,
        descricao,
        humor,
        tags: tags ?? [],
        pontosGanhos,
        pontosDetalhes,
      },
    }),
    prisma.paciente.update({
      where: { id: req.pacienteId! },
      data: {
        pontosTotal,
        streakAtual,
        streakMaximo,
        ultimoCheckin: hoje,
        diasInativo: 0,
        barraCongelada: false,
        ligaAtual: liga.liga,
        ligaNivel: liga.nivel,
      },
    }),
  ]);

  return res.status(201).json({ registro, pontosGanhos, pontosTotal, liga, streakAtual });
});

// GET /api/registros/hoje
router.get("/hoje", async (req: PacienteAuthRequest, res: Response) => {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const registro = await prisma.registro.findUnique({
    where: { pacienteId_data: { pacienteId: req.pacienteId!, data: hoje } },
  });
  return res.json({ registro, feito: !!registro });
});

// GET /api/registros/resumo — estado de gamificação do paciente para a tela Início
router.get("/resumo", async (req: PacienteAuthRequest, res: Response) => {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const [paciente, registroHoje, conquistas] = await Promise.all([
    prisma.paciente.findUnique({
      where: { id: req.pacienteId! },
      select: {
        nome: true, pontosTotal: true, ligaAtual: true, ligaNivel: true,
        streakAtual: true, streakMaximo: true, ultimoCheckin: true, diasInativo: true, barraCongelada: true,
      },
    }),
    prisma.registro.findUnique({
      where: { pacienteId_data: { pacienteId: req.pacienteId!, data: hoje } },
    }),
    prisma.conquista.findMany({
      where: { pacienteId: req.pacienteId! },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
  ]);

  return res.json({ paciente, registroHoje, feitoHoje: !!registroHoje, conquistas });
});

// GET /api/registros/historico
router.get("/historico", async (req: PacienteAuthRequest, res: Response) => {
  const ha30dias = new Date();
  ha30dias.setDate(ha30dias.getDate() - 30);
  ha30dias.setHours(0, 0, 0, 0);

  const historico = await prisma.registro.findMany({
    where: { pacienteId: req.pacienteId!, data: { gte: ha30dias } },
    orderBy: { data: "desc" },
  });
  return res.json(historico);
});

// GET /api/registros/ranking — ranking dos pacientes do mesmo nutricionista por pontos
router.get("/ranking", async (req: PacienteAuthRequest, res: Response) => {
  const pacientes = await prisma.paciente.findMany({
    where: { nutricionistaId: req.nutricionistaId!, ativo: true },
    select: {
      id: true, nome: true, fotoPerfilUrl: true,
      pontosTotal: true, ligaAtual: true, ligaNivel: true, streakAtual: true,
    },
    orderBy: { pontosTotal: "desc" },
    take: 50,
  });
  const ranking = pacientes.map((p, i) => ({ pos: i + 1, ...p, isMe: p.id === req.pacienteId }));
  return res.json(ranking);
});

// GET /api/registros/evolucao — fotos, peso e humor ao longo do tempo
router.get("/evolucao", async (req: PacienteAuthRequest, res: Response) => {
  const [fotos, medicoes, humores] = await Promise.all([
    prisma.registro.findMany({
      where: { pacienteId: req.pacienteId!, fotoUrl: { not: null } },
      orderBy: { data: "asc" },
      select: { id: true, data: true, fotoUrl: true, humor: true },
    }),
    prisma.medicao.findMany({
      where: { pacienteId: req.pacienteId! },
      orderBy: { data: "asc" },
      select: { data: true, peso: true, cintura: true, quadril: true, braco: true, coxa: true },
    }),
    prisma.registro.findMany({
      where: { pacienteId: req.pacienteId!, humor: { not: null } },
      orderBy: { data: "desc" },
      take: 30,
      select: { data: true, humor: true },
    }),
  ]);
  return res.json({ fotos, medicoes, humores });
});

// GET /api/registros/desafios — desafios ativos do nutricionista + progresso do paciente
router.get("/desafios", async (req: PacienteAuthRequest, res: Response) => {
  const [desafios, progressos] = await Promise.all([
    prisma.desafio.findMany({
      where: { nutricionistaId: req.nutricionistaId!, status: "ativo" },
      orderBy: { createdAt: "desc" },
    }),
    prisma.desafioProgresso.findMany({ where: { pacienteId: req.pacienteId! } }),
  ]);
  const progMap = new Map(progressos.map((p) => [p.desafioId, p]));
  const result = desafios.map((d) => {
    const prog = progMap.get(d.id);
    return { ...d, progresso: prog?.progresso ?? 0, concluido: prog?.concluido ?? false };
  });
  return res.json(result);
});

// POST /api/registros/pedir-ajuste — paciente sinaliza que precisa de ajuste no plano.
// Anexa ao registro de hoje; se não houver, cria um registro marcado como ajuste (sem pontos).
router.post("/pedir-ajuste", async (req: PacienteAuthRequest, res: Response) => {
  const { motivo } = req.body as { motivo?: string };
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const existente = await prisma.registro.findUnique({
    where: { pacienteId_data: { pacienteId: req.pacienteId!, data: hoje } },
  });

  const registro = existente
    ? await prisma.registro.update({
        where: { id: existente.id },
        data: { pediuAjuste: true, motivoAjuste: motivo, ajusteLido: false },
      })
    : await prisma.registro.create({
        data: {
          pacienteId: req.pacienteId!,
          data: hoje,
          tipoRegistro: "ajuste_necessario",
          pontosGanhos: 0,
          pediuAjuste: true,
          motivoAjuste: motivo,
          ajusteLido: false,
        },
      });

  return res.status(201).json(registro);
});

// POST /api/registros/:id/ajuste — paciente pede ajuste no plano a partir de um registro
router.post("/:id/ajuste", async (req: PacienteAuthRequest, res: Response) => {
  const { motivo } = req.body as { motivo?: string };
  const registro = await prisma.registro.findFirst({
    where: { id: String(req.params.id), pacienteId: req.pacienteId! },
  });
  if (!registro) return res.status(404).json({ error: "Registro não encontrado" });

  const atualizado = await prisma.registro.update({
    where: { id: registro.id },
    data: { pediuAjuste: true, motivoAjuste: motivo, ajusteLido: false },
  });
  return res.json(atualizado);
});

export default router;
