import { Router, Response } from "express";
import { z } from "zod";
import prisma from "../lib/prisma";
import { authPacienteMiddleware, PacienteAuthRequest } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { exigirAcessoParceria, ParceriaRequest } from "../middleware/parceriaAccess";
import { criarClienteNexvel, criarCobrancaSplitNexvel, cobrancaFoiPaga } from "../lib/asaas";
import {
  PRECO_CONSULTA, VALOR_PARCEIRO, REF_PREFIX,
  acessoAtivo, ativarConsulta, diasRestantes,
  rankingDoParceiro, rankingGlobal,
} from "../lib/parceria";

const router = Router();

// Toda a área do marketplace exige login de paciente. O gate de ACESSO (30 dias
// pago) é aplicado por-rota só nos recursos do parceiro — escolher/pagar/status
// precisam funcionar SEM acesso ativo.
router.use(authPacienteMiddleware);

const checkoutSchema = z.object({
  parceiroId: z.string().min(1, "Selecione um nutricionista."),
  cpf: z.string().optional().nullable(),
  nome: z.string().optional().nullable(),
});
const chatSchema = z.object({ conteudo: z.string().min(1).max(2000) });

function jitsiUrl(room: string): string {
  return `https://meet.jit.si/${room}`;
}

// ── GET /parceiros — os nutricionistas parceiros disponíveis (3 in-house) ──────
router.get("/parceiros", async (_req: PacienteAuthRequest, res: Response) => {
  const parceiros = await prisma.nutricionistaParceiro.findMany({
    where: { ativo: true },
    select: { id: true, nome: true, foto: true, especialidade: true, avaliacao: true, bio: true },
    orderBy: { createdAt: "asc" },
  });
  res.json(parceiros);
});

// ── GET /status — situação do acesso do paciente ──────────────────────────────
router.get("/status", async (req: PacienteAuthRequest, res: Response) => {
  const grant = await acessoAtivo(req.pacienteId!);
  if (grant) {
    return res.json({
      ativo: true,
      consulta: {
        id: grant.id,
        iniciaEm: grant.iniciaEm,
        expiraEm: grant.expiraEm,
        diasRestantes: diasRestantes(grant.expiraEm),
        videoRoom: grant.videoRoom,
      },
      parceiro: {
        id: grant.parceiro.id,
        nome: grant.parceiro.nome,
        foto: grant.parceiro.foto,
        especialidade: grant.parceiro.especialidade,
        avaliacao: grant.parceiro.avaliacao,
      },
    });
  }

  // Sem acesso ativo: devolve a última consulta (para a tela de "expirado" oferecer
  // renovar com o mesmo parceiro), se houver.
  const ultima = await prisma.consultaParceria.findFirst({
    where: { pacienteId: req.pacienteId!, status: { in: ["expirado", "cancelado"] } },
    include: { parceiro: { select: { id: true, nome: true, foto: true, especialidade: true } } },
    orderBy: { createdAt: "desc" },
  });
  res.json({
    ativo: false,
    ultima: ultima
      ? { parceiroId: ultima.parceiroId, parceiroNome: ultima.parceiro.nome, foto: ultima.parceiro.foto, especialidade: ultima.parceiro.especialidade, status: ultima.status, expiraEm: ultima.expiraEm }
      : null,
  });
});

// ── POST /checkout — inicia o pagamento (Pix R$200 com split) ─────────────────
router.post("/checkout", validateBody(checkoutSchema), async (req: PacienteAuthRequest, res: Response) => {
  if (!process.env.NEXVEL_ASAAS_API_KEY) {
    return res.status(503).json({ error: "Pagamento via Pix não configurado ainda." });
  }
  const { parceiroId, cpf: cpfRaw, nome } = req.body as { parceiroId: string; cpf?: string; nome?: string };

  const cpf = (cpfRaw ?? "").replace(/\D/g, "");
  if (cpf.length !== 11 && cpf.length !== 14) {
    return res.status(400).json({ error: "Informe um CPF (ou CNPJ) válido para gerar o Pix." });
  }

  const parceiro = await prisma.nutricionistaParceiro.findFirst({ where: { id: parceiroId, ativo: true } });
  if (!parceiro) return res.status(404).json({ error: "Nutricionista parceiro não encontrado." });

  // Regra: um acesso ativo por vez. Já tem acesso vigente → não deixa comprar outro.
  const jaAtivo = await acessoAtivo(req.pacienteId!);
  if (jaAtivo) {
    return res.status(409).json({
      error: "acesso_ja_ativo",
      code: "acesso_ja_ativo",
      message: "Você já tem um acesso ativo. Aguarde o vencimento para escolher outro nutricionista.",
    });
  }

  const paciente = await prisma.paciente.findUnique({
    where: { id: req.pacienteId! },
    select: { nome: true, email: true, pacienteUser: { select: { email: true } } },
  });
  if (!paciente) return res.status(404).json({ error: "Paciente não encontrado." });
  const email = paciente.pacienteUser?.email || paciente.email || `${req.pacienteId}@paciente.nexvel.tech`;
  const nomeCliente = (nome ?? "").trim() || paciente.nome;

  // Cria a consulta PENDENTE antes da cobrança — o id vira o externalReference (mkt:<id>).
  const consulta = await prisma.consultaParceria.create({
    data: { pacienteId: req.pacienteId!, parceiroId, valor: PRECO_CONSULTA },
  });

  try {
    const cliente = await criarClienteNexvel(nomeCliente, email, cpf);
    const hoje = new Date().toISOString().split("T")[0];
    const { charge, pix } = await criarCobrancaSplitNexvel(
      cliente.id, PRECO_CONSULTA, hoje,
      `Consulta Nexvel — ${parceiro.nome}`,
      `${REF_PREFIX}${consulta.id}`,
      parceiro.walletIdAsaas, VALOR_PARCEIRO,
    );
    if (!pix?.payload || !pix?.encodedImage) throw new Error("Asaas não retornou o QR do Pix.");

    await prisma.consultaParceria.update({
      where: { id: consulta.id },
      data: { asaasCustomerId: cliente.id, asaasChargeId: charge.id, pixCopiaECola: pix.payload },
    });

    res.json({
      consultaId: consulta.id,
      parceiroNome: parceiro.nome,
      valor: PRECO_CONSULTA,
      pixCopiaECola: pix.payload,
      pixQrCode: pix.encodedImage,
    });
  } catch (e) {
    // Falhou a cobrança: remove a consulta órfã para não poluir o histórico.
    await prisma.consultaParceria.delete({ where: { id: consulta.id } }).catch(() => {});
    console.error("[parceria/checkout] Asaas falhou:", (e as Error).message);
    const msg = (e as Error).message || "";
    return res.status(502).json({
      error: /cpf|cnpj|inv[aá]lid|obrigat/i.test(msg)
        ? "Não foi possível gerar o Pix: confira o CPF/CNPJ informado."
        : "Não foi possível gerar o Pix agora. Tente novamente em instantes.",
    });
  }
});

// ── GET /pagamento/:consultaId/status — poll do pagamento (+ ativação defensiva) ─
router.get("/pagamento/:consultaId/status", async (req: PacienteAuthRequest, res: Response) => {
  const consultaId = String(req.params.consultaId);
  const consulta = await prisma.consultaParceria.findFirst({
    where: { id: consultaId, pacienteId: req.pacienteId! }, // IDOR: escopo ao dono
  });
  if (!consulta) return res.status(404).json({ error: "Consulta não encontrada." });

  if (consulta.status === "ativo") {
    return res.json({ pago: true, status: "ativo", diasRestantes: diasRestantes(consulta.expiraEm), expiraEm: consulta.expiraEm });
  }

  // Defesa em profundidade: se o Asaas já confirmou mas o webhook não chegou, ativa aqui.
  let pago = false;
  if (consulta.asaasChargeId && process.env.NEXVEL_ASAAS_API_KEY) {
    try { pago = await cobrancaFoiPaga(consulta.asaasChargeId); } catch { pago = false; }
  }
  if (pago) {
    await ativarConsulta(consulta.id);
    const atual = await prisma.consultaParceria.findUnique({ where: { id: consulta.id } });
    return res.json({ pago: true, status: atual?.status ?? "ativo", diasRestantes: diasRestantes(atual?.expiraEm), expiraEm: atual?.expiraEm });
  }
  res.json({ pago: false, status: consulta.status, diasRestantes: 0, expiraEm: null });
});

// ── POST /cancelar/:consultaId — desiste de um pagamento pendente ──────────────
router.post("/cancelar/:consultaId", async (req: PacienteAuthRequest, res: Response) => {
  const consulta = await prisma.consultaParceria.findFirst({
    where: { id: String(req.params.consultaId), pacienteId: req.pacienteId!, status: "pendente" },
  });
  if (!consulta) return res.status(404).json({ error: "Nada a cancelar." });
  await prisma.consultaParceria.update({ where: { id: consulta.id }, data: { status: "cancelado" } });
  res.json({ ok: true });
});

// ── Recursos do parceiro — SÓ com acesso ativo (gate) ─────────────────────────

// GET /video — link único da videochamada (mesmo para paciente e parceiro).
router.get("/video", exigirAcessoParceria, async (req: ParceriaRequest, res: Response) => {
  const g = req.parceria!;
  res.json({ url: jitsiUrl(g.videoRoom), room: g.videoRoom, parceiroNome: g.parceiro.nome });
});

// GET /dieta — plano do nutricionista parceiro (reaproveita o plano de refeições do paciente).
router.get("/dieta", exigirAcessoParceria, async (req: ParceriaRequest, res: Response) => {
  const g = req.parceria!;
  const pac = await prisma.paciente.findUnique({
    where: { id: req.pacienteId! },
    select: { planoRefeicoes: true, aguaMetaMl: true, sonoMetaHoras: true },
  });
  res.json({
    parceiroNome: g.parceiro.nome,
    especialidade: g.parceiro.especialidade,
    planoRefeicoes: pac?.planoRefeicoes ?? null,
    aguaMetaMl: pac?.aguaMetaMl ?? null,
    sonoMetaHoras: pac?.sonoMetaHoras ?? null,
  });
});

// GET/POST /chat — conversa da consulta (gated).
router.get("/chat", exigirAcessoParceria, async (req: ParceriaRequest, res: Response) => {
  const g = req.parceria!;
  const mensagens = await prisma.mensagemParceria.findMany({
    where: { consultaId: g.id },
    orderBy: { criadoEm: "asc" },
    take: 200,
  });
  res.json({ parceiroNome: g.parceiro.nome, mensagens });
});

router.post("/chat", exigirAcessoParceria, validateBody(chatSchema), async (req: ParceriaRequest, res: Response) => {
  const g = req.parceria!;
  const { conteudo } = req.body as { conteudo: string };
  const msg = await prisma.mensagemParceria.create({
    data: { consultaId: g.id, autor: "paciente", conteudo: conteudo.trim() },
  });
  res.status(201).json(msg);
});

// GET /ranking?escopo=meu|global — ranking do parceiro ou global normalizado (gated).
router.get("/ranking", exigirAcessoParceria, async (req: ParceriaRequest, res: Response) => {
  const g = req.parceria!;
  const escopo = req.query.escopo === "global" ? "global" : "meu";
  const linhas = escopo === "global" ? await rankingGlobal() : await rankingDoParceiro(g.parceiroId);
  const comPosicao = linhas.map((l, i) => ({ ...l, posicao: i + 1, isMe: l.pacienteId === req.pacienteId }));
  res.json({ escopo, parceiroNome: g.parceiro.nome, linhas: comPosicao });
});

export default router;
