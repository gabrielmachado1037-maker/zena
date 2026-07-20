import prisma from "./prisma";

/**
 * Busca de conta por e-mail, insensível a maiúsculas/minúsculas.
 *
 * O bug que motivou isto: cadastro e login gravavam/comparavam o e-mail
 * exatamente como digitado, mas o `/esqueci-senha` do paciente forçava
 * lowercase. Quem se cadastrou como `Maria@Gmail.com` conseguia entrar
 * (digitando igual) e NUNCA conseguia recuperar a senha — e, como a rota
 * responde 200 mesmo quando não acha (proteção anti-enumeração), a pessoa via
 * "enviamos o link", o link nunca chegava, e não havia como diagnosticar.
 *
 * Poderíamos ter normalizado só a entrada, mas isso trancaria na porta quem já
 * está cadastrado com maiúscula: o registro no banco continuaria com a caixa
 * original e o `findUnique` não acharia mais. Buscar de forma insensível
 * corrige para todos, sem depender de migration.
 *
 * `normalizarEmail` cuida do futuro: e-mail novo entra sempre minúsculo, para
 * que a unicidade do banco (que É sensível a caixa) não deixe passar
 * `Ana@x.com` e `ana@x.com` como contas diferentes.
 */

export const normalizarEmail = (v: unknown): string => String(v ?? "").trim().toLowerCase();

/**
 * IMPORTANTE — por que exato PRIMEIRO, e só depois insensível:
 *
 * O banco de produção tem (confirmado em 20/07) duas contas de paciente com o
 * mesmo e-mail em caixas diferentes. Buscar direto de forma insensível devolve
 * UMA das duas arbitrariamente, o que derrubaria o login da outra pessoa —
 * antes, com busca exata, as duas entravam normalmente.
 *
 * Então: quem digita a própria caixa continua caindo na própria conta; a busca
 * insensível só age quando o exato não acha, que é justamente o caso de quem
 * estava sem conseguir recuperar a senha. Corrige um sem quebrar o outro.
 *
 * Isto deixa de ser necessário quando as colisões forem resolvidas à mão e os
 * e-mails normalizados (scripts/normalizar-emails.ts).
 */
const email_exato = (email: string) => String(email ?? "").trim();

export function buscarNutricionistaPorEmail(email: string) {
  return prisma.nutricionista
    .findFirst({ where: { email: email_exato(email) } })
    .then((achado) =>
      achado ??
      prisma.nutricionista.findFirst({
        where: { email: { equals: normalizarEmail(email), mode: "insensitive" } },
      }),
    );
}


const porEmail = (email: string) => ({
  email: { equals: normalizarEmail(email), mode: "insensitive" as const },
});

export function buscarPacienteUserPorEmail(email: string) {
  return prisma.pacienteUser
    .findFirst({ where: { email: email_exato(email) } })
    .then((achado) => achado ?? prisma.pacienteUser.findFirst({ where: porEmail(email) }));
}

/** Variante do login: precisa do paciente e da nutricionista no mesmo round-trip. */
export function buscarPacienteUserParaLogin(email: string) {
  const include = { paciente: { include: { nutricionista: true } } };
  return prisma.pacienteUser
    .findFirst({ where: { email: email_exato(email) }, include })
    .then((achado) => achado ?? prisma.pacienteUser.findFirst({ where: porEmail(email), include }));
}

/** Variante da recuperação de senha: só precisa do nome para o e-mail. */
export function buscarPacienteUserParaRecuperacao(email: string) {
  const include = { paciente: { select: { nome: true } } };
  return prisma.pacienteUser
    .findFirst({ where: { email: email_exato(email) }, include })
    .then((achado) => achado ?? prisma.pacienteUser.findFirst({ where: porEmail(email), include }));
}
