import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth";
import prisma from "../lib/prisma";

export const MODULOS_POR_PLANO: Record<string, string[]> = {
  hub: ["feed", "ranking", "gamificacao", "notificacoes"],
  ecossistema: [
    "feed", "ranking", "gamificacao", "notificacoes",
    "prontuario", "financeiro", "agenda", "plano_alimentar",
  ],
};

function statusEfetivo(nutri: {
  subscriptionStatus: string;
  planoAtivo: boolean;
  trialEnd: Date | null;
  plano: string;
}): string {
  // Novo campo explícito tem precedência (ativo/inadimplente/cancelado)
  if (nutri.subscriptionStatus && nutri.subscriptionStatus !== "trial") {
    return nutri.subscriptionStatus;
  }
  // Trial vale SOMENTE enquanto não expirou.
  const trialValido = nutri.trialEnd && nutri.trialEnd > new Date();
  if (trialValido) return "trial";
  // Trial sem data válida = expirado → bloqueia (não é mais "trial" eterno).
  if (nutri.plano === "trial") return "inativo";
  if (nutri.planoAtivo) return "ativo";
  return "inativo";
}

export function checkModulo(modulo: string) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    const nutri = await prisma.nutricionista.findUnique({
      where: { id: req.nutricionistaId! },
      select: {
        subscriptionStatus: true,
        planoAtivo: true,
        trialEnd: true,
        plano: true,
        planoSlug: true,
      },
    });

    if (!nutri) return res.status(401).json({ error: "Não autenticado" });

    const status = statusEfetivo(nutri);

    if (!["trial", "ativo"].includes(status)) {
      return res.status(403).json({
        error: "assinatura_inativa",
        message: "Sua assinatura está inativa.",
        redirect: "/planos",
      });
    }

    // Trial → acesso irrestrito
    if (status === "trial") return next();

    // Assinante sem planoSlug = assinante legado → acesso total
    if (!nutri.planoSlug) return next();

    const modulosDoPlano = MODULOS_POR_PLANO[nutri.planoSlug] ?? [];
    if (!modulosDoPlano.includes(modulo)) {
      return res.status(403).json({
        error: "modulo_bloqueado",
        modulo,
        plano_atual: nutri.planoSlug,
        plano_necessario: "ecossistema",
        preco_upgrade: 82.00,
        message: "Este módulo requer o plano Ecossistema Completo.",
      });
    }

    next();
  };
}
