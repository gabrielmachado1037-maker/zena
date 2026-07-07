import { Router, Response } from "express";
import prisma from "../lib/prisma";
import { authPacienteMiddleware, PacienteAuthRequest } from "../middleware/auth";
import {
  calcularPontosRegistro,
  calcularLiga,
  calcularXpAlimentacao,
  calcularXpTreino,
  calcularXpSono,
  REFEICOES_KEYS,
  AGUA_META_ML_PADRAO,
} from "../config/ligas";
import { uploadFoto } from "../lib/supabase";

const HUMORES_VALIDOS = ["otimo", "bom", "neutro", "dificil", "pessimo"];
const STATUS_VALIDOS = ["seguiu", "adaptou", "comeu_mal", "pulou"];
const TREINO_VALIDOS = ["conforme", "parcial", "nao"];
const SONO_VALIDOS = ["menos5", "5a7", "7a9", "mais9"];

const router = Router();
router.use(authPacienteMiddleware);

function inicioDeHoje() {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  return hoje;
}

function normStatus(v: unknown): string | null {
  return typeof v === "string" && STATUS_VALIDOS.includes(v) ? v : null;
}
function normTreino(v: unknown): string | null {
  return typeof v === "string" && TREINO_VALIDOS.includes(v) ? v : null;
}
function normFaixa(v: unknown): string | null {
  return typeof v === "string" && SONO_VALIDOS.includes(v) ? v : null;
}

/** Sequência + total + liga a creditar ao FECHAR o dia. */
function calcularFechamentoPaciente(
  paciente: { ultimoCheckin: Date | null; streakAtual: number; streakMaximo: number; pontosTotal: number },
  pontosGanhos: number,
  hoje: Date,
) {
  const ontem = new Date(hoje);
  ontem.setDate(ontem.getDate() - 1);
  const registrouOntem = paciente.ultimoCheckin
    ? new Date(paciente.ultimoCheckin).getTime() === ontem.getTime()
    : false;
  const streakAtual = registrouOntem ? paciente.streakAtual + 1 : 1;
  const streakMaximo = Math.max(paciente.streakMaximo, streakAtual);
  const pontosTotal = paciente.pontosTotal + pontosGanhos;
  const liga = calcularLiga(pontosTotal);
  return { streakAtual, streakMaximo, pontosTotal, liga };
}

// PUT /api/registros/dia — AUTOSAVE do dia (refeições, água, treino, sono).
// Persiste o estado imediatamente, mas NÃO credita liga/streak (isso é o "fechar o dia").
// Idempotente: recebe o snapshot atual do dia e faz upsert. 409 se o dia já foi fechado.
router.put("/dia", async (req: PacienteAuthRequest, res: Response) => {
  const {
    cafeStatus, almocoStatus, lancheStatus, jantarStatus,
    refeicoesNotas, aguaMl, aguaMetaMl, treinoStatus, treinoMotivo, sonoFaixa,
  } = req.body as {
    cafeStatus?: unknown; almocoStatus?: unknown; lancheStatus?: unknown; jantarStatus?: unknown;
    refeicoesNotas?: unknown; aguaMl?: unknown; aguaMetaMl?: unknown;
    treinoStatus?: unknown; treinoMotivo?: unknown; sonoFaixa?: unknown;
  };

  const hoje = inicioDeHoje();
  const existente = await prisma.registro.findUnique({
    where: { pacienteId_data: { pacienteId: req.pacienteId!, data: hoje } },
  });
  if (existente?.finalizado) return res.status(409).json({ error: "Dia já fechado" });

  const status = {
    cafe: normStatus(cafeStatus),
    almoco: normStatus(almocoStatus),
    lanche: normStatus(lancheStatus),
    jantar: normStatus(jantarStatus),
  };
  const metaMl = typeof aguaMetaMl === "number" && aguaMetaMl > 0 ? Math.round(aguaMetaMl) : AGUA_META_ML_PADRAO;
  const ml = typeof aguaMl === "number" && aguaMl >= 0 ? Math.round(aguaMl) : 0;
  const aguaOk = ml >= metaMl;
  const xpAlim = calcularXpAlimentacao(status);
  const tStatus = normTreino(treinoStatus);
  const sFaixa = normFaixa(sonoFaixa);

  const dados = {
    // booleanos derivados (mantêm as agregações legadas da nutri funcionando)
    alimentacaoOk: xpAlim >= 3,
    treinoOk: calcularXpTreino(tStatus) > 0,
    aguaOk,
    sonoOk: calcularXpSono(sFaixa) > 0,
    cafeOk: status.cafe ? status.cafe === "seguiu" : null,
    almocoOk: status.almoco ? status.almoco === "seguiu" : null,
    lancheOk: status.lanche ? status.lanche === "seguiu" : null,
    jantarOk: status.jantar ? status.jantar === "seguiu" : null,
    // estado por refeição (3 estados) + notas
    cafeStatus: status.cafe,
    almocoStatus: status.almoco,
    lancheStatus: status.lanche,
    jantarStatus: status.jantar,
    refeicoesNotas: (refeicoesNotas ?? undefined) as any,
    // água como progresso
    aguaMl: ml,
    aguaMetaMl: metaMl,
    // treino (3 estados + motivo) e sono (faixa de horas)
    treinoStatus: tStatus,
    treinoMotivo: tStatus === "nao" && typeof treinoMotivo === "string" ? treinoMotivo : null,
    sonoFaixa: sFaixa,
  };

  const registro = await prisma.registro.upsert({
    where: { pacienteId_data: { pacienteId: req.pacienteId!, data: hoje } },
    create: {
      pacienteId: req.pacienteId!,
      data: hoje,
      tipoRegistro: "normal",
      pontosGanhos: 0,
      finalizado: false,
      ...dados,
    },
    update: { ...dados },
  });
  return res.json({ registro });
});

// POST /api/registros/dia/fechar — FINALIZA o dia (o commit): credita XP dos hábitos +
// registro_diario + bônus, atualiza streak/liga. Lê o estado autossalvo como fonte da verdade.
router.post("/dia/fechar", async (req: PacienteAuthRequest, res: Response) => {
  const hoje = inicioDeHoje();
  const registro = await prisma.registro.findUnique({
    where: { pacienteId_data: { pacienteId: req.pacienteId!, data: hoje } },
  });
  if (!registro) return res.status(400).json({ error: "Nada pra fechar hoje" });
  if (registro.finalizado) return res.status(409).json({ error: "Dia já fechado" });

  const xpAlim = calcularXpAlimentacao({
    cafe: registro.cafeStatus, almoco: registro.almocoStatus,
    lanche: registro.lancheStatus, jantar: registro.jantarStatus,
  });
  const aguaOk =
    registro.aguaMl != null && registro.aguaMetaMl != null && registro.aguaMl >= registro.aguaMetaMl;

  const { total: pontosGanhos, detalhes: pontosDetalhes } = calcularPontosRegistro({
    xpAlimentacao: xpAlim,
    xpTreino: calcularXpTreino(registro.treinoStatus),
    aguaOk,
    xpSono: calcularXpSono(registro.sonoFaixa),
    incluirFechamento: true,
  });

  const paciente = await prisma.paciente.findUnique({ where: { id: req.pacienteId! } });
  if (!paciente) return res.status(404).json({ error: "Paciente não encontrado" });

  const { streakAtual, streakMaximo, pontosTotal, liga } = calcularFechamentoPaciente(
    paciente, pontosGanhos, hoje,
  );

  await prisma.$transaction([
    prisma.registro.update({
      where: { id: registro.id },
      data: {
        finalizado: true,
        alimentacaoOk: xpAlim >= 3,
        aguaOk,
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

  return res.status(201).json({ pontosGanhos, pontosTotal, liga, streakAtual });
});

// POST /api/registros — LEGADO (one-shot). Fecha o dia num único envio (retrocompat).
router.post("/", async (req: PacienteAuthRequest, res: Response) => {
  const {
    alimentacaoOk, treinoOk, aguaOk, sonoOk,
    cafeOk, almocoOk, lancheOk, jantarOk,
    tipoRegistro, fotoUrl, descricao, humor, tags,
  } = req.body as {
    alimentacaoOk?: boolean; treinoOk: boolean; aguaOk: boolean; sonoOk: boolean;
    cafeOk?: boolean; almocoOk?: boolean; lancheOk?: boolean; jantarOk?: boolean;
    tipoRegistro?: string; fotoUrl?: string; descricao?: string; humor?: string; tags?: string[];
  };

  const temRefeicoes = [cafeOk, almocoOk, lancheOk, jantarOk].some((v) => v !== undefined);
  // Cada refeição marcada = "seguiu"; alimentação também aceita o booleano legado (4 XP).
  const statusLegado = {
    cafe: cafeOk ? "seguiu" : temRefeicoes ? "pulou" : null,
    almoco: almocoOk ? "seguiu" : temRefeicoes ? "pulou" : null,
    lanche: lancheOk ? "seguiu" : temRefeicoes ? "pulou" : null,
    jantar: jantarOk ? "seguiu" : temRefeicoes ? "pulou" : null,
  };
  const xpAlim = temRefeicoes ? calcularXpAlimentacao(statusLegado) : alimentacaoOk ? 4 : 0;

  const hoje = inicioDeHoje();
  const existente = await prisma.registro.findUnique({
    where: { pacienteId_data: { pacienteId: req.pacienteId!, data: hoje } },
  });
  const jaFezCheckin =
    existente &&
    (existente.finalizado ||
      existente.pontosGanhos > 0 ||
      existente.alimentacaoOk || existente.treinoOk || existente.aguaOk || existente.sonoOk);
  if (jaFezCheckin) return res.status(409).json({ error: "Registro já enviado hoje" });

  const { total: pontosGanhos, detalhes: pontosDetalhes } = calcularPontosRegistro({
    xpAlimentacao: xpAlim, xpTreino: treinoOk ? 3 : 0, aguaOk: !!aguaOk, xpSono: sonoOk ? 2 : 0,
    incluirFechamento: true,
  });

  const paciente = await prisma.paciente.findUnique({ where: { id: req.pacienteId! } });
  if (!paciente) return res.status(404).json({ error: "Paciente não encontrado" });

  const { streakAtual, streakMaximo, pontosTotal, liga } = calcularFechamentoPaciente(
    paciente, pontosGanhos, hoje,
  );

  const [registro] = await prisma.$transaction([
    prisma.registro.upsert({
      where: { pacienteId_data: { pacienteId: req.pacienteId!, data: hoje } },
      create: {
        pacienteId: req.pacienteId!,
        data: hoje,
        alimentacaoOk: xpAlim >= 3,
        treinoOk: !!treinoOk,
        aguaOk: !!aguaOk,
        sonoOk: !!sonoOk,
        cafeOk: temRefeicoes ? !!cafeOk : null,
        almocoOk: temRefeicoes ? !!almocoOk : null,
        lancheOk: temRefeicoes ? !!lancheOk : null,
        jantarOk: temRefeicoes ? !!jantarOk : null,
        cafeStatus: statusLegado.cafe,
        almocoStatus: statusLegado.almoco,
        lancheStatus: statusLegado.lanche,
        jantarStatus: statusLegado.jantar,
        finalizado: true,
        tipoRegistro: tipoRegistro ?? "normal",
        fotoUrl,
        descricao,
        humor,
        tags: tags ?? [],
        pontosGanhos,
        pontosDetalhes,
      },
      update: {
        alimentacaoOk: xpAlim >= 3,
        treinoOk: !!treinoOk,
        aguaOk: !!aguaOk,
        sonoOk: !!sonoOk,
        cafeOk: temRefeicoes ? !!cafeOk : undefined,
        almocoOk: temRefeicoes ? !!almocoOk : undefined,
        lancheOk: temRefeicoes ? !!lancheOk : undefined,
        jantarOk: temRefeicoes ? !!jantarOk : undefined,
        cafeStatus: temRefeicoes ? statusLegado.cafe : undefined,
        almocoStatus: temRefeicoes ? statusLegado.almoco : undefined,
        lancheStatus: temRefeicoes ? statusLegado.lanche : undefined,
        jantarStatus: temRefeicoes ? statusLegado.jantar : undefined,
        finalizado: true,
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
        pontosTotal, streakAtual, streakMaximo, ultimoCheckin: hoje,
        diasInativo: 0, barraCongelada: false, ligaAtual: liga.liga, ligaNivel: liga.nivel,
      },
    }),
  ]);

  return res.status(201).json({ registro, pontosGanhos, pontosTotal, liga, streakAtual });
});

// GET /api/registros/hoje
router.get("/hoje", async (req: PacienteAuthRequest, res: Response) => {
  const hoje = inicioDeHoje();
  const registro = await prisma.registro.findUnique({
    where: { pacienteId_data: { pacienteId: req.pacienteId!, data: hoje } },
  });
  return res.json({ registro, feito: !!registro?.finalizado });
});

// GET /api/registros/resumo — estado de gamificação do paciente para a tela Início
router.get("/resumo", async (req: PacienteAuthRequest, res: Response) => {
  const hoje = inicioDeHoje();

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

  return res.json({
    paciente,
    registroHoje,
    feitoHoje: !!registroHoje?.finalizado,
    conquistas,
  });
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
router.post("/pedir-ajuste", async (req: PacienteAuthRequest, res: Response) => {
  const { motivo } = req.body as { motivo?: string };
  const hoje = inicioDeHoje();

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
  const hoje = inicioDeHoje();

  const registro = await prisma.registro.upsert({
    where: { pacienteId_data: { pacienteId: req.pacienteId!, data: hoje } },
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
