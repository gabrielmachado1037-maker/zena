import { Router, Response } from "express";
import prisma from "../lib/prisma";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import { enviarNotificacao } from "./notificacoes";

const router = Router();
router.use(authMiddleware);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getISOWeek(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const jan1 = new Date(d.getFullYear(), 0, 1);
  return Math.ceil(((d.getTime() - jan1.getTime()) / 86400000 + 1) / 7);
}

function getWeeksInMonth(mes: number, ano: number): number[] {
  const weeks = new Set<number>();
  const daysInMonth = new Date(ano, mes, 0).getDate();
  for (let day = 1; day <= daysInMonth; day++) {
    weeks.add(getISOWeek(new Date(ano, mes - 1, day)));
  }
  return Array.from(weeks);
}

async function calcularRanking(nutricionistaId: string, periodo: string, semana: number | null, mes: number | null, ano: number) {
  const config = await prisma.rankingConfig.findUnique({ where: { nutricionistaId } }) ?? {
    pesoPesoMeta: 40,
    pesoHabitosConsecutivos: 30,
    pesoMetasSemanais: 30,
    diasConsecutivosAlvo: 7,
    metasSemanaisAlvo: 4,
  };

  const pacientes = await prisma.paciente.findMany({
    where: { nutricionistaId, ativo: true },
    select: {
      id: true,
      nome: true,
      pesoMeta: true,
      medicoes: {
        orderBy: { data: "asc" },
        select: { peso: true, data: true },
      },
      checkIns: {
        orderBy: [{ ano: "desc" }, { semana: "desc" }],
        select: { semana: true, ano: true, adesao: true },
        take: 60,
      },
    },
  });

  const weeksInMonth = periodo === "mensal" && mes ? getWeeksInMonth(mes, ano) : [];
  const currentWeek  = semana ?? getISOWeek(new Date());

  const resultados = pacientes.map(p => {
    // 1. % Objetivo de peso
    let pctObjetivoPeso = 0;
    if (p.pesoMeta !== null && p.medicoes.length >= 2) {
      const pesoInicial = p.medicoes[0].peso;
      const pesoAtual   = p.medicoes[p.medicoes.length - 1].peso;
      const delta = pesoInicial - p.pesoMeta;
      if (delta !== 0) {
        pctObjetivoPeso = Math.min(Math.max(((pesoInicial - pesoAtual) / delta) * 100, 0), 100);
      }
    }

    // 2. Semanas consecutivas com check-in (× 7 = dias)
    let consecutiveWeeks = 0;
    let expWeek = currentWeek;
    let expYear = ano;
    for (const ci of p.checkIns) {
      if (ci.ano === expYear && ci.semana === expWeek) {
        consecutiveWeeks++;
        if (expWeek === 1) { expWeek = 52; expYear--; }
        else expWeek--;
      } else break;
    }
    const diasConsecutivosHabitos = consecutiveWeeks * 7;
    const scoreHabitos = Math.min(diasConsecutivosHabitos / Math.max(config.diasConsecutivosAlvo, 1), 1) * 100;

    // 3. Metas semanais batidas (check-ins com adesão ≥ 7)
    let metasSemanaisBatidas = 0;
    if (periodo === "semanal") {
      const ci = p.checkIns.find(c => c.semana === (semana ?? currentWeek) && c.ano === ano);
      metasSemanaisBatidas = ci && ci.adesao >= 7 ? 1 : 0;
    } else {
      metasSemanaisBatidas = p.checkIns.filter(c =>
        c.ano === ano && weeksInMonth.includes(c.semana) && c.adesao >= 7
      ).length;
    }
    const scoreMetas = Math.min(metasSemanaisBatidas / Math.max(config.metasSemanaisAlvo, 1), 1) * 100;

    const pontuacaoTotal = Math.round(
      (pctObjetivoPeso   * config.pesoPesoMeta             / 100) +
      (scoreHabitos      * config.pesoHabitosConsecutivos  / 100) +
      (scoreMetas        * config.pesoMetasSemanais        / 100)
    );

    return {
      pacienteId: p.id,
      nome: p.nome,
      pctObjetivoPeso:         Math.round(pctObjetivoPeso),
      diasConsecutivosHabitos,
      metasSemanaisBatidas,
      pontuacaoTotal,
    };
  });

  resultados.sort((a, b) => b.pontuacaoTotal - a.pontuacaoTotal);
  return resultados.map((r, i) => ({ ...r, posicaoRanking: i + 1 }));
}

// ─── Routes (specific before parameterized) ───────────────────────────────────

// POST /api/ranking/atualizar — recalcula e persiste no banco
router.post("/atualizar", async (req: AuthRequest, res: Response) => {
  const nutricionistaId = req.nutricionistaId!;
  const now    = new Date();
  const periodo = (req.body.periodo as string) || "semanal";
  const ano     = parseInt(req.body.ano)    || now.getFullYear();
  const semana  = periodo === "semanal"
    ? (parseInt(req.body.semana) || getISOWeek(now))
    : null;
  const mes = periodo === "mensal"
    ? (parseInt(req.body.mes) || now.getMonth() + 1)
    : null;

  // Captura posições anteriores para detectar subidas
  const anteriores = await prisma.rankingPontuacao.findMany({
    where: { nutricionistaId, periodo, semana, mes, ano },
    select: { pacienteId: true, posicaoRanking: true },
  });
  const posAntes = new Map(anteriores.map(r => [r.pacienteId, r.posicaoRanking ?? 999]));

  const ranking = await calcularRanking(nutricionistaId, periodo, semana, mes, ano);

  await Promise.all(ranking.map(async r => {
    const existing = await prisma.rankingPontuacao.findFirst({
      where: { pacienteId: r.pacienteId, periodo, semana, mes, ano },
    });
    const data = {
      pctObjetivoPeso:         r.pctObjetivoPeso,
      diasConsecutivosHabitos: r.diasConsecutivosHabitos,
      metasSemanaisBatidas:    r.metasSemanaisBatidas,
      pontuacaoTotal:          r.pontuacaoTotal,
      posicaoRanking:          r.posicaoRanking,
      calculadoEm:             new Date(),
    };
    if (existing) {
      await prisma.rankingPontuacao.update({ where: { id: existing.id }, data });
    } else {
      await prisma.rankingPontuacao.create({
        data: { ...data, pacienteId: r.pacienteId, nutricionistaId, periodo, semana, mes, ano },
      });
    }
  }));

  // Notifica se algum paciente subiu de posição
  const subidas = ranking.filter(r => {
    const antes = posAntes.get(r.pacienteId) ?? 999;
    return r.posicaoRanking !== null && r.posicaoRanking < antes;
  });
  if (subidas.length > 0) {
    // Busca nomes dos pacientes que subiram
    const pacientes = await prisma.paciente.findMany({
      where: { id: { in: subidas.map(r => r.pacienteId) } },
      select: { id: true, nome: true },
    });
    const nomeMap = new Map(pacientes.map(p => [p.id, p.nome]));
    const top = subidas.find(r => r.posicaoRanking === 1);
    const corpo = top
      ? `${nomeMap.get(top.pacienteId) ?? "Um paciente"} assumiu o 1° lugar! 🏆`
      : `${subidas.length} paciente${subidas.length > 1 ? "s subiram" : " subiu"} no ranking 📈`;
    enviarNotificacao(nutricionistaId, "Ranking atualizado", corpo, "/app/ranking").catch(console.error);
  }

  return res.json({ ok: true, total: ranking.length, ranking });
});

// GET /api/ranking/config
router.get("/config", async (req: AuthRequest, res: Response) => {
  const config = await prisma.rankingConfig.findUnique({ where: { nutricionistaId: req.nutricionistaId! } });
  return res.json(config ?? { pesoPesoMeta: 40, pesoHabitosConsecutivos: 30, pesoMetasSemanais: 30, diasConsecutivosAlvo: 7, metasSemanaisAlvo: 4 });
});

// PUT /api/ranking/config
router.put("/config", async (req: AuthRequest, res: Response) => {
  const { pesoPesoMeta, pesoHabitosConsecutivos, pesoMetasSemanais, diasConsecutivosAlvo, metasSemanaisAlvo } = req.body as {
    pesoPesoMeta: number; pesoHabitosConsecutivos: number; pesoMetasSemanais: number;
    diasConsecutivosAlvo: number; metasSemanaisAlvo: number;
  };
  const config = await prisma.rankingConfig.upsert({
    where:  { nutricionistaId: req.nutricionistaId! },
    update: { pesoPesoMeta, pesoHabitosConsecutivos, pesoMetasSemanais, diasConsecutivosAlvo, metasSemanaisAlvo },
    create: { nutricionistaId: req.nutricionistaId!, pesoPesoMeta, pesoHabitosConsecutivos, pesoMetasSemanais, diasConsecutivosAlvo, metasSemanaisAlvo },
  });
  return res.json(config);
});

// GET /api/ranking  or  GET /api/ranking/:nutricionistaId
// (parameterized last so /config and /atualizar take priority)
router.get(["/:nutricionistaId", "/"], async (req: AuthRequest, res: Response) => {
  const nutricionistaId = req.nutricionistaId!;
  const now    = new Date();
  const periodo = (req.query.periodo as string) || "semanal";
  const ano     = parseInt(req.query.ano as string) || now.getFullYear();
  const semana  = periodo === "semanal"
    ? (parseInt(req.query.semana as string) || getISOWeek(now))
    : null;
  const mes = periodo === "mensal"
    ? (parseInt(req.query.mes as string) || now.getMonth() + 1)
    : null;

  const [ranking, config] = await Promise.all([
    calcularRanking(nutricionistaId, periodo, semana, mes, ano),
    prisma.rankingConfig.findUnique({ where: { nutricionistaId } }),
  ]);

  return res.json({
    periodo, semana, mes, ano,
    config: config ?? { pesoPesoMeta: 40, pesoHabitosConsecutivos: 30, pesoMetasSemanais: 30, diasConsecutivosAlvo: 7, metasSemanaisAlvo: 4 },
    ranking,
  });
});

export default router;
