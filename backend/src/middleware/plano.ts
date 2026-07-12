import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth";
import prisma from "../lib/prisma";

export async function planoMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const nutri = await prisma.nutricionista.findUnique({
    where: { id: req.nutricionistaId! },
    select: { planoAtivo: true, trialEnd: true, subscriptionStatus: true },
  });

  if (!nutri) return res.status(401).json({ error: "Não autenticado" });

  const trialValido = nutri.trialEnd != null && nutri.trialEnd > new Date();

  // Assinante pagante ativo: libera.
  if (nutri.subscriptionStatus === "ativo") return next();

  // Trial: libera SOMENTE enquanto não expirou.
  if (nutri.subscriptionStatus === "trial") {
    if (trialValido) return next();
    return res.status(402).json({ error: "Seu período de teste terminou. Acesse /app/planos para assinar." });
  }

  // Demais estados (inadimplente, cancelado, legado): planoAtivo + trial válido.
  if (!nutri.planoAtivo && !trialValido) {
    return res.status(402).json({ error: "Plano expirado. Acesse /app/billing para renovar." });
  }

  next();
}
