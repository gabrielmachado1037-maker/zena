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

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.json({ quote: "Cada consulta é uma semente plantada na vida de alguém.", date: today });
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 80,
        messages: [{
          role: "user",
          content: `Gere UMA frase motivacional curta e poderosa para nutricionistas. Entre 10 e 20 palavras. Inspiradora, profissional, sobre saúde, propósito ou impacto na vida das pessoas. Responda APENAS no formato JSON sem nenhum texto extra: {"quote": "frase aqui"}`,
        }],
      }),
    });

    const data = await response.json() as { content?: Array<{ text?: string }> };
    const text = data?.content?.[0]?.text ?? "";
    const parsed = JSON.parse(text) as { quote?: string };
    const quote = parsed.quote ?? "Cada consulta é uma semente plantada na vida de alguém.";

    await prisma.dailyQuote.create({ data: { date: today, quote } });
    return res.json({ quote, date: today });
  } catch {
    return res.json({ quote: "Cada consulta é uma semente plantada na vida de alguém.", date: today });
  }
});

export default router;
