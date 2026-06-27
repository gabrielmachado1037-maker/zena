import { Router, Response, Request } from "express";
import Stripe from "stripe";
import prisma from "../lib/prisma";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import { criarClienteCliNNe, criarAssinaturaPix, cancelarAssinatura, buscarAssinatura } from "../lib/asaas";

const router = Router();

function getStripe(): Stripe | null {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

const STRIPE_PLANOS = {
  mensal: process.env.STRIPE_PRICE_MENSAL || "",
  anual: process.env.STRIPE_PRICE_ANUAL || "",
};

// Preços Clinne via Asaas/Pix
const ASAAS_PLANOS = {
  mensal: { valor: Number(process.env.PLANO_MENSAL_VALOR || "69"), ciclo: "MONTHLY" as const, label: "Plano Mensal" },
  anual:  { valor: Number(process.env.PLANO_ANUAL_VALOR  || "49"), ciclo: "YEARLY"  as const, label: "Plano Anual" },
};

router.get("/status", authMiddleware, async (req: AuthRequest, res: Response) => {
  const nutri = await prisma.nutricionista.findUnique({
    where: { id: req.nutricionistaId as string },
    select: { plano: true, planoAtivo: true, trialEnd: true, stripeSubscriptionId: true, asaasSubscriptionId: true, planoVencimento: true },
  });
  if (!nutri) return res.status(404).json({ error: "Não encontrado" });

  const agora = new Date();
  const emTrial = nutri.plano === "trial" && nutri.trialEnd && nutri.trialEnd > agora;
  const diasRestantesTrial = emTrial && nutri.trialEnd
    ? Math.ceil((nutri.trialEnd.getTime() - agora.getTime()) / (1000 * 60 * 60 * 24))
    : 0;
  const expirado = !nutri.planoAtivo && !emTrial;

  res.json({
    plano: nutri.plano,
    planoAtivo: nutri.planoAtivo,
    emTrial,
    diasRestantesTrial,
    trialEnd: nutri.trialEnd,
    expirado,
    temAssinatura: !!(nutri.stripeSubscriptionId || nutri.asaasSubscriptionId),
    metodoPagamento: nutri.asaasSubscriptionId ? "pix" : nutri.stripeSubscriptionId ? "cartao" : null,
    planoVencimento: nutri.planoVencimento,
  });
});

// ── Checkout via Stripe (cartão) ──────────────────────────────────────────────

router.post("/checkout", authMiddleware, async (req: AuthRequest, res: Response) => {
  const stripe = getStripe();
  if (!stripe) return res.status(503).json({ error: "Pagamentos por cartão não configurados" });

  const { periodo } = req.body as { periodo: "mensal" | "anual" };
  const priceId = STRIPE_PLANOS[periodo];
  if (!priceId) return res.status(400).json({ error: "Plano inválido" });

  const nutri = await prisma.nutricionista.findUnique({ where: { id: req.nutricionistaId as string } });
  if (!nutri) return res.status(404).json({ error: "Não encontrado" });

  let customerId = nutri.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({ email: nutri.email, name: nutri.nome });
    customerId = customer.id;
    await prisma.nutricionista.update({ where: { id: nutri.id }, data: { stripeCustomerId: customerId } });
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.FRONTEND_URL || "http://localhost:5173"}/app/billing?sucesso=1`,
    cancel_url: `${process.env.FRONTEND_URL || "http://localhost:5173"}/app/planos`,
    locale: "pt-BR",
  });

  res.json({ url: session.url });
});

// ── Checkout via Asaas (Pix) — usa a chave DO CLINNE ─────────────────────────

router.post("/checkout-pix", authMiddleware, async (req: AuthRequest, res: Response) => {
  if (!process.env.CLINNE_ASAAS_API_KEY) {
    return res.status(503).json({ error: "Pagamento via Pix não configurado ainda." });
  }

  const { periodo } = req.body as { periodo: "mensal" | "anual" };
  const plano = ASAAS_PLANOS[periodo];
  if (!plano) return res.status(400).json({ error: "Plano inválido" });

  const nutri = await prisma.nutricionista.findUnique({ where: { id: req.nutricionistaId as string } });
  if (!nutri) return res.status(404).json({ error: "Não encontrado" });

  // Cria ou busca cliente na conta Asaas DO CLINNE
  const cliente = await criarClienteCliNNe(nutri.nome, nutri.email);

  const { subscription, pix } = await criarAssinaturaPix(
    cliente.id,
    plano.valor,
    plano.ciclo,
    `Clinne — ${plano.label}`,
    nutri.id,
  );

  // Calcula próximo vencimento
  const vencimento = new Date();
  if (periodo === "anual") {
    vencimento.setFullYear(vencimento.getFullYear() + 1);
  } else {
    vencimento.setMonth(vencimento.getMonth() + 1);
  }

  await prisma.nutricionista.update({
    where: { id: nutri.id },
    data: {
      asaasCustomerId: cliente.id,
      asaasSubscriptionId: subscription.id,
      planoVencimento: vencimento,
      plano: periodo,
      // planoAtivo permanece false até o webhook confirmar o pagamento
    },
  });

  res.json({
    subscriptionId: subscription.id,
    pixCopiaECola: pix?.payload,
    pixQrCode: pix?.encodedImage,
    valor: plano.valor,
    periodo,
  });
});

// Verifica status do pagamento Pix (polling do frontend)
router.get("/pix-status", authMiddleware, async (req: AuthRequest, res: Response) => {
  const nutri = await prisma.nutricionista.findUnique({ where: { id: req.nutricionistaId as string } });
  if (!nutri) return res.status(404).json({ error: "Não encontrado" });

  res.json({
    planoAtivo: nutri.planoAtivo,
    plano: nutri.plano,
    asaasSubscriptionId: nutri.asaasSubscriptionId,
  });
});

// Portal Stripe (gestão de cartão)
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

// Cancelar assinatura Asaas
router.post("/cancelar-pix", authMiddleware, async (req: AuthRequest, res: Response) => {
  const nutri = await prisma.nutricionista.findUnique({ where: { id: req.nutricionistaId as string } });
  if (!nutri?.asaasSubscriptionId) return res.status(400).json({ error: "Sem assinatura Pix" });

  await cancelarAssinatura(nutri.asaasSubscriptionId);
  await prisma.nutricionista.update({
    where: { id: nutri.id },
    data: { asaasSubscriptionId: null, planoAtivo: false, plano: "trial" },
  });
  res.json({ ok: true });
});

// ── Webhooks ──────────────────────────────────────────────────────────────────

// Webhook Stripe (raw body registrado no index.ts)
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
          const plano = sub.items.data[0]?.price.recurring?.interval === "year" ? "anual" : "mensal";
          const vencimento = new Date(sub.current_period_end * 1000);
          await prisma.nutricionista.updateMany({
            where: { stripeCustomerId: session.customer as string },
            data: { plano, planoAtivo: true, stripeSubscriptionId: sub.id, planoVencimento: vencimento },
          });
        }
        break;
      }
      case "invoice.payment_failed":
      case "customer.subscription.deleted": {
        const obj = event.data.object as { customer: string };
        await prisma.nutricionista.updateMany({
          where: { stripeCustomerId: obj.customer as string },
          data: { planoAtivo: false },
        });
        break;
      }
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const plano = sub.items.data[0]?.price.recurring?.interval === "year" ? "anual" : "mensal";
        await prisma.nutricionista.updateMany({
          where: { stripeCustomerId: sub.customer as string },
          data: { plano, planoAtivo: sub.status === "active", planoVencimento: new Date(sub.current_period_end * 1000) },
        });
        break;
      }
    }
  })().catch(console.error);

  res.json({ received: true });
}

// Webhook Asaas (confirmação de pagamento da assinatura do Clinne)
router.post("/asaas-webhook", async (req: Request, res: Response) => {
  const { event, payment } = req.body as { event: string; payment?: { externalReference?: string; dueDate?: string } };

  if (!payment?.externalReference) return res.json({ ok: true });

  const nutricionistaId = payment.externalReference;

  if (event === "PAYMENT_CONFIRMED" || event === "PAYMENT_RECEIVED") {
    const nutri = await prisma.nutricionista.findUnique({ where: { id: nutricionistaId } });
    if (!nutri) return res.json({ ok: true });

    const vencimento = new Date();
    if (nutri.plano === "anual") {
      vencimento.setFullYear(vencimento.getFullYear() + 1);
    } else {
      vencimento.setMonth(vencimento.getMonth() + 1);
    }

    await prisma.nutricionista.update({
      where: { id: nutricionistaId },
      data: { planoAtivo: true, planoVencimento: vencimento },
    });
  }

  if (event === "PAYMENT_OVERDUE") {
    const nutri = await prisma.nutricionista.findUnique({ where: { id: nutricionistaId } });
    if (!nutri?.planoVencimento) return res.json({ ok: true });

    const diasAtraso = Math.floor((Date.now() - nutri.planoVencimento.getTime()) / (1000 * 60 * 60 * 24));
    if (diasAtraso > 3) {
      await prisma.nutricionista.update({
        where: { id: nutricionistaId },
        data: { planoAtivo: false },
      });
    }
  }

  res.json({ ok: true });
});

export default router;
