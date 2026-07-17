import { Router, Response, Request } from "express";
import { z } from "zod";
import Stripe from "stripe";
import prisma from "../lib/prisma";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { criarClienteNexvel, criarAssinaturaPix, cancelarAssinatura, assinaturaTemPagamentoConfirmado } from "../lib/asaas";
import { MODULOS_POR_PLANO } from "../middleware/checkModulo";

const router = Router();

const planoBodySchema = z.object({
  plano_slug: z.string().optional().nullable(),
  tipo: z.string().optional().nullable(),
  periodo: z.string().optional().nullable(),
  cpf: z.string().optional().nullable(),
  nome: z.string().optional().nullable(),
});
const upgradeSchema = z.object({
  novo_plano_slug: z.string({ error: "Plano inválido" }).min(1, "Plano inválido"),
});

function getStripe(): Stripe | null {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

// Mapa de Stripe Price IDs por plano e ciclo
function getStripePriceId(planoSlug: string, tipo: string): string {
  const key = `STRIPE_PRICE_${planoSlug.toUpperCase()}_${tipo.toUpperCase()}`;
  return process.env[key] || process.env[`STRIPE_PRICE_${tipo.toUpperCase()}`] || "";
}

// Valores Pix por plano e ciclo
const VALORES_PIX: Record<string, Record<string, number>> = {
  hub:         { mensal: 67,   anual: 670  },
  ecossistema: { mensal: 149,  anual: 1490 },
};

function getValorPix(planoSlug: string, tipo: string): number {
  return VALORES_PIX[planoSlug]?.[tipo]
    ?? (Number(tipo === "anual" ? process.env.PLANO_ANUAL_VALOR : process.env.PLANO_MENSAL_VALOR) || (tipo === "anual" ? 670 : 67));
}

// ── GET /billing/status ───────────────────────────────────────────────────────

router.get("/status", authMiddleware, async (req: AuthRequest, res: Response) => {
  const nutri = await prisma.nutricionista.findUnique({
    where: { id: req.nutricionistaId as string },
    select: {
      plano: true, planoAtivo: true, trialEnd: true,
      stripeSubscriptionId: true, asaasSubscriptionId: true, planoVencimento: true,
      planoSlug: true, subscriptionStatus: true, subscriptionType: true,
      subscriptionEndsAt: true, modulosAtivos: true,
    },
  });
  if (!nutri) return res.status(404).json({ error: "Não encontrado" });

  const agora = new Date();
  const emTrial = (nutri.subscriptionStatus === "trial" || nutri.plano === "trial")
    && nutri.trialEnd != null && nutri.trialEnd > agora;
  const diasRestantesTrial = emTrial && nutri.trialEnd
    ? Math.ceil((nutri.trialEnd.getTime() - agora.getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  let status = nutri.subscriptionStatus ?? (nutri.planoAtivo ? "ativo" : (emTrial ? "trial" : "inativo"));
  // Trial que já passou do trialEnd não é mais "trial" — reporta expirado.
  if (status === "trial" && !emTrial) status = "expirado";
  const expirado = !["trial", "ativo"].includes(status);

  res.json({
    // Campos legados (backward compat)
    plano: nutri.plano,
    planoAtivo: nutri.planoAtivo,
    emTrial,
    diasRestantesTrial,
    trialEnd: nutri.trialEnd,
    expirado,
    temAssinatura: !!(nutri.stripeSubscriptionId || nutri.asaasSubscriptionId),
    metodoPagamento: nutri.asaasSubscriptionId ? "pix" : nutri.stripeSubscriptionId ? "cartao" : null,
    planoVencimento: nutri.planoVencimento,
    // Campos novos
    planoSlug: nutri.planoSlug,
    subscriptionStatus: status,
    subscriptionType: nutri.subscriptionType ?? (nutri.plano !== "trial" ? nutri.plano : null),
    subscriptionEndsAt: nutri.subscriptionEndsAt ?? nutri.planoVencimento,
    modulosAtivos: nutri.modulosAtivos.length > 0
      ? nutri.modulosAtivos
      : (status === "trial" ? MODULOS_POR_PLANO.ecossistema : MODULOS_POR_PLANO[nutri.planoSlug ?? ""] ?? []),
  });
});

// ── POST /billing/checkout (Stripe) ──────────────────────────────────────────

router.post("/checkout", authMiddleware, validateBody(planoBodySchema), async (req: AuthRequest, res: Response) => {
  const stripe = getStripe();
  if (!stripe) return res.status(503).json({ error: "Pagamentos por cartão não configurados" });

  // Aceitar formato novo (plano_slug + tipo) e legado (periodo)
  const body = req.body as { plano_slug?: string; tipo?: string; periodo?: string };
  const planoSlug = body.plano_slug ?? "ecossistema";
  const tipo = body.tipo ?? body.periodo ?? "mensal";

  const priceId = getStripePriceId(planoSlug, tipo);
  if (!priceId) return res.status(400).json({ error: "Plano/ciclo inválido ou Price ID não configurado" });

  const nutri = await prisma.nutricionista.findUnique({ where: { id: req.nutricionistaId as string } });
  if (!nutri) return res.status(404).json({ error: "Não encontrado" });

  let customerId = nutri.stripeCustomerId;
  // O customer salvo pode ter sido criado em outro modo (ex.: teste) e não
  // existir para a chave atual (live) → Stripe retorna "No such customer".
  // Valida o customer salvo e recria se estiver ausente/excluído.
  if (customerId) {
    try {
      const existente = await stripe.customers.retrieve(customerId);
      if ((existente as any).deleted) customerId = null;
    } catch {
      customerId = null;
    }
  }
  if (!customerId) {
    const customer = await stripe.customers.create({ email: nutri.email, name: nutri.nome });
    customerId = customer.id;
    await prisma.nutricionista.update({ where: { id: nutri.id }, data: { stripeCustomerId: customerId } });
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    metadata: { plano_slug: planoSlug, tipo },
    success_url: `${process.env.FRONTEND_URL || "http://localhost:5173"}/app/billing?sucesso=1`,
    cancel_url: `${process.env.FRONTEND_URL || "http://localhost:5173"}/app/planos`,
    locale: "pt-BR",
  });

  res.json({ url: session.url });
});

// ── POST /billing/checkout-pix (Asaas) ───────────────────────────────────────

router.post("/checkout-pix", authMiddleware, validateBody(planoBodySchema), async (req: AuthRequest, res: Response) => {
  if (!process.env.NEXVEL_ASAAS_API_KEY) {
    return res.status(503).json({ error: "Pagamento via Pix não configurado ainda." });
  }

  const body = req.body as { plano_slug?: string; tipo?: string; periodo?: string; cpf?: string; nome?: string };
  const planoSlug = body.plano_slug ?? "ecossistema";
  const periodo = (body.tipo ?? body.periodo ?? "mensal") as "mensal" | "anual";
  const valor = getValorPix(planoSlug, periodo);

  // O Asaas EXIGE CPF/CNPJ para gerar cobrança Pix (e para nota fiscal).
  const cpf = (body.cpf ?? "").replace(/\D/g, "");
  if (cpf.length !== 11 && cpf.length !== 14) {
    return res.status(400).json({ error: "Informe um CPF (ou CNPJ) válido para gerar o Pix." });
  }

  const nutri = await prisma.nutricionista.findUnique({ where: { id: req.nutricionistaId as string } });
  if (!nutri) return res.status(404).json({ error: "Não encontrado" });
  const nomeCliente = (body.nome ?? "").trim() || nutri.nome;

  try {
    const cliente = await criarClienteNexvel(nomeCliente, nutri.email, cpf);
    const { subscription, pix } = await criarAssinaturaPix(
      cliente.id, valor,
      periodo === "anual" ? "YEARLY" : "MONTHLY",
      `Nexvel — ${planoSlug} ${periodo}`,
      nutri.id,
    );

    const vencimento = new Date();
    if (periodo === "anual") vencimento.setFullYear(vencimento.getFullYear() + 1);
    else vencimento.setMonth(vencimento.getMonth() + 1);

    await prisma.nutricionista.update({
      where: { id: nutri.id },
      data: {
        asaasCustomerId: cliente.id,
        asaasSubscriptionId: subscription.id,
        planoVencimento: vencimento,
        plano: periodo,
        planoSlug,
        subscriptionType: periodo,
      },
    });

    res.json({
      subscriptionId: subscription.id,
      pixCopiaECola: pix?.payload,
      pixQrCode: pix?.encodedImage,
      valor,
      periodo,
      planoSlug,
    });
  } catch (e) {
    // Erro do Asaas (ex.: CPF inválido) — mensagem amigável em vez de 500 genérico.
    console.error("[checkout-pix] Asaas falhou:", (e as Error).message);
    const msg = (e as Error).message || "";
    return res.status(502).json({
      error: /cpf|cnpj|inv[aá]lid|obrigat/i.test(msg)
        ? "Não foi possível gerar o Pix: confira o CPF/CNPJ informado."
        : "Não foi possível gerar o Pix agora. Tente novamente em instantes.",
    });
  }
});

// ── POST /billing/upgrade ─────────────────────────────────────────────────────

router.post("/upgrade", authMiddleware, validateBody(upgradeSchema), async (req: AuthRequest, res: Response) => {
  const { novo_plano_slug } = req.body as { novo_plano_slug: string };
  if (!MODULOS_POR_PLANO[novo_plano_slug]) {
    return res.status(400).json({ error: "Plano inválido" });
  }

  const nutri = await prisma.nutricionista.findUnique({
    where: { id: req.nutricionistaId as string },
    select: { stripeSubscriptionId: true, subscriptionType: true, planoSlug: true },
  });
  if (!nutri) return res.status(404).json({ error: "Não encontrado" });

  if (nutri.stripeSubscriptionId) {
    const stripe = getStripe();
    if (!stripe) return res.status(503).json({ error: "Stripe não configurado" });

    const tipo = nutri.subscriptionType ?? "mensal";
    const priceId = getStripePriceId(novo_plano_slug, tipo);
    if (!priceId) return res.status(400).json({ error: "Price ID não configurado para este plano" });

    const sub = await stripe.subscriptions.retrieve(nutri.stripeSubscriptionId);
    await stripe.subscriptions.update(nutri.stripeSubscriptionId, {
      items: [{ id: sub.items.data[0].id, price: priceId }],
      proration_behavior: "always_invoice",
    });
  }

  // Atualiza imediatamente no DB (módulos liberados mesmo sem pagamento confirmado no Stripe)
  const modulosAtivos = MODULOS_POR_PLANO[novo_plano_slug] ?? [];
  await prisma.nutricionista.update({
    where: { id: req.nutricionistaId as string },
    data: { planoSlug: novo_plano_slug, modulosAtivos, subscriptionStatus: "ativo" },
  });

  res.json({ ok: true, planoSlug: novo_plano_slug, modulosAtivos });
});

// ── GET /billing/pix-status ───────────────────────────────────────────────────

router.get("/pix-status", authMiddleware, async (req: AuthRequest, res: Response) => {
  const nutri = await prisma.nutricionista.findUnique({
    where: { id: req.nutricionistaId as string },
    select: { planoAtivo: true, plano: true, asaasSubscriptionId: true, subscriptionStatus: true, planoSlug: true },
  });
  if (!nutri) return res.status(404).json({ error: "Não encontrado" });

  // "pago" = pagamento Pix REALMENTE confirmado no Asaas (não o estado geral da
  // conta — que já pode estar ativa por trial/cortesia). Só isso libera o "sucesso".
  let pago = false;
  if (nutri.asaasSubscriptionId && process.env.NEXVEL_ASAAS_API_KEY) {
    try { pago = await assinaturaTemPagamentoConfirmado(nutri.asaasSubscriptionId); }
    catch { pago = false; }
  }
  res.json({ pago, planoAtivo: nutri.planoAtivo, plano: nutri.plano, subscriptionStatus: nutri.subscriptionStatus, planoSlug: nutri.planoSlug, asaasSubscriptionId: nutri.asaasSubscriptionId });
});

// ── POST /billing/portal (Stripe portal) ─────────────────────────────────────

router.post("/portal", authMiddleware, async (req: AuthRequest, res: Response) => {
  const stripe = getStripe();
  if (!stripe) return res.status(503).json({ error: "Não configurado" });

  const nutri = await prisma.nutricionista.findUnique({ where: { id: req.nutricionistaId as string } });
  if (!nutri?.stripeCustomerId) return res.status(400).json({ error: "Sem assinatura via cartão" });

  const session = await stripe.billingPortal.sessions.create({
    customer: nutri.stripeCustomerId,
    return_url: `${process.env.FRONTEND_URL || "http://localhost:5173"}/app/planos`,
  });
  res.json({ url: session.url });
});

// ── POST /billing/cancelar-pix ────────────────────────────────────────────────

router.post("/cancelar-pix", authMiddleware, async (req: AuthRequest, res: Response) => {
  const nutri = await prisma.nutricionista.findUnique({ where: { id: req.nutricionistaId as string } });
  if (!nutri?.asaasSubscriptionId) return res.status(400).json({ error: "Sem assinatura Pix" });

  await cancelarAssinatura(nutri.asaasSubscriptionId);
  await prisma.nutricionista.update({
    where: { id: nutri.id },
    data: {
      asaasSubscriptionId: null,
      planoAtivo: false,
      plano: "trial",
      subscriptionStatus: "cancelado",
    },
  });
  res.json({ ok: true });
});

// ── Webhooks ──────────────────────────────────────────────────────────────────

export function webhookHandler(req: Request, res: Response) {
  const stripe = getStripe();
  if (!stripe) return res.status(503).json({ error: "Não configurado" });

  const sig = req.headers["stripe-signature"] as string;
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body as Buffer, sig, process.env.STRIPE_WEBHOOK_SECRET || "");
  } catch {
    return res.status(400).json({ error: "Webhook inválido" });
  }

  (async () => {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.subscription && session.customer) {
          const sub = await stripe.subscriptions.retrieve(session.subscription as string);
          const tipo = sub.items.data[0]?.price.recurring?.interval === "year" ? "anual" : "mensal";
          const vencimento = new Date(((sub as any).current_period_end ?? 0) * 1000);
          const planoSlug = (session.metadata?.plano_slug as string | undefined) ?? "ecossistema";
          const modulosAtivos = MODULOS_POR_PLANO[planoSlug] ?? [];
          await prisma.nutricionista.updateMany({
            where: { stripeCustomerId: session.customer as string },
            data: {
              plano: tipo,
              planoAtivo: true,
              stripeSubscriptionId: sub.id,
              planoVencimento: vencimento,
              planoSlug,
              subscriptionStatus: "ativo",
              subscriptionType: tipo,
              subscriptionEndsAt: vencimento,
              modulosAtivos,
            },
          });
        }
        break;
      }
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const tipo = sub.items.data[0]?.price.recurring?.interval === "year" ? "anual" : "mensal";
        const periodoFim = (sub as any).current_period_end;
        const vencimento = periodoFim ? new Date(periodoFim * 1000) : undefined;
        await prisma.nutricionista.updateMany({
          where: { stripeCustomerId: sub.customer as string },
          data: {
            plano: tipo,
            planoAtivo: sub.status === "active",
            planoVencimento: vencimento,
            subscriptionStatus: sub.status === "active" ? "ativo" : "inadimplente",
            subscriptionType: tipo,
            subscriptionEndsAt: vencimento,
          },
        });
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await prisma.nutricionista.updateMany({
          where: { stripeCustomerId: sub.customer as string },
          data: { planoAtivo: false, subscriptionStatus: "cancelado" },
        });
        break;
      }
      case "invoice.payment_failed": {
        const inv = event.data.object as Stripe.Invoice;
        if (inv.customer) {
          await prisma.nutricionista.updateMany({
            where: { stripeCustomerId: inv.customer as string },
            data: { subscriptionStatus: "inadimplente" },
          });
        }
        break;
      }
      case "invoice.payment_succeeded": {
        const inv = event.data.object as Stripe.Invoice;
        if (inv.customer) {
          await prisma.nutricionista.updateMany({
            where: { stripeCustomerId: inv.customer as string },
            data: { planoAtivo: true, subscriptionStatus: "ativo" },
          });
        }
        break;
      }
    }
  })().catch(console.error);

  res.json({ received: true });
}

// Webhook Asaas
router.post("/asaas-webhook", async (req: Request, res: Response) => {
  // Autenticação do webhook: o Asaas envia o token configurado no painel no
  // header `asaas-access-token`. Sem esta checagem, qualquer um poderia forjar
  // um PAYMENT_CONFIRMED e ativar um plano de graça (bypass do paywall).
  const expected = process.env.ASAAS_WEBHOOK_TOKEN;
  if (!expected || req.get("asaas-access-token") !== expected) {
    return res.status(401).json({ error: "Webhook não autorizado." });
  }

  const { event, payment } = req.body as { event: string; payment?: { externalReference?: string; dueDate?: string } };
  if (!payment?.externalReference) return res.json({ ok: true });

  const nutricionistaId = payment.externalReference;

  if (event === "PAYMENT_CONFIRMED" || event === "PAYMENT_RECEIVED") {
    const nutri = await prisma.nutricionista.findUnique({ where: { id: nutricionistaId } });
    if (!nutri) return res.json({ ok: true });

    const vencimento = new Date();
    if (nutri.plano === "anual") vencimento.setFullYear(vencimento.getFullYear() + 1);
    else vencimento.setMonth(vencimento.getMonth() + 1);

    const planoSlug = nutri.planoSlug ?? "ecossistema";
    const modulosAtivos = nutri.modulosAtivos.length > 0
      ? nutri.modulosAtivos
      : (MODULOS_POR_PLANO[planoSlug] ?? []);

    await prisma.nutricionista.update({
      where: { id: nutricionistaId },
      data: {
        planoAtivo: true,
        planoVencimento: vencimento,
        subscriptionStatus: "ativo",
        modulosAtivos,
      },
    });
  }

  if (event === "PAYMENT_OVERDUE") {
    const nutri = await prisma.nutricionista.findUnique({ where: { id: nutricionistaId } });
    if (!nutri?.planoVencimento) return res.json({ ok: true });

    const diasAtraso = Math.floor((Date.now() - nutri.planoVencimento.getTime()) / (1000 * 60 * 60 * 24));
    if (diasAtraso > 3) {
      await prisma.nutricionista.update({
        where: { id: nutricionistaId },
        data: { planoAtivo: false, subscriptionStatus: "inadimplente" },
      });
    }
  }

  res.json({ ok: true });
});

export default router;
