import { Router, Response, Request } from "express";
import Stripe from "stripe";
import prisma from "../lib/prisma";
import { authMiddleware, AuthRequest } from "../middleware/auth";

const router = Router();

function getStripe(): Stripe | null {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

const PLANOS = {
  mensal: process.env.STRIPE_PRICE_MENSAL || "",
  anual: process.env.STRIPE_PRICE_ANUAL || "",
};

router.get("/status", authMiddleware, async (req: AuthRequest, res: Response) => {
  const nutri = await prisma.nutricionista.findUnique({
    where: { id: req.nutricionistaId as string },
    select: { plano: true, planoAtivo: true, trialEnd: true, stripeSubscriptionId: true },
  });
  if (!nutri) return res.status(404).json({ error: "Não encontrado" });

  const agora = new Date();
  const emTrial = nutri.plano === "trial" && nutri.trialEnd && nutri.trialEnd > agora;
  const diasRestantesTrial = emTrial && nutri.trialEnd
    ? Math.ceil((nutri.trialEnd.getTime() - agora.getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  res.json({
    plano: nutri.plano,
    planoAtivo: nutri.planoAtivo,
    emTrial,
    diasRestantesTrial,
    trialEnd: nutri.trialEnd,
  });
});

router.post("/checkout", authMiddleware, async (req: AuthRequest, res: Response) => {
  const stripe = getStripe();
  if (!stripe) return res.status(503).json({ error: "Pagamentos não configurados" });

  const { periodo } = req.body as { periodo: "mensal" | "anual" };
  const priceId = PLANOS[periodo];
  if (!priceId) return res.status(400).json({ error: "Plano inválido" });

  const nutri = await prisma.nutricionista.findUnique({
    where: { id: req.nutricionistaId as string },
  });
  if (!nutri) return res.status(404).json({ error: "Não encontrado" });

  let customerId = nutri.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({ email: nutri.email, name: nutri.nome });
    customerId = customer.id;
    await prisma.nutricionista.update({
      where: { id: nutri.id },
      data: { stripeCustomerId: customerId },
    });
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.FRONTEND_URL || "http://localhost:5173"}/app/billing?sucesso=1`,
    cancel_url: `${process.env.FRONTEND_URL || "http://localhost:5173"}/app/billing`,
    locale: "pt-BR",
    subscription_data: { trial_period_days: 0 },
  });

  res.json({ url: session.url });
});

router.post("/portal", authMiddleware, async (req: AuthRequest, res: Response) => {
  const stripe = getStripe();
  if (!stripe) return res.status(503).json({ error: "Pagamentos não configurados" });

  const nutri = await prisma.nutricionista.findUnique({
    where: { id: req.nutricionistaId as string },
  });
  if (!nutri?.stripeCustomerId) {
    return res.status(400).json({ error: "Sem assinatura ativa" });
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: nutri.stripeCustomerId,
    return_url: `${process.env.FRONTEND_URL || "http://localhost:5173"}/billing`,
  });

  res.json({ url: session.url });
});

// Raw body needed — registered separately in index.ts
export function webhookHandler(req: Request, res: Response) {
  const stripe = getStripe();
  if (!stripe) return res.status(503).json({ error: "Não configurado" });

  const sig = req.headers["stripe-signature"] as string;
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body as Buffer,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET || ""
    );
  } catch {
    return res.status(400).json({ error: "Webhook inválido" });
  }

  (async () => {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.subscription && session.customer) {
          const sub = await stripe.subscriptions.retrieve(session.subscription as string);
          await prisma.nutricionista.updateMany({
            where: { stripeCustomerId: session.customer as string },
            data: {
              plano: sub.items.data[0]?.price.recurring?.interval === "year" ? "anual" : "mensal",
              planoAtivo: true,
              stripeSubscriptionId: sub.id,
            },
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
        await prisma.nutricionista.updateMany({
          where: { stripeCustomerId: sub.customer as string },
          data: {
            plano: sub.items.data[0]?.price.recurring?.interval === "year" ? "anual" : "mensal",
            planoAtivo: sub.status === "active",
          },
        });
        break;
      }
    }
  })().catch(console.error);

  res.json({ received: true });
}

export default router;
