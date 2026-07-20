import { Router, Response } from "express";
import { z } from "zod";
import webpush from "web-push";
import prisma from "../lib/prisma";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import { validateBody } from "../middleware/validate";

const router = Router();

const subscribeSchema = z.object({
  endpoint: z.string({ error: "Subscription inválida" }).min(1, "Subscription inválida"),
  keys: z.object({
    p256dh: z.string({ error: "Subscription inválida" }).min(1, "Subscription inválida"),
    auth: z.string({ error: "Subscription inválida" }).min(1, "Subscription inválida"),
  }, { error: "Subscription inválida" }),
});
const unsubscribeSchema = z.object({ endpoint: z.string().optional().nullable() });

// Configure VAPID (noop if keys not set — notifications silently disabled)
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    "mailto:noreply@nexvel.tech",
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

// GET /api/notificacoes/vapid-public-key — sem auth, usado pelo frontend
router.get("/vapid-public-key", (_req, res) => {
  res.json({ key: process.env.VAPID_PUBLIC_KEY ?? null });
});

// POST /api/notificacoes/subscribe — salva subscription
router.post("/subscribe", authMiddleware, validateBody(subscribeSchema), async (req: AuthRequest, res: Response) => {
  const { endpoint, keys } = req.body as {
    endpoint: string;
    keys: { p256dh: string; auth: string };
  };
  // O endpoint É a credencial do aparelho: quem o possui recebe os pushes dele.
  // O upsert por `endpoint` cru deixava qualquer conta autenticada reescrever o
  // dono de um endpoint alheio (basta conhecê-lo — ele fica no banco em texto
  // puro) e passar a receber notificações que carregam nome de paciente e
  // prévia de mensagem. Recusamos a tomada de posse; o cliente resolve gerando
  // uma subscription nova (endpoint novo) — ver tratamento do 409 no front.
  const dono = await prisma.pushSubscription.findUnique({
    where: { endpoint },
    select: { nutricionistaId: true },
  });
  if (dono && dono.nutricionistaId !== req.nutricionistaId) {
    return res.status(409).json({
      error: "Este dispositivo está registrado em outra conta.",
      code: "endpoint_de_outra_conta",
    });
  }
  await prisma.pushSubscription.upsert({
    where:  { endpoint },
    create: { nutricionistaId: req.nutricionistaId!, endpoint, p256dh: keys.p256dh, auth: keys.auth },
    update: { nutricionistaId: req.nutricionistaId!, p256dh: keys.p256dh, auth: keys.auth },
  });
  return res.json({ ok: true });
});

// DELETE /api/notificacoes/subscribe — remove subscription
router.delete("/subscribe", authMiddleware, validateBody(unsubscribeSchema), async (req: AuthRequest, res: Response) => {
  const { endpoint } = req.body as { endpoint: string };
  if (endpoint) {
    await prisma.pushSubscription.deleteMany({ where: { endpoint, nutricionistaId: req.nutricionistaId! } });
  }
  return res.json({ ok: true });
});

/**
 * Resultado do envio. Existe porque o log de notificação gravava "enviado"
 * sem saber se algo saiu: sem VAPID ou sem dispositivo registrado, o push é
 * um no-op silencioso e o histórico mostrava 100% de sucesso.
 */
export type ResultadoPush = {
  entregues: number;
  motivo?: "sem-vapid" | "sem-dispositivo" | "falha-envio";
};

// ─── Função interna: envia push para todos os dispositivos do nutricionista ───

export async function enviarNotificacao(
  nutricionistaId: string,
  titulo: string,
  corpo: string,
  url = "/app/dashboard",
  destination?: string,
  id?: string | null
): Promise<void> {
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) return;

  const subs = await prisma.pushSubscription.findMany({
    where: { nutricionistaId },
    select: { id: true, endpoint: true, p256dh: true, auth: true },
  });
  if (subs.length === 0) return;

  const payload = JSON.stringify({ title: titulo, body: corpo, url, destination, id });

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

// ─── Função interna: envia push para dispositivos do paciente ─────────────────

export async function enviarNotificacaoPaciente(
  pacienteId: string,
  titulo: string,
  corpo: string,
  url = "/paciente/feed",
  destination?: string,
  id?: string | null
): Promise<ResultadoPush> {
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    return { entregues: 0, motivo: "sem-vapid" };
  }

  const subs = await prisma.pushSubscriptionPaciente.findMany({
    where: { pacienteId },
    select: { id: true, endpoint: true, p256dh: true, auth: true },
  });
  if (subs.length === 0) return { entregues: 0, motivo: "sem-dispositivo" };

  const payload = JSON.stringify({ title: titulo, body: corpo, url, destination, id });

  let entregues = 0;
  await Promise.allSettled(
    subs.map(sub =>
      webpush
        .sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload)
        .then(() => { entregues++; })
        .catch(async (err: any) => {
          if (err?.statusCode === 410) {
            await prisma.pushSubscriptionPaciente.deleteMany({ where: { id: sub.id } });
          } else {
            console.error("[push-paciente]", err?.message ?? err);
          }
        })
    )
  );
  return { entregues, motivo: entregues > 0 ? undefined : "falha-envio" };
}

export default router;
