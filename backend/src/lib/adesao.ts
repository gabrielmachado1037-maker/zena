/**
 * Score de aderência de check-in (0–100): check-ins do paciente nos últimos 30
 * dias ÷ 30. FONTE ÚNICA — usada pelo Dashboard (routes/dashboard.ts) e pela
 * lista de Pacientes (routes/pacientes.ts) para que o número seja idêntico nas
 * duas telas. Não é um cálculo novo: extraído do que o Dashboard já fazia.
 */
export function scoreAderencia30(checkins30dias: number): number {
  return Math.round(Math.min((checkins30dias || 0) / 30, 1) * 100);
}
