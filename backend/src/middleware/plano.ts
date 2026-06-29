import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth";
import prisma from "../lib/prisma";

export async function planoMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const nutri = await prisma.nutricionista.findUnique({
    where: { id: req.nutricionistaId! },
    select: { planoAtivo: true, trialEnd: true, subscriptionStatus: true },
  });

  if (!nutri) return res.status(401).json({ error: "Não autenticado" });

  // Novo sistema: verificar subscriptionStatus
  if (["ativo", "trial"].includes(nutri.subscriptionStatus ?? "")) {
    return next();
  }

  // Sistema legado: verificar planoAtivo + trialEnd
  const trialValido = nutri.trialEnd && nutri.trialEnd > new Date();
  if (!nutri.planoAtivo && !trialValido) {
    return res.status(402).json({ error: "Plano expirado. Acesse /app/billing para renovar." });
  }

  next();
}
