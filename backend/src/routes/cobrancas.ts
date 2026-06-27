import { Router, Response } from "express";
import prisma from "../lib/prisma";
import { authMiddleware, AuthRequest } from "../middleware/auth";

const router = Router();
router.use(authMiddleware);

router.get("/resumo", async (req: AuthRequest, res: Response) => {
  const now = new Date();
  const mes = now.getMonth();
  const ano = now.getFullYear();
  const inicio = new Date(ano, mes, 1);
  const fim = new Date(ano, mes + 1, 0, 23, 59, 59);

  const pacientes = await prisma.paciente.findMany({
    where: { nutricionistaId: req.nutricionistaId as string },
    select: { id: true },
  });
  const ids = pacientes.map((p) => p.id);

  const cobrancas = await prisma.cobranca.findMany({
    where: { pacienteId: { in: ids }, vencimento: { gte: inicio, lte: fim } },
  });

  const totalFaturado = cobrancas.reduce((s, c) => s + c.valor, 0);
  const totalRecebido = cobrancas.filter((c) => c.status === "pago").reduce((s, c) => s + c.valor, 0);
  const totalPendente = cobrancas.filter((c) => c.status !== "pago").reduce((s, c) => s + c.valor, 0);
  const vencidas = cobrancas.filter((c) => c.status === "pendente" && new Date(c.vencimento) < now).length;

  res.json({ totalFaturado, totalRecebido, totalPendente, vencidas });
});

router.get("/", async (req: AuthRequest, res: Response) => {
  const { mes, ano } = req.query;
  const pacientes = await prisma.paciente.findMany({
    where: { nutricionistaId: req.nutricionistaId as string },
    select: { id: true },
  });
  const ids = pacientes.map((p) => p.id);

  const where: any = { pacienteId: { in: ids } };
  if (mes && ano) {
    const inicio = new Date(Number(ano), Number(mes) - 1, 1);
    const fim = new Date(Number(ano), Number(mes), 0, 23, 59, 59);
    where.vencimento = { gte: inicio, lte: fim };
  }

  const cobrancas = await prisma.cobranca.findMany({
    where,
    include: { paciente: { select: { nome: true } } },
    orderBy: { vencimento: "desc" },
  });
  res.json(cobrancas);
});

router.post("/", async (req: AuthRequest, res: Response) => {
  const { pacienteId, valor, vencimento, metodo, descricao } = req.body;
  const cobranca = await prisma.cobranca.create({
    data: {
      pacienteId,
      valor: parseFloat(valor),
      vencimento: new Date(vencimento),
      metodo,
      descricao: descricao || null,
    },
  });
  res.json(cobranca);
});

router.patch("/:id/pagar", async (req: AuthRequest, res: Response) => {
  const cobranca = await prisma.cobranca.update({
    where: { id: req.params["id"] as string },
    data: { status: "pago", pagoEm: new Date() },
  });
  res.json(cobranca);
});

export default router;
