// Config central do sistema de Desafios (fonte única de verdade). PRD Nexvel.
// Durações permitidas, recompensa (só na conclusão), aderência mínima e limite de ativos.

export const DURACOES_DESAFIO = [7, 14, 21] as const;
export type DuracaoDesafio = (typeof DURACOES_DESAFIO)[number];

// Recompensa em XP — entregue SOMENTE ao concluir o desafio (nunca diária).
export const RECOMPENSA_XP: Record<number, number> = { 7: 5, 14: 10, 21: 15 };

// Aderência mínima (dias cumpridos) para concluir e receber a recompensa.
export const ADESAO_MINIMA: Record<number, number> = { 7: 6, 14: 12, 21: 18 };

// Máximo de desafios ativos simultâneos por paciente.
export const MAX_DESAFIOS_ATIVOS = 2;

export function duracaoValida(d: unknown): d is DuracaoDesafio {
  return typeof d === "number" && (DURACOES_DESAFIO as readonly number[]).includes(d);
}
export const recompensaDe = (dur: number): number => RECOMPENSA_XP[dur] ?? 0;
export const adesaoMinimaDe = (dur: number): number => ADESAO_MINIMA[dur] ?? dur;

/**
 * Um dia "cumprido" do desafio depende do tipo — reusa as flags já gravadas no
 * Registro ao fechar o dia. "custom" = basta o paciente ter fechado o dia.
 */
export function diaCumpreDesafio(
  tipo: string,
  reg: { alimentacaoOk: boolean; treinoOk: boolean; aguaOk: boolean; sonoOk: boolean },
): boolean {
  switch (tipo) {
    case "alimentacao": return reg.alimentacaoOk;
    case "treino": return reg.treinoOk;
    case "hidratacao": return reg.aguaOk;
    case "sono": return reg.sonoOk;
    default: return true; // custom → fechar o dia já conta
  }
}
