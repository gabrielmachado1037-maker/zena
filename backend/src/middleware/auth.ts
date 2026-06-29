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
    const payload = jwt.verify(token, JWT_SECRET) as { id: string; role?: string };
    if (payload.role === "paciente") return res.status(403).json({ error: "Acesso negado" });
    req.nutricionistaId = payload.id;
    next();
  } catch {
    res.status(401).json({ error: "Token inválido" });
  }
}

export interface PacienteAuthRequest extends Request {
  pacienteUserId?: string;
  pacienteId?: string;
  nutricionistaId?: string;
}

export function authPacienteMiddleware(req: PacienteAuthRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Token não fornecido" });

  try {
    const payload = jwt.verify(token, JWT_SECRET) as {
      id: string; role: string; pacienteId: string; nutricionistaId: string;
    };
    if (payload.role !== "paciente") return res.status(403).json({ error: "Acesso negado" });
    req.pacienteUserId = payload.id;
    req.pacienteId     = payload.pacienteId;
    req.nutricionistaId = payload.nutricionistaId;
    next();
  } catch {
    res.status(401).json({ error: "Token inválido" });
  }
}
