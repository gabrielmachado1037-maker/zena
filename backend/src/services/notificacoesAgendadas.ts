import prisma from "../lib/prisma";
import { NotificationEngine } from "./notificationEngine";

// Notificações agendadas de engajamento (Fase 3): reativação (paciente sumido) e
// positivas (boa evolução, limitadas). Ambas passam pelo NotificationEngine.
// Os tipos "reativacao"/"positiva" NÃO estão no mapa de categorias do engine →
// não são desligáveis pelos 9 toggles (retenção), mas respeitam quiet-hours/dedup.

const DIA = 24 * 60 * 60 * 1000;

function meiaNoite(d: Date): Date { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const MARCOS_REATIVACAO: Record<number, { titulo: string; corpo: string }> = {
  2: { titulo: "👋 Sentimos sua falta", corpo: "Que tal voltar e continuar sua evolução?" },
  5: { titulo: "✨ Sua evolução espera por você", corpo: "Sua evolução continua esperando por você." },
  7: { titulo: "💚 Bora retomar", corpo: "Volte hoje e retome sua sequência." },
};

/** Reativação: paciente sem ABRIR o app há 2, 5 ou 7 dias (base: ultimoAcesso). */
export async function enviarReativacao(pacienteIds?: string[]): Promise<void> {
  const hoje = meiaNoite(new Date());
  const pacientes = await prisma.paciente.findMany({
    where: {
      ativo: true, anonimizadoEm: null, ultimoAcesso: { not: null },
      pushSubscriptionsPaciente: { some: {} },
      ...(pacienteIds ? { id: { in: pacienteIds } } : {}),
    },
    select: { id: true, ultimoAcesso: true },
  });

  for (const p of pacientes) {
    if (!p.ultimoAcesso) continue;
    const dias = Math.round((hoje.getTime() - meiaNoite(p.ultimoAcesso).getTime()) / DIA);
    const marco = MARCOS_REATIVACAO[dias];
    if (!marco) continue;
    await NotificationEngine.enviar(p.id, "reativacao", {
      ...marco, url: "/paciente/dashboard",
      dedupeKey: `reativacao:${dias}:${ymd(p.ultimoAcesso)}`,
    });
  }
}

/** Positivas: 1 por semana, só quando há evolução/consistência real (sem excesso). */
export async function enviarPositivas(pacienteIds?: string[]): Promise<void> {
  const hoje = meiaNoite(new Date());
  const ini7 = new Date(hoje.getTime() - 7 * DIA);
  const ini14 = new Date(hoje.getTime() - 14 * DIA);
  const semanaKey = ymd(hoje);

  const pacientes = await prisma.paciente.findMany({
    where: {
      ativo: true, anonimizadoEm: null, pushSubscriptionsPaciente: { some: {} },
      ...(pacienteIds ? { id: { in: pacienteIds } } : {}),
    },
    select: { id: true },
  });

  for (const p of pacientes) {
    const [estaSemana, semanaAnterior] = await Promise.all([
      prisma.registro.count({ where: { pacienteId: p.id, finalizado: true, data: { gte: ini7, lt: hoje } } }),
      prisma.registro.count({ where: { pacienteId: p.id, finalizado: true, data: { gte: ini14, lt: ini7 } } }),
    ]);

    let msg: { titulo: string; corpo: string } | null = null;
    if (estaSemana >= 6) msg = { titulo: "👏 Excelente consistência", corpo: "Você registrou quase todos os dias desta semana!" };
    else if (estaSemana >= 3 && estaSemana > semanaAnterior) msg = { titulo: "🎉 Você evoluiu!", corpo: "Você evoluiu mais do que na semana passada. Continue assim 🚀" };
    if (!msg) continue;

    await NotificationEngine.enviar(p.id, "positiva", {
      ...msg, url: "/paciente/evolucao", dedupeKey: `positiva:${semanaKey}`,
    });
  }
}
