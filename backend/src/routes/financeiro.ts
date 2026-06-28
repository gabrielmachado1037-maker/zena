import { Router, Request, Response } from "express";
import prisma from "../lib/prisma";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import { planoMiddleware } from "../middleware/plano";
import { criarOuBuscarCliente, criarCobrancaPix, cancelarCobranca } from "../lib/asaas";
import { encrypt, decrypt } from "../lib/crypto";

const router = Router();

// Webhook sem JWT — autenticado pelo token Asaas no header
router.post("/asaas-webhook", async (req: Request, res: Response) => {
  const token = req.headers["asaas-access-token"];
  const expected = process.env.ASAAS_WEBHOOK_TOKEN;
  if (!expected || token !== expected) {
    return res.status(401).json({ error: "Token inválido" });
  }
  const { event, payment } = req.body;
  if (event === "PAYMENT_RECEIVED" || event === "PAYMENT_CONFIRMED") {
    await prisma.cobranca.updateMany({
      where: { asaasChargeId: payment.id },
      data: { status: "pago", pagoEm: new Date() },
    });
  }
  res.json({ ok: true });
});

router.use(authMiddleware);
router.use(planoMiddleware);

// Dashboard financeiro
router.get("/dashboard", async (req: AuthRequest, res: Response) => {
  const nutricionistaId = req.nutricionistaId!;
  const agora = new Date();
  const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);
  const fimMes = new Date(agora.getFullYear(), agora.getMonth() + 1, 0, 23, 59, 59);
  const inicioMesPassado = new Date(agora.getFullYear(), agora.getMonth() - 1, 1);
  const fimMesPassado = new Date(agora.getFullYear(), agora.getMonth(), 0, 23, 59, 59);

  const pacientes = await prisma.paciente.findMany({
    where: { nutricionistaId },
    select: { id: true, nome: true, telefone: true, linkUnico: true,
      cobrancas: { select: { valor: true, vencimento: true, status: true, pagoEm: true, id: true } },
      planoCobranca: true,
    },
  });

  const todasCobrancas = pacientes.flatMap(p => p.cobrancas.map(c => ({ ...c, paciente: { nome: p.nome, telefone: p.telefone, linkUnico: p.linkUnico, id: p.id } })));

  const receitaMes = todasCobrancas
    .filter(c => c.status === 'pago' && c.pagoEm && c.pagoEm >= inicioMes && c.pagoEm <= fimMes)
    .reduce((s, c) => s + c.valor, 0);

  const receitaMesPassado = todasCobrancas
    .filter(c => c.status === 'pago' && c.pagoEm && c.pagoEm >= inicioMesPassado && c.pagoEm <= fimMesPassado)
    .reduce((s, c) => s + c.valor, 0);

  const aReceber = todasCobrancas
    .filter(c => c.status === 'pendente' && c.vencimento >= inicioMes && c.vencimento <= fimMes)
    .reduce((s, c) => s + c.valor, 0);

  const inadimplentes = todasCobrancas.filter(c => c.status === 'pendente' && c.vencimento < agora);
  const totalInadimplente = inadimplentes.reduce((s, c) => s + c.valor, 0);

  const projecaoMes = receitaMes + aReceber;

  const proximosVencimentos = todasCobrancas
    .filter(c => c.status === 'pendente' && c.vencimento >= agora && c.vencimento <= fimMes)
    .sort((a, b) => new Date(a.vencimento).getTime() - new Date(b.vencimento).getTime())
    .slice(0, 10);

  res.json({
    receitaMes,
    receitaMesPassado,
    aReceber,
    totalInadimplente,
    projecaoMes,
    inadimplentes: inadimplentes.slice(0, 20),
    proximosVencimentos,
    totalPacientesComPlano: pacientes.filter(p => p.planoCobranca?.ativo).length,
  });
});

// Plano de cobrança por paciente
router.get("/plano/:pacienteId", async (req: AuthRequest, res: Response) => {
  const plano = await prisma.planoCobranca.findFirst({
    where: { pacienteId: req.params["pacienteId"] as string },
  });
  res.json(plano || null);
});

router.put("/plano/:pacienteId", async (req: AuthRequest, res: Response) => {
  const pacienteId = req.params["pacienteId"] as string;
  const paciente = await prisma.paciente.findFirst({ where: { id: pacienteId, nutricionistaId: req.nutricionistaId! } });
  if (!paciente) return res.status(404).json({ error: "Paciente não encontrada" });

  const { valor, periodicidade, diaVencimento, ativo } = req.body;
  const plano = await prisma.planoCobranca.upsert({
    where: { pacienteId },
    update: { valor: parseFloat(valor), periodicidade, diaVencimento: parseInt(diaVencimento), ativo },
    create: { pacienteId, valor: parseFloat(valor), periodicidade, diaVencimento: parseInt(diaVencimento) },
  });
  res.json(plano);
});

// Gerar cobrança Pix via Asaas
router.post("/cobrar/:cobrancaId/pix", async (req: AuthRequest, res: Response) => {
  const nutri = await prisma.nutricionista.findUnique({ where: { id: req.nutricionistaId! } });
  if (!nutri?.asaasApiKey) return res.status(400).json({ error: "Configure sua chave Asaas em Financeiro → Conectar conta Asaas." });
  const apiKey = decrypt(nutri.asaasApiKey);

  const cobranca = await prisma.cobranca.findFirst({
    where: { id: req.params["cobrancaId"] as string, paciente: { nutricionistaId: req.nutricionistaId! } },
    include: { paciente: { select: { nome: true, email: true } } },
  });
  if (!cobranca) return res.status(404).json({ error: "Cobrança não encontrada" });

  const cliente = await criarOuBuscarCliente(apiKey, cobranca.paciente.nome, cobranca.paciente.email || undefined);
  const vencimento = cobranca.vencimento.toISOString().split("T")[0];
  const descricao = cobranca.descricao || `Consulta — ${cobranca.paciente.nome}`;

  const { charge, pix } = await criarCobrancaPix(apiKey, cliente.id, cobranca.valor, vencimento, descricao);

  const updated = await prisma.cobranca.update({
    where: { id: cobranca.id },
    data: {
      asaasChargeId: charge.id,
      pixCopiaECola: pix.payload,
      linkPagamento: charge.invoiceUrl,
    },
  });
  res.json(updated);
});

// Cancelar cobrança Pix
router.delete("/cobrar/:cobrancaId/pix", async (req: AuthRequest, res: Response) => {
  const nutri = await prisma.nutricionista.findUnique({ where: { id: req.nutricionistaId! } });
  if (!nutri?.asaasApiKey) return res.status(400).json({ error: "Chave Asaas não configurada." });

  const cobranca = await prisma.cobranca.findFirst({
    where: { id: req.params["cobrancaId"] as string, paciente: { nutricionistaId: req.nutricionistaId! } },
  });
  if (!cobranca?.asaasChargeId) return res.status(400).json({ error: "Cobrança sem Pix gerado." });

  await cancelarCobranca(decrypt(nutri.asaasApiKey), cobranca.asaasChargeId);
  const updated = await prisma.cobranca.update({
    where: { id: cobranca.id },
    data: { asaasChargeId: null, pixCopiaECola: null, linkPagamento: null },
  });
  res.json(updated);
});

// Salvar chave Asaas do nutricionista (criptografada)
router.put("/asaas-key", async (req: AuthRequest, res: Response) => {
  const { asaasApiKey } = req.body;
  await prisma.nutricionista.update({
    where: { id: req.nutricionistaId! },
    data: { asaasApiKey: asaasApiKey ? encrypt(asaasApiKey) : null },
  });
  res.json({ ok: true });
});

// Verificar se chave está configurada (sem expor a chave)
router.get("/asaas-status", async (req: AuthRequest, res: Response) => {
  const nutri = await prisma.nutricionista.findUnique({ where: { id: req.nutricionistaId! } });
  res.json({ configurado: !!nutri?.asaasApiKey });
});

export default router;
