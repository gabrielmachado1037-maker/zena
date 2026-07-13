import prisma from "../lib/prisma";

// Fase 4 — aprende o horário HABITUAL de engajamento de cada paciente (a partir de
// quando ele faz o check-in) e expõe um offset para deslocar os lembretes de hábito.
// Não dá pra aprender por-hábito (check-in é one-shot: todos gravam no mesmo instante),
// então o sinal é a hora do check-in (RegistroEvento tipo "checkin").

const TZ_PADRAO = "America/Sao_Paulo";
const MIN_AMOSTRA = 5;   // check-ins mínimos para personalizar
const JANELA = 30;       // últimos N check-ins
const HORA_REFERENCIA = 12;
const OFFSET_MAX = 3;

/** Hora (0-23) de uma data no fuso informado. */
export function horaLocalDe(date: Date, tz: string): number {
  try {
    const s = new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", hour12: false }).format(date);
    const h = parseInt(s, 10);
    return Number.isFinite(h) ? h % 24 : HORA_REFERENCIA;
  } catch {
    return HORA_REFERENCIA;
  }
}

/** Deslocamento (h) a aplicar aos horários padrão dos lembretes, a partir do aprendido. */
export function offsetDe(horarioLembrete: number | null | undefined): number {
  if (horarioLembrete == null) return 0;
  const raw = Math.round(horarioLembrete - HORA_REFERENCIA);
  return Math.max(-OFFSET_MAX, Math.min(OFFSET_MAX, raw));
}

/** Recalcula o horário habitual dos pacientes com push (roda de madrugada).
 *  pacienteIds (opcional) restringe o alvo — usado em testes. */
export async function recalcularHorariosPreferidos(pacienteIds?: string[]): Promise<void> {
  const pacientes = await prisma.paciente.findMany({
    where: {
      ativo: true, anonimizadoEm: null, pushSubscriptionsPaciente: { some: {} },
      ...(pacienteIds ? { id: { in: pacienteIds } } : {}),
    },
    select: { id: true, timezone: true, horarioLembrete: true },
  });

  for (const p of pacientes) {
    const eventos = await prisma.registroEvento.findMany({
      where: { pacienteId: p.id, tipo: "checkin" },
      orderBy: { ocorridoEm: "desc" }, take: JANELA, select: { ocorridoEm: true },
    });

    let novo: number | null = null;
    if (eventos.length >= MIN_AMOSTRA) {
      const horas = eventos.map((e) => horaLocalDe(e.ocorridoEm, p.timezone || TZ_PADRAO)).sort((a, b) => a - b);
      novo = horas[Math.floor(horas.length / 2)]; // mediana
    }
    if (novo !== p.horarioLembrete) {
      await prisma.paciente.update({ where: { id: p.id }, data: { horarioLembrete: novo } }).catch(() => {});
    }
  }
}
