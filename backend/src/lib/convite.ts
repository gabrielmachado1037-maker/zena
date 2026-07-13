import crypto from "crypto";

// Convite de vínculo INDIVIDUAL por paciente (uso único).
// Só a nutricionista gera; o paciente apenas consome uma vez no cadastro.

// Charset sem caracteres ambíguos (sem I, O, 0, 1) — legível ao digitar/ditar.
const CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const TAMANHO = 8;

// Dias até o convite pendente expirar automaticamente.
export const CONVITE_TTL_DIAS = 30;

/** Gera um código de convite de 8 caracteres (alfanumérico, sem ambíguos). */
export function gerarCodigoConvite(): string {
  let out = "";
  for (let i = 0; i < TAMANHO; i++) out += CHARSET[crypto.randomInt(CHARSET.length)];
  return out;
}

/** Data de expiração padrão a partir de agora. */
export function conviteExpiraEm(): Date {
  return new Date(Date.now() + CONVITE_TTL_DIAS * 24 * 60 * 60 * 1000);
}

/** Normaliza o código informado (uppercase, só chars válidos). */
export function normalizarCodigo(v: unknown): string {
  return String(v ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/** Últimos 4 dígitos de um telefone (ignora máscara). "" se tiver menos de 4. */
export function ultimos4Telefone(tel: string | null | undefined): string {
  const d = String(tel ?? "").replace(/\D/g, "");
  return d.length >= 4 ? d.slice(-4) : "";
}
