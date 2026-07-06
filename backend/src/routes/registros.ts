import { Router, Response } from "express";
import prisma from "../lib/prisma";
import { authPacienteMiddleware, PacienteAuthRequest } from "../middleware/auth";
import { calcularPontosRegistro, calcularLiga } from "../config/ligas";
import { uploadFoto } from "../lib/supabase";

const HUMORES_VALIDOS = ["otimo", "bom", "neutro", "dificil", "pessimo"];

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

  const existente = await prisma.registro.findUnique({
    where: { pacienteId_data: { pacienteId: req.pacienteId!, data: hoje } },
  });
  // Um "stub" (só humor, sem check-in) NÃO conta como registro do dia — o check-in o promove.
  const jaFezCheckin = existente && (
    existente.pontosGanhos > 0 ||
    existente.alimentacaoOk || existente.treinoOk || existente.aguaOk || existente.sonoOk
  );
  if (jaFezCheckin) return res.status(409).json({ error: "Registro já enviado hoje" });

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
    prisma.registro.upsert({
      where: { pacienteId_data: { pacienteId: req.pacienteId!, data: hoje } },
      create: {
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
      // Promove o stub de humor a check-in completo (preserva humor já lançado).
      update: {
        alimentacaoOk: !!alimentacaoOk,
        treinoOk: !!treinoOk,
        aguaOk: !!aguaOk,
        sonoOk: !!sonoOk,
        tipoRegistro: tipoRegistro ?? "normal",
        fotoUrl,
        descricao,
        humor: humor ?? undefined,
        tags: tags ?? undefined,
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
  const [fotosCheckin, fotosEvolucao, medicoes, humores] = await Promise.all([
    prisma.registro.findMany({
      where: { pacienteId: req.pacienteId!, fotoUrl: { not: null } },
      orderBy: { data: "asc" },
      select: { id: true, data: true, fotoUrl: true },
    }),
    prisma.fotoEvolucao.findMany({
      where: { pacienteId: req.pacienteId! },
      orderBy: { data: "asc" },
      select: { id: true, data: true, imagem: true },
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
  // Junta fotos de evolução (enviadas pelo paciente) com fotos de check-in.
  const fotos = [
    ...fotosCheckin.map((f) => ({ id: f.id, data: f.data, fotoUrl: f.fotoUrl })),
    ...fotosEvolucao.map((f) => ({ id: f.id, data: f.data, fotoUrl: f.imagem })),
  ].sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());
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

// POST /api/registros/medicao — paciente registra o próprio peso (e opcionalmente medidas)
router.post("/medicao", async (req: PacienteAuthRequest, res: Response) => {
  const { peso, cintura, quadril, braco, coxa } = req.body as {
    peso: number; cintura?: number; quadril?: number; braco?: number; coxa?: number;
  };
  if (typeof peso !== "number" || !isFinite(peso) || peso <= 0 || peso > 500) {
    return res.status(400).json({ error: "Peso inválido" });
  }
  const num = (v: unknown) => (typeof v === "number" && isFinite(v) && v > 0 ? v : null);
  const medicao = await prisma.medicao.create({
    data: {
      pacienteId: req.pacienteId!,
      data: new Date(),
      peso,
      cintura: num(cintura),
      quadril: num(quadril),
      braco: num(braco),
      coxa: num(coxa),
    },
  });
  return res.status(201).json(medicao);
});

// POST /api/registros/foto-evolucao — paciente envia uma foto de evolução
router.post("/foto-evolucao", async (req: PacienteAuthRequest, res: Response) => {
  const { fotoBase64, tipo } = req.body as { fotoBase64: string; tipo?: string };
  if (!fotoBase64?.startsWith("data:image/")) {
    return res.status(400).json({ error: "Imagem inválida" });
  }
  let imagem: string;
  try {
    imagem = await uploadFoto(`evolucao/${req.pacienteId!}/${Date.now()}.jpg`, fotoBase64);
  } catch {
    return res.status(502).json({ error: "Falha ao enviar a imagem. Tente novamente." });
  }
  const foto = await prisma.fotoEvolucao.create({
    data: { pacienteId: req.pacienteId!, data: new Date(), tipo: tipo || "frente", imagem },
  });
  return res.status(201).json(foto);
});

// PUT /api/registros/humor — paciente registra o humor do dia (upsert no registro de hoje)
router.put("/humor", async (req: PacienteAuthRequest, res: Response) => {
  const { humor, observacoes } = req.body as { humor: string; observacoes?: string };
  if (!HUMORES_VALIDOS.includes(humor)) {
    return res.status(400).json({ error: "Humor inválido" });
  }
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const registro = await prisma.registro.upsert({
    where: { pacienteId_data: { pacienteId: req.pacienteId!, data: hoje } },
    // Stub: só humor, sem pontos nem check-in (o check-in do dia promove este registro).
    create: {
      pacienteId: req.pacienteId!,
      data: hoje,
      humor,
      descricao: observacoes ?? null,
      tipoRegistro: "normal",
      pontosGanhos: 0,
    },
    update: { humor, descricao: observacoes ?? undefined },
  });
  return res.json({ humor: registro.humor });
});

export default router;
