import { Router, Response } from "express";
import prisma from "../lib/prisma";
import { authMiddleware, AuthRequest } from "../middleware/auth";

const router = Router();
router.use(authMiddleware);

router.get("/", async (_req: AuthRequest, res: Response) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const existing = await prisma.dailyQuote.findUnique({ where: { date: today } });
  if (existing) {
    return res.json({ quote: existing.quote, date: existing.date });
  }

  // IA reservada AO RELATÓRIO/PDF para economizar crédito da Anthropic. Aqui usamos
  // frase fixa. (Cotações já geradas em dias anteriores seguem servindo pelo cache acima.)
  // Para reativar: restaurar a chamada à Anthropic gated por process.env.ANTHROPIC_API_KEY.
  return res.json({ quote: "Cada consulta é uma semente plantada na vida de alguém.", date: today });
});

export default router;
