import cron from "node-cron";
import prisma from "./lib/prisma";

export function initCron() {
  // Daily at 8am: create reminders for consultations in the next 24h
  cron.schedule("0 8 * * *", async () => {
    try {
      const now = new Date();
      const em24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const consultas = await prisma.consulta.findMany({
        where: { data: { gte: now, lte: em24h }, status: "agendada" },
        include: { paciente: true },
      });
      for (const c of consultas) {
        const jaExiste = await prisma.lembrete.findFirst({
          where: { referencia: c.id, tipo: "consulta_24h" },
        });
        if (!jaExiste) {
          await prisma.lembrete.create({
            data: {
              nutricionistaId: c.paciente.nutricionistaId,
              pacienteId: c.pacienteId,
              tipo: "consulta_24h",
              referencia: c.id,
            },
          });
        }
      }
    } catch (e) {
      console.error("Cron consulta_24h error:", e);
    }
  });

  // Every Monday at 8am: create weekly check-in reminders for active patients
  cron.schedule("0 8 * * 1", async () => {
    try {
      const pacientes = await prisma.paciente.findMany({ where: { ativo: true } });
      for (const p of pacientes) {
        const hoje = new Date();
        const inicioSemana = new Date(hoje);
        inicioSemana.setHours(0, 0, 0, 0);
        const jaExiste = await prisma.lembrete.findFirst({
          where: {
            pacienteId: p.id,
            tipo: "checkin_semanal",
            criadoEm: { gte: inicioSemana },
          },
        });
        if (!jaExiste) {
          await prisma.lembrete.create({
            data: {
              nutricionistaId: p.nutricionistaId,
              pacienteId: p.id,
              tipo: "checkin_semanal",
            },
          });
        }
      }
    } catch (e) {
      console.error("Cron checkin_semanal error:", e);
    }
  });

  // Daily at 9am: create reminders for overdue payments
  cron.schedule("0 9 * * *", async () => {
    try {
      const hoje = new Date();
      const inicioDia = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
      const fimDia = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 23, 59, 59);
      const cobrancas = await prisma.cobranca.findMany({
        where: { vencimento: { gte: inicioDia, lte: fimDia }, status: "pendente" },
        include: { paciente: true },
      });
      for (const c of cobrancas) {
        const jaExiste = await prisma.lembrete.findFirst({
          where: { referencia: c.id, tipo: "cobranca_vencida" },
        });
        if (!jaExiste) {
          await prisma.lembrete.create({
            data: {
              nutricionistaId: c.paciente.nutricionistaId,
              pacienteId: c.pacienteId,
              tipo: "cobranca_vencida",
              referencia: c.id,
            },
          });
        }
      }
    } catch (e) {
      console.error("Cron cobranca_vencida error:", e);
    }
  });
}
