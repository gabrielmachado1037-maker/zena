import { Router, Response } from "express";
import prisma from "../lib/prisma";
import { authMiddleware, AuthRequest } from "../middleware/auth";

const router = Router();
router.use(authMiddleware);

router.get("/", async (req: AuthRequest, res: Response) => {
  const now = new Date();
  const mes = now.getMonth();
  const ano = now.getFullYear();
  const inicioMes = new Date(ano, mes, 1);
  const fimMes = new Date(ano, mes + 1, 0, 23, 59, 59);
  const inicioHoje = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const fimHoje = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  const ha30dias = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [pacientesAtivos, consultasHoje, cobrancasMes, semConsulta, totalConsultas] = await Promise.all([
    prisma.paciente.count({ where: { nutricionistaId: req.nutricionistaId, ativo: true } }),
    prisma.consulta.findMany({
      where: {
        data: { gte: inicioHoje, lte: fimHoje },
        paciente: { nutricionistaId: req.nutricionistaId },
      },
      include: { paciente: { select: { id: true, nome: true, telefone: true, linkUnico: true } } },
      orderBy: { data: "asc" },
    }),
    prisma.cobranca.findMany({
      where: {
        paciente: { nutricionistaId: req.nutricionistaId },
        vencimento: { gte: inicioMes, lte: fimMes },
      },
    }),
    prisma.paciente.findMany({
      where: {
        nutricionistaId: req.nutricionistaId,
        ativo: true,
        consultas: { none: { data: { gte: ha30dias } } },
      },
      select: { id: true, nome: true, telefone: true, linkUnico: true },
    }),
    prisma.consulta.count({ where: { paciente: { nutricionistaId: req.nutricionistaId } } }),
  ]);

  const faturamentoMes = cobrancasMes.reduce((s, c) => s + c.valor, 0);
  const recebidoMes = cobrancasMes.filter((c) => c.status === "pago").reduce((s, c) => s + c.valor, 0);
  const aReceber = cobrancasMes.filter((c) => c.status !== "pago").reduce((s, c) => s + c.valor, 0);
  const vencidas = cobrancasMes.filter((c) => c.status === "pendente" && new Date(c.vencimento) < now);

  res.json({
    pacientesAtivos,
    faturamentoMes,
    recebidoMes,
    aReceber,
    consultasHoje,
    cobrancasVencidas: vencidas.length,
    pacientesSemConsulta: semConsulta,
    totalConsultas,
  });
});

export default router;
