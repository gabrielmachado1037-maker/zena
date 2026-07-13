import prisma from "../lib/prisma";
import { resolverPlanoRefeicoes, resolverAguaMetaMl, ehDiaDeTreino } from "../config/ligas";
import { NotificationEngine } from "./notificationEngine";

// Lembretes agendados de hábito (Fase 2). Só notifica quem AINDA NÃO registrou o
// hábito hoje — "cancelar ao registrar" é implícito (checa o estado antes de enviar).
// Horários padrão (BRT) são disparados pelo cron; o engine cuida de preferência,
// quiet-hours (fuso do paciente), dedup e intervalo mínimo.

export type HabitoTipo = "cafe" | "almoco" | "lanche" | "jantar" | "agua" | "treino" | "sono";
const REFEICOES: HabitoTipo[] = ["cafe", "almoco", "lanche", "jantar"];

const MSG: Record<HabitoTipo, { titulo: string; corpo: string }> = {
  cafe:   { titulo: "🍽️ Café da manhã", corpo: "Hora de registrar sua refeição." },
  almoco: { titulo: "🍽️ Almoço", corpo: "Hora de registrar sua refeição." },
  lanche: { titulo: "🍽️ Lanche da tarde", corpo: "Hora de registrar sua refeição." },
  jantar: { titulo: "🍽️ Jantar", corpo: "Hora de registrar sua refeição." },
  agua:   { titulo: "💧 Hidratação", corpo: "Falta pouco para completar sua hidratação." },
  treino: { titulo: "💪 Treino de hoje", corpo: "Seu treino de hoje está esperando por você." },
  sono:   { titulo: "😴 Antes de dormir", corpo: "Antes de descansar, registre como foi seu dia." },
};

// tipo do hábito → tipo no engine (para o gate de categoria).
const TIPO_ENGINE: Record<HabitoTipo, string> = {
  cafe: "refeicao", almoco: "refeicao", lanche: "refeicao", jantar: "refeicao",
  agua: "agua", treino: "treino", sono: "sono",
};

function inicioDeHoje(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

type RegHoje = {
  finalizado: boolean;
  cafeOk: boolean | null; almocoOk: boolean | null; lancheOk: boolean | null; jantarOk: boolean | null;
  aguaMl: number | null; aguaMetaMl: number | null;
  treinoOk: boolean; treinoStatus: string | null;
  sonoFaixa: string | null; sonoHoras: number | null;
};

// Já registrou este hábito hoje? (dia fechado = tudo registrado)
function jaRegistrou(tipo: HabitoTipo, reg: RegHoje | undefined, metaMl: number): boolean {
  if (!reg) return false;
  if (reg.finalizado) return true;
  switch (tipo) {
    case "cafe":   return reg.cafeOk != null;
    case "almoco": return reg.almocoOk != null;
    case "lanche": return reg.lancheOk != null;
    case "jantar": return reg.jantarOk != null;
    case "agua":   return reg.aguaMl != null && reg.aguaMl >= metaMl;
    case "treino": return reg.treinoStatus != null || reg.treinoOk === true;
    case "sono":   return reg.sonoFaixa != null || reg.sonoHoras != null;
  }
}

/** Dispara o lembrete de um hábito para quem ainda não registrou hoje.
 *  pacienteIds (opcional) restringe o alvo — usado para reenvio pontual/testes. */
export async function enviarLembretesHabito(tipo: HabitoTipo, pacienteIds?: string[]): Promise<void> {
  const hoje = inicioDeHoje();
  const dia = ymd(hoje);
  const diaSemana = hoje.getDay();

  const pacientes = await prisma.paciente.findMany({
    where: {
      ativo: true, anonimizadoEm: null, pushSubscriptionsPaciente: { some: {} },
      ...(pacienteIds ? { id: { in: pacienteIds } } : {}),
    },
    select: {
      id: true, planoRefeicoes: true, aguaMetaMl: true, treinoDias: true,
      registros: {
        where: { data: hoje }, take: 1,
        select: {
          finalizado: true, cafeOk: true, almocoOk: true, lancheOk: true, jantarOk: true,
          aguaMl: true, aguaMetaMl: true, treinoOk: true, treinoStatus: true, sonoFaixa: true, sonoHoras: true,
        },
      },
    },
  });

  for (const p of pacientes) {
    // Refeição precisa estar no plano do paciente.
    if (REFEICOES.includes(tipo)) {
      const noPlano = resolverPlanoRefeicoes(p.planoRefeicoes).some((r) => r.key === tipo);
      if (!noPlano) continue;
    }
    // Treino só em dia de treino.
    if (tipo === "treino" && !ehDiaDeTreino(p.treinoDias, diaSemana)) continue;

    const metaMl = resolverAguaMetaMl(p.aguaMetaMl);
    if (jaRegistrou(tipo, p.registros[0] as RegHoje | undefined, metaMl)) continue;

    await NotificationEngine.enviar(p.id, TIPO_ENGINE[tipo], {
      ...MSG[tipo],
      url: "/paciente/registro",
      dedupeKey: `habito:${tipo}:${dia}`,
      minIntervalMin: 60,
    });
  }
}
