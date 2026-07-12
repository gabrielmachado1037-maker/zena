import { Request, Response, NextFunction } from "express";
import { ZodType } from "zod";

/**
 * Valida o corpo da requisição contra um schema Zod.
 * Em caso de erro, responde 400 com a primeira mensagem legível.
 * NÃO muta req.body (evita descartar campos por engano) — só valida.
 */
export function validateBody(schema: ZodType) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const msg = result.error.issues[0]?.message ?? "Dados inválidos.";
      return res.status(400).json({ error: msg });
    }
    next();
  };
}
