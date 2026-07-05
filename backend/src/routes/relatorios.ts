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

  const [pacientes, checkins, consultasMes, registros6m] = await Promise.all([
    prisma.paciente.findMany({
      where: { nutricionistaId: id, ativo: true },
      select: { id: true, pontosTotal: true, ligaAtual: true, ultimoCheckin: true },
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

  res.json({
    periodo,
    kpis: {
      adesaoMedia,       // number (1 casa) | null
      adesaoAmostra: amostra,
      retencao30,        // %
      pacientesAtivos: total,
      consultasMes,
    },
    distribuicaoLigas,   // [{ liga, count, cor }] — cumulativo
    engajamentoMensal,   // [{ label, pct }] — 6 meses
  });
});

export default router;
