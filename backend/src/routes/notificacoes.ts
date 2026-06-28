import { Router, Response } from "express";
import webpush from "web-push";
import prisma from "../lib/prisma";
import { authMiddleware, AuthRequest } from "../middleware/auth";

const router = Router();

// Configure VAPID (noop if keys not set — notifications silently disabled)
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    "mailto:noreply@clinne.com.br",
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

// GET /api/notificacoes/vapid-public-key — sem auth, usado pelo frontend
router.get("/vapid-public-key", (_req, res) => {
  res.json({ key: process.env.VAPID_PUBLIC_KEY ?? null });
});

// POST /api/notificacoes/subscribe — salva subscription
router.post("/subscribe", authMiddleware, async (req: AuthRequest, res: Response) => {
  const { endpoint, keys } = req.body as {
    endpoint: string;
    keys: { p256dh: string; auth: string };
  };
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return res.status(400).json({ error: "Subscription inválida" });
  }
  await prisma.pushSubscription.upsert({
    where:  { endpoint },
    create: { nutricionistaId: req.nutricionistaId!, endpoint, p256dh: keys.p256dh, auth: keys.auth },
    update: { nutricionistaId: req.nutricionistaId!, p256dh: keys.p256dh, auth: keys.auth },
  });
  return res.json({ ok: true });
});

// DELETE /api/notificacoes/subscribe — remove subscription
router.delete("/subscribe", authMiddleware, async (req: AuthRequest, res: Response) => {
  const { endpoint } = req.body as { endpoint: string };
  if (endpoint) {
    await prisma.pushSubscription.deleteMany({ where: { endpoint } });
  }
  return res.json({ ok: true });
});

// ─── Função interna: envia push para todos os dispositivos do nutricionista ───

export async function enviarNotificacao(
  nutricionistaId: string,
  titulo: string,
  corpo: string,
  url = "/app/dashboard"
): Promise<void> {
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) return;

  const subs = await prisma.pushSubscription.findMany({
    where: { nutricionistaId },
    select: { id: true, endpoint: true, p256dh: true, auth: true },
  });
  if (subs.length === 0) return;

  const payload = JSON.stringify({ title: titulo, body: corpo, url });

  await Promise.allSettled(
    subs.map(sub =>
      webpush
        .sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload)
        .catch(async (err: any) => {
          // 410 Gone = subscription expirada; remove do banco
          if (err?.statusCode === 410) {
            await prisma.pushSubscription.deleteMany({ where: { id: sub.id } });
          } else {
            console.error("[push]", err?.message ?? err);
          }
        })
    )
  );
}

export default router;
