import { Router, Response } from "express";
import prisma from "../lib/prisma";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import { calcularLiga, LIGAS } from "../config/ligas";

const router = Router();
router.use(authMiddleware);

const MESES_PT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

// Ordem e cor das 6 ligas — derivadas da fonte única (config/ligas.ts), NÃO redefinidas.
const LIGA_ORDEM = [...new Set(LIGAS.map((l) => l.liga))];
const LIGA_COR: Record<string, string> = Object.fromEntries(LIGAS.map((l) => [l.liga, l.cor]));

/**
 * GET /api/relatorios?periodo=semanal|mensal
 * Centro de Relatórios da nutricionista. SEMPRE escopado por nutricionistaId (multi-tenant).
 *
 * Regras de domínio:
 * - Liga é CUMULATIVA (Paciente.pontosTotal via calcularLiga, escala 0–11000). O período
 *   NÃO altera a distribuição por liga — muda apenas os KPIs de janela (adesão média).
 * - Sem dado falso: adesaoMedia = null quando não há check-ins no período (front mostra "Sem dados ainda").
 */
router.get("/", async (req: AuthRequest, res: Response) => {
  const id = req.nutricionistaId!;
  const periodo = req.query.periodo === "semanal" ? "semanal" : "mensal";

  const now = new Date();
  const hoje = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const ha30 = new Date(hoje.getTime() - 30 * 86_400_000);
  const inicioSemana = new Date(hoje.getTime() - 7 * 86_400_000);
  const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1);
  const fimMes = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const seisMesesAtras = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const inicioPeriodo = periodo === "semanal" ? inicioSemana : inicioMes;

  const [pacientes, checkins, consultasMes, registros6m, registrosRef, registrosPeriodo] = await Promise.all([
    prisma.paciente.findMany({
      where: { nutricionistaId: id, ativo: true },
      select: {
        id: true, nome: true, pontosTotal: true, ligaAtual: true, ultimoCheckin: true,
        streakAtual: true, streakMaximo: true, fotoPerfilUrl: true,
      },
    }),
    // Adesão do período — CheckIn.adesao (1–10), escopado por nutri via relação paciente.
    prisma.checkIn.findMany({
      where: { paciente: { nutricionistaId: id }, criadoEm: { gte: inicioPeriodo } },
      select: { adesao: true },
    }),
    prisma.consulta.count({
      where: { paciente: { nutricionistaId: id }, data: { gte: inicioMes, lt: fimMes } },
    }),
    prisma.registro.findMany({
      where: { paciente: { nutricionistaId: id }, data: { gte: seisMesesAtras } },
      select: { pacienteId: true, data: true },
    }),
    // Refeições no período — para "maior dificuldade" (só linhas com detalhe registrado).
    prisma.registro.findMany({
      where: {
        paciente: { nutricionistaId: id },
        data: { gte: inicioPeriodo },
        OR: [
          { cafeOk: { not: null } }, { almocoOk: { not: null } },
          { lancheOk: { not: null } }, { jantarOk: { not: null } },
        ],
      },
      select: {
        cafeOk: true, almocoOk: true, lancheOk: true, jantarOk: true,
        cafeStatus: true, almocoStatus: true, lancheStatus: true, jantarStatus: true,
      },
    }),
    // Registros do período com os 4 hábitos + data — p/ "hábitos mais difíceis" e "dias críticos".
    prisma.registro.findMany({
      where: { paciente: { nutricionistaId: id }, data: { gte: inicioPeriodo } },
      select: { data: true, alimentacaoOk: true, treinoOk: true, aguaOk: true, sonoOk: true },
    }),
  ]);

  const total = pacientes.length;

  // ── KPI: Adesão média (média de CheckIn.adesao no período) ──────────────
  const amostra = checkins.length;
  const adesaoMedia = amostra
    ? Math.round((checkins.reduce((s, c) => s + c.adesao, 0) / amostra) * 10) / 10
    : null;

  // ── KPI: Retenção 30d — % dos ativos com check-in nos últimos 30 dias ───
  const ativos30 = pacientes.filter((p) => p.ultimoCheckin && new Date(p.ultimoCheckin) >= ha30).length;
  const retencao30 = total ? Math.round((ativos30 / total) * 100) : 0;

  // ── Distribuição por liga (cumulativa) ──────────────────────────────────
  const distMap: Record<string, number> = {};
  for (const p of pacientes) {
    const liga = p.ligaAtual || calcularLiga(p.pontosTotal).liga;
    distMap[liga] = (distMap[liga] || 0) + 1;
  }
  const distribuicaoLigas = LIGA_ORDEM.map((liga) => ({
    liga,
    count: distMap[liga] || 0,
    cor: LIGA_COR[liga],
  }));

  // ── Engajamento ao longo do tempo (últimos 6 meses) ─────────────────────
  // % de pacientes com ao menos 1 registro no mês.
  const engajamentoMensal: { label: string; pct: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const fim = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    const pacs = new Set<string>();
    for (const r of registros6m) {
      const rd = new Date(r.data);
      if (rd >= d && rd < fim) pacs.add(r.pacienteId);
    }
    engajamentoMensal.push({ label: MESES_PT[d.getMonth()], pct: total ? Math.round((pacs.size / total) * 100) : 0 });
  }

  // ── Maior dificuldade por refeição (café/almoço/lanche/jantar) ──────────
  // % de vezes que cada refeição foi cumprida, entre os dias com detalhe registrado.
  const REFS = [
    { key: "cafeOk", refeicao: "cafe", label: "Café da manhã" },
    { key: "almocoOk", refeicao: "almoco", label: "Almoço" },
    { key: "lancheOk", refeicao: "lanche", label: "Lanche da tarde" },
    { key: "jantarOk", refeicao: "jantar", label: "Jantar" },
  ] as const;
  const dificuldadeRefeicoes = REFS.map((r) => {
    const comDado = registrosRef.filter((x) => x[r.key] !== null);
    const cumpridas = comDado.filter((x) => x[r.key]).length;
    const totalDias = comDado.length;
    return {
      refeicao: r.refeicao,
      label: r.label,
      cumpridas,
      total: totalDias,
      pct: totalDias ? Math.round((cumpridas / totalDias) * 100) : null,
    };
  });
  // ── Comportamento por refeição (Seguiu / Adaptou / Pulou) ───────────────
  // Distribuição dos 3 estados em cada refeição — mostra COMO o paciente lida com
  // cada momento, não só o % cumprido.
  const REFS_STATUS = [
    { statusKey: "cafeStatus", refeicao: "cafe", label: "Café da manhã" },
    { statusKey: "almocoStatus", refeicao: "almoco", label: "Almoço" },
    { statusKey: "lancheStatus", refeicao: "lanche", label: "Lanche da tarde" },
    { statusKey: "jantarStatus", refeicao: "jantar", label: "Jantar" },
  ] as const;
  const refeicoesBreakdown = REFS_STATUS.map((r) => {
    const c = { seguiu: 0, adaptou: 0, comeu_mal: 0, pulou: 0 };
    for (const x of registrosRef) {
      const s = x[r.statusKey];
      if (s === "seguiu" || s === "adaptou" || s === "comeu_mal" || s === "pulou") c[s]++;
    }
    const amostra = c.seguiu + c.adaptou + c.comeu_mal + c.pulou;
    const pct = (n: number) => (amostra ? Math.round((n / amostra) * 100) : null);
    return {
      refeicao: r.refeicao,
      label: r.label,
      seguiu: pct(c.seguiu),
      adaptou: pct(c.adaptou),
      comeu_mal: pct(c.comeu_mal),
      pulou: pct(c.pulou),
      amostra,
    };
  });

  const comAmostra = dificuldadeRefeicoes.filter((d) => d.total > 0);
  const piorRefeicao = comAmostra.length
    ? comAmostra.reduce((a, b) => ((a.pct as number) <= (b.pct as number) ? a : b))
    : null;

  // ── Pacientes em risco + risco de saída ────────────────────────────────
  // Risco de sair (duro) = inativo ≥4 dias ou nunca fez check-in.
  // A lista inclui também "sequência quebrada" recente como atenção (mais leve).
  const diasSemCheckin = (ultimo: Date | null): number | null =>
    ultimo ? Math.floor((hoje.getTime() - new Date(ultimo).getTime()) / 86_400_000) : null;

  const pacientesRisco = pacientes
    .map((p) => {
      const dias = diasSemCheckin(p.ultimoCheckin);
      const seqQuebrada = p.streakAtual === 0 && p.streakMaximo > 0;
      let tone: "risco" | "atencao" | null = null;
      let motivo = "";
      let sev = 0;
      if (dias === null) {
        tone = "risco"; motivo = "Nunca fez check-in"; sev = 10_000;
      } else if (dias >= 4) {
        tone = "risco"; motivo = `Há ${dias} dias sem check-in`; sev = dias;
      } else if (seqQuebrada) {
        tone = "atencao"; motivo = "Sequência quebrada"; sev = 1;
      }
      return { id: p.id, nome: p.nome, avatarUrl: p.fotoPerfilUrl ?? null, dias, motivo, tone, sev };
    })
    .filter((x): x is typeof x & { tone: "risco" | "atencao" } => x.tone !== null)
    .sort((a, b) => b.sev - a.sev);

  const emRiscoDuro = pacientes.filter((p) => {
    const dias = diasSemCheckin(p.ultimoCheckin);
    return dias === null || dias >= 4;
  }).length;

  // ── Hábitos mais difíceis (adesão % por hábito no período) ──────────────
  const HAB = [
    { key: "alimentacaoOk", id: "alimentacao", label: "Alimentação" },
    { key: "treinoOk", id: "treino", label: "Treino" },
    { key: "aguaOk", id: "agua", label: "Água" },
    { key: "sonoOk", id: "sono", label: "Sono" },
  ] as const;
  const nReg = registrosPeriodo.length;
  const habitos = HAB.map((h) => ({
    id: h.id,
    label: h.label,
    pct: nReg ? Math.round((registrosPeriodo.filter((r) => r[h.key]).length / nReg) * 100) : null,
    amostra: nReg,
  }));

  // ── Dias críticos (adesão média dos 4 hábitos por dia da semana) ────────
  const NOMES_DOW = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const buckets: number[][] = Array.from({ length: 7 }, () => []);
  for (const r of registrosPeriodo) {
    const dow = new Date(r.data).getDay();
    const ad = (Number(r.alimentacaoOk) + Number(r.treinoOk) + Number(r.aguaOk) + Number(r.sonoOk)) / 4;
    buckets[dow]!.push(ad);
  }
  const diasSemana = buckets.map((vals, dow) => ({
    dow,
    label: NOMES_DOW[dow],
    pct: vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) : null,
    amostra: vals.length,
  }));

  res.json({
    periodo,
    dificuldadeRefeicoes,   // [{ refeicao, label, cumpridas, total, pct|null }]
    refeicoesBreakdown,     // [{ refeicao, label, seguiu, adaptou, pulou, amostra }]
    piorRefeicao,           // { refeicao, label, pct } | null — "maior dificuldade"
    pacientesRisco: pacientesRisco.slice(0, 8), // [{ id, nome, avatarUrl, dias, motivo, tone }]
    riscoResumo: { emRisco: emRiscoDuro, total }, // "risco de saída"
    habitos,                // [{ id, label, pct|null, amostra }]
    diasSemana,             // [{ dow, label, pct|null, amostra }] — 7
    kpis: {
      adesaoMedia,       // number (1 casa) | null
      adesaoAmostra: amostra,
      retencao30,        // %
      pacientesAtivos: total,
      consultasMes,
    },
    distribuicaoLigas,   // [{ liga, count, cor }] — cumulativo (mantido p/ compat; não usado nos Insights)
    engajamentoMensal,   // [{ label, pct }] — 6 meses (idem)
  });
});

export default router;
