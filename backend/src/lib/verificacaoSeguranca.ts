import * as Sentry from "@sentry/node";
import type { Application } from "express";

/**
 * Verificações de segurança que dependem do AMBIENTE, não do código.
 *
 * Existe por causa de um incidente concreto: o `trust proxy` nunca foi
 * configurado, então atrás do proxy da Render todos os rate limiters
 * compartilhavam um balde único e 5 tentativas de login erradas derrubavam o
 * login de todas as clínicas. O código estava "certo"; a premissa sobre o
 * deploy é que estava errada — e nenhuma auditoria de código pegaria isso.
 *
 * O sinal existia (a própria express-rate-limit logava
 * ERR_ERL_UNEXPECTED_X_FORWARDED_FOR a cada request) e ninguém leu. Por isso
 * aqui a falha não vai só para o console: vai para o Sentry, que notifica.
 *
 * Regra de projeto: nada aqui derruba o processo. Um serviço no ar com um
 * controle degradado é ruim; um serviço fora do ar porque a checagem tem um
 * falso positivo é pior. Quem decide o que é fatal é o fail-fast do index.ts.
 */

type Checagem = {
  nome: string;
  ok: boolean;
  impacto: string;
  /** Só reporta em produção — em dev o valor "errado" costuma ser o certo. */
  soEmProd?: boolean;
};

export function verificarSeguranca(app: Application): { falhas: number } {
  const ehProd = process.env.NODE_ENV === "production";

  // `trust proxy` aceita boolean | number | string | função. O que nos
  // interessa é apenas: está desligado? Desligado atrás de proxy = req.ip
  // constante = rate limit global.
  const trustProxy = app.get("trust proxy");
  const proxyConfigurado = trustProxy !== false && trustProxy !== undefined && trustProxy !== 0;

  const checagens: Checagem[] = [
    {
      nome: "trust proxy",
      ok: proxyConfigurado,
      impacto:
        "req.ip vira o IP do proxy para TODOS: os rate limiters viram um balde global e " +
        "5 tentativas erradas de qualquer um travam o login de todas as contas por 15 min",
      soEmProd: true,
    },
    {
      nome: "trust proxy não confia cegamente",
      // `true` confia em toda a cadeia de X-Forwarded-For, que o cliente
      // controla: dá para forjar um IP diferente a cada request e sair do
      // rate limit à vontade. Pior que não ter, porque parece configurado.
      ok: trustProxy !== true,
      impacto: "com `true` o cliente forja X-Forwarded-For e escolhe a própria chave de rate limit",
    },
    {
      nome: "ASAAS_ENV",
      ok: process.env.ASAAS_ENV === "production",
      impacto: "Pix apontado para o sandbox: o checkout responde 200 com QR Code que não cobra ninguém",
      soEmProd: true,
    },
    {
      nome: "JWT_SECRET forte",
      ok: (process.env.JWT_SECRET ?? "").length >= 32,
      impacto: "segredo curto é força-brutável offline — quem quebrar emite token de qualquer conta",
      soEmProd: true,
    },
    {
      nome: "NODE_ENV",
      ok: !!process.env.NODE_ENV,
      impacto:
        "sem NODE_ENV o app roda em modo desenvolvimento: CORS libera localhost e " +
        "as checagens marcadas como 'só em produção' não rodam",
    },
  ];

  const falhas = checagens.filter((c) => !c.ok && (!c.soEmProd || ehProd));
  if (falhas.length === 0) return { falhas: 0 };

  console.error(`[SEGURANÇA] ⚠️  ${falhas.length} verificação(ões) falhando:`);
  for (const f of falhas) console.error(`[SEGURANÇA]    · ${f.nome} → ${f.impacto}`);

  // O console do Render ninguém lê. O Sentry manda email.
  if (ehProd) {
    Sentry.captureMessage(
      `[SEGURANÇA] ${falhas.length} verificação(ões) de ambiente falhando no boot: ${falhas.map((f) => f.nome).join(", ")}`,
      "error",
    );
  }

  return { falhas: falhas.length };
}
