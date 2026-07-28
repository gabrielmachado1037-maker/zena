import { Response, NextFunction } from "express";
import { PacienteAuthRequest } from "./auth";
import { acessoAtivo } from "../lib/parceria";

// Anexa a consulta com acesso ativo do paciente ao request.
export interface ParceriaRequest extends PacienteAuthRequest {
  parceria?: Awaited<ReturnType<typeof acessoAtivo>>;
}

/**
 * Gate dos recursos específicos do parceiro (chat, dieta, ranking, vídeo).
 * Só passa com um acesso de 30 dias ATIVO. Sem acesso → 403 com `code`
 * distinto ("sem_acesso_parceria") para o front redirecionar ao fluxo de
 * escolha/renovação (espelha o padrão de `code` usado no pacienteApp).
 * Colocado DEPOIS de authPacienteMiddleware — usa req.pacienteId do token.
 */
export async function exigirAcessoParceria(req: ParceriaRequest, res: Response, next: NextFunction) {
  const grant = await acessoAtivo(req.pacienteId!);
  if (!grant) {
    return res.status(403).json({
      error: "sem_acesso_parceria",
      code: "sem_acesso_parceria",
      message: "Você precisa de um acesso ativo a um nutricionista parceiro para usar este recurso.",
    });
  }
  req.parceria = grant;
  next();
}
