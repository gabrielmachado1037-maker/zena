import { Response, NextFunction } from "express";
import prisma from "../lib/prisma";
import { PacienteAuthRequest } from "./auth";

/**
 * Bloqueia o paciente cujo acesso B2B venceu (`acessoExpiraEm` < agora). Aplicado
 * aos routers de "uso" (check-ins/gamificação) como reforço do gate visual do
 * front. `acessoExpiraEm` null = sem prazo → nunca bloqueia (paciente antigo/avulso).
 * Colocado DEPOIS de authPacienteMiddleware — usa req.pacienteId do token.
 */
export async function bloquearAcessoExpirado(req: PacienteAuthRequest, res: Response, next: NextFunction) {
  const pac = await prisma.paciente.findUnique({
    where: { id: req.pacienteId! },
    select: { acessoExpiraEm: true },
  });
  if (pac?.acessoExpiraEm && pac.acessoExpiraEm < new Date()) {
    return res.status(403).json({
      error: "Seu acesso ao app terminou. Fale com seu nutricionista para renovar.",
      code: "acesso_expirado",
      expiraEm: pac.acessoExpiraEm,
    });
  }
  next();
}
