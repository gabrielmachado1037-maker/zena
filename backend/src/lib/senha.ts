import bcrypt from "bcryptjs";

/**
 * Ponto único de verdade do custo de hash de senha.
 *
 * Era 10, espalhado por 8 chamadas de `bcrypt.hash(x, 10)` em 5 arquivos.
 * Subir de 10 para 12 quadruplica o trabalho de quem tentar quebrar os hashes
 * offline (o cenário real: vazamento do banco), e importa mais aqui do que na
 * média porque a senha mínima é de 6 caracteres, sem exigência de complexidade
 * — hash caro é o que compensa senha fraca.
 *
 * Custo medido nesta máquina: 10 ≈ 58ms, 11 ≈ 100ms, 12 ≈ 200ms. O servidor da
 * Render é mais lento, então conte com algo como 400–600ms por login. É o preço
 * de uma requisição, uma vez por sessão; o refresh token não paga isso.
 *
 * Para reverter, mude só esta constante — mas leia o aviso do hash descartável
 * abaixo antes.
 */
export const BCRYPT_COST = 12;

/**
 * ⚠️ Hash de senha nenhuma, usado só para gastar o MESMO tempo quando o e-mail
 * não existe. Sem ele, a resposta "não existe" volta em ~0ms e a diferença é
 * mensurável de fora: dá para descobrir quem tem conta, e num SaaS de nutrição
 * saber que alguém é paciente já é inferência sensível.
 *
 * Precisa ser gerado NO MESMO `BCRYPT_COST` das senhas reais. Se o custo subir e
 * este hash ficar para trás, a comparação falsa fica mais RÁPIDA que a
 * verdadeira e a enumeração por timing volta — invertida, mas igualmente
 * explorável. `npm run seguranca` reprova se os dois divergirem.
 */
export const HASH_DESCARTAVEL = "$2b$12$In8R6/mgHIPPF.sem3FWlOjg.MccEHT0vve2GpKYk459PT4yxyi0y";

export const hashSenha = (senha: string) => bcrypt.hash(senha, BCRYPT_COST);

/** Compara contra o hash descartável para igualar o tempo de resposta. */
export const gastarTempoDeSenha = (senha: unknown) =>
  bcrypt.compare(typeof senha === "string" ? senha : "", HASH_DESCARTAVEL);

/**
 * Hash antigo, gerado com custo menor que o atual?
 *
 * Subir BCRYPT_COST só vale para senha nova — quem já tem conta continuaria com
 * o hash fraco para sempre. Como a senha em claro só existe durante o login, é
 * ali (e só ali) que dá para regravar mais forte, sem pedir nada ao usuário.
 *
 * Formato: `$2b$<custo>$<salt+hash>`.
 */
export function precisaRehash(hash: string): boolean {
  const custo = Number(hash?.split("$")[2]);
  return Number.isFinite(custo) && custo < BCRYPT_COST;
}
