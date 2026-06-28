import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error("JWT_SECRET environment variable is required");

export interface AuthRequest extends Request {
  nutricionistaId?: string;
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Token não fornecido" });

  try {
    const payload = jwt.verify(token, JWT_SECRET) as { id: string };
    req.nutricionistaId = payload.id;
    next();
  } catch {
    res.status(401).json({ error: "Token inválido" });
  }
}
