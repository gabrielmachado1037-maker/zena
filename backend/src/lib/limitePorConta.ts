import rateLimit from "express-rate-limit";
import type { Request } from "express";
import { normalizarEmail } from "./email-lookup";

/**
 * Trava de login por CONTA (o limitador por IP não cobre isto).
 *
 * O buraco: os limiters de login são chaveados por IP (5/15min). Um ataque
 * distribuído — mesma conta, senhas diferentes, um IP por tentativa (botnet,
 * proxies residenciais) — nunca esbarra neles, porque cada IP gasta 1 das suas
 * 5 tentativas. Na prática o número de chutes contra uma conta específica era
 * ILIMITADO. Com senha mínima de 6 caracteres e sem exigência de complexidade,
 * isso é o cenário de credential stuffing padrão.
 *
 * A chave aqui é o e-mail enviado, então as tentativas somam mesmo vindas de
 * milhares de IPs distintos.
 *
 * ── Por que 20/15min e não 5 ──
 *
 * Trava por conta tem um efeito colateral conhecido: ela vira uma negação de
 * serviço contra a VÍTIMA. Quem souber o e-mail de alguém pode errar a senha de
 * propósito até trancar a pessoa para fora. Não dá para eliminar esse
 * trade-off, só dimensioná-lo:
 *
 *  - `skipSuccessfulRequests` faz só o ERRO contar. Quem acerta a senha nunca
 *    acumula, então o uso normal jamais se aproxima do teto.
 *  - 20 tentativas erradas em 15 minutos é muito acima do humano que esqueceu a
 *    senha (3, 4 vezes) e muito abaixo do que um ataque precisa: derruba o teto
 *    de "ilimitado" para 80 chutes/hora por conta.
 *  - A janela é curta e expira sozinha: um bloqueio malicioso dura 15 minutos,
 *    não trava a conta permanentemente nem exige intervenção de suporte.
 *
 * ── Por que NÃO aplicar no /esqueci-senha ──
 *
 * O que torna a trava de login aceitável é existir uma saída: mesmo trancado, o
 * dono da conta pede a redefinição por e-mail e entra com a senha nova. Se a
 * recuperação também fosse limitada por conta, o mesmo atacante fecharia a
 * porta e a janela ao mesmo tempo. O /esqueci-senha continua só no limite por
 * IP de propósito.
 *
 * ── Anti-enumeração ──
 *
 * A chave é o e-mail DIGITADO, exista a conta ou não. E-mail inexistente também
 * acumula e também recebe 429 no teto, então a resposta não diferencia conta
 * real de conta inventada — mesma preocupação que motivou o hash descartável no
 * login (ver auth.ts).
 */
export const limitePorConta = (mensagem: string) =>
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    skipSuccessfulRequests: true,
    // Sem fallback para o IP: a graça desta camada é ser independente dele.
    // Requisição sem e-mail no corpo cai numa chave única e inofensiva — o
    // validateBody à frente já a rejeita antes de chegar aqui.
    keyGenerator: (req: Request) => `conta:${normalizarEmail((req.body as { email?: unknown })?.email) || "sem-email"}`,
    message: { error: mensagem },
    standardHeaders: true,
    legacyHeaders: false,
  });
