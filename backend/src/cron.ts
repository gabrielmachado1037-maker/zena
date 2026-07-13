import cron from "node-cron";
import prisma from "./lib/prisma";
import { emailTrialExpirando } from "./lib/email";
import { enviarNotificacao, enviarNotificacaoPaciente } from "./routes/notificacoes";
import { calcularProgressoCiclo, encerrarCiclo, notificarAquecimento, notificarUltimasHoras } from "./services/cicloService";
import { finalizarDesafiosVencidos } from "./services/desafioService";
import { enviarLembretesHabito } from "./services/lembretesHabito";
import { enviarReativacao, enviarPositivas } from "./services/notificacoesAgendadas";
import {
  calcularLiga,
  DIAS_ATE_CONGELAR,
  DIAS_ATE_PENALIZAR,
  PENALIDADE_INATIVIDADE_POR_DIA,
  PENALIDADE_INATIVIDADE_MAXIMA,
} from "./config/ligas";

const TZ = { timezone: "America/Sao_Paulo" };

export function initCron() {
  // Daily at 8am BRT: create reminders for consultations in the next 24h
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
  }, TZ);

  // Every Monday at 8am BRT: create weekly check-in reminders for active patients
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
  }, TZ);

  // Daily at 10am BRT: send trial expiring email (3 days before)
  cron.schedule("0 10 * * *", async () => {
    try {
      const em3dias = new Date();
      em3dias.setDate(em3dias.getDate() + 3);
      const inicio = new Date(em3dias.getFullYear(), em3dias.getMonth(), em3dias.getDate(), 0, 0, 0);
      const fim = new Date(em3dias.getFullYear(), em3dias.getMonth(), em3dias.getDate(), 23, 59, 59);
      const nutris = await prisma.nutricionista.findMany({
        where: { plano: "trial", trialEnd: { gte: inicio, lte: fim } },
      });
      for (const n of nutris) {
        emailTrialExpirando(n.nome, n.email, 3).catch(console.error);
      }
    } catch (e) {
      console.error("Cron trial_expirando error:", e);
    }
  }, TZ);

  // Daily at 6am BRT: expira trials vencidos (deixa o estado verdadeiro no banco).
  cron.schedule("0 6 * * *", async () => {
    try {
      const agora = new Date();
      const { count } = await prisma.nutricionista.updateMany({
        where: { subscriptionStatus: "trial", trialEnd: { lt: agora } },
        data: { subscriptionStatus: "expirado", planoAtivo: false },
      });
      if (count > 0) console.log(`[cron] ${count} trial(s) expirado(s).`);
    } catch (e) {
      console.error("Cron trial_expirado error:", e);
    }
  }, TZ);

  // Daily at 8:30am BRT: generate monthly charges from payment plans
  cron.schedule("30 8 * * *", async () => {
    try {
      const hoje = new Date();
      const diaHoje = hoje.getDate();
      const planos = await prisma.planoCobranca.findMany({
        where: { ativo: true },
        include: { paciente: true },
      });
      for (const plano of planos) {
        if (plano.diaVencimento !== diaHoje) continue;
        const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        const jaExiste = await prisma.cobranca.findFirst({
          where: { pacienteId: plano.pacienteId, vencimento: { gte: inicioMes }, status: { not: "cancelada" } },
        });
        if (!jaExiste) {
          const vencimento = new Date(hoje.getFullYear(), hoje.getMonth(), plano.diaVencimento);
          await prisma.cobranca.create({
            data: {
              pacienteId: plano.pacienteId,
              valor: plano.valor,
              vencimento,
              metodo: "pix",
              descricao: `Mensalidade ${hoje.toLocaleString("pt-BR", { month: "long" })}`,
            },
          });
        }
      }
    } catch (e) {
      console.error("Cron plano_cobranca error:", e);
    }
  }, TZ);

  // Every Monday at 9am BRT: weekly ranking push reminder
  cron.schedule("0 9 * * 1", async () => {
    try {
      const nutris = await prisma.nutricionista.findMany({
        where: { planoAtivo: true },
        select: { id: true },
      });
      for (const n of nutris) {
        enviarNotificacao(
          n.id,
          "Placar da semana 🏆",
          "Veja como seus pacientes estão no ranking esta semana!",
          "/app/ranking"
        ).catch(console.error);
      }
    } catch (e) {
      console.error("Cron ranking_push error:", e);
    }
  }, TZ);

  // Daily at 7am BRT: block Nexvel subscriptions overdue by more than 3 days
  cron.schedule("0 7 * * *", async () => {
    try {
      const tresAtraso = new Date();
      tresAtraso.setDate(tresAtraso.getDate() - 3);
      await prisma.nutricionista.updateMany({
        where: {
          planoAtivo: true,
          planoVencimento: { lt: tresAtraso },
          plano: { in: ["mensal", "anual"] },
        },
        data: { planoAtivo: false },
      });
    } catch (e) {
      console.error("Cron assinatura_vencida error:", e);
    }
  }, TZ);

  // Daily at 00:01 BRT: gerenciar ciclos (status + encerramento)
  cron.schedule("1 0 * * *", async () => {
    try {
      const ciclosAtivos = await prisma.ciclo.findMany({
        where: { status: { in: ["ativo", "aquecimento"] } },
      });
      for (const ciclo of ciclosAtivos) {
        const { diasRestantes } = calcularProgressoCiclo(ciclo);
        if (diasRestantes === 3 && ciclo.status === "ativo") {
          await prisma.ciclo.update({ where: { id: ciclo.id }, data: { status: "aquecimento" } });
          await notificarAquecimento(ciclo);
        }
        if (diasRestantes === 1) {
          await notificarUltimasHoras(ciclo);
        }
        if (diasRestantes <= 0) {
          await encerrarCiclo(ciclo.id);
        }
      }
    } catch (e) {
      console.error("Cron ciclos error:", e);
    }
  }, TZ);

  // Daily at 00:02 BRT: finalizar desafios cujo período terminou (credita XP + medalha).
  cron.schedule("2 0 * * *", async () => {
    try {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      await finalizarDesafiosVencidos(hoje);
    } catch (e) {
      console.error("Cron desafios error:", e);
    }
  }, TZ);

  // Daily at 00:01 BRT: processar inatividade do Sistema de Ligas
  cron.schedule("1 0 * * *", async () => {
    try {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const ontem = new Date(hoje);
      ontem.setDate(ontem.getDate() - 1);

      const pacientes = await prisma.paciente.findMany({ where: { ativo: true } });
      for (const p of pacientes) {
        const registrouOntem =
          p.ultimoCheckin && new Date(p.ultimoCheckin).getTime() === ontem.getTime();
        if (registrouOntem) continue;

        const diasInativo = p.diasInativo + 1;
        const data: {
          diasInativo: number;
          streakAtual?: number;
          barraCongelada?: boolean;
          pontosTotal?: number;
          ligaAtual?: string;
          ligaNivel?: string;
        } = { diasInativo };

        if (diasInativo >= 2) data.streakAtual = 0;
        if (diasInativo >= DIAS_ATE_CONGELAR) data.barraCongelada = true;

        if (diasInativo > DIAS_ATE_PENALIZAR) {
          const diasPenalizados = diasInativo - DIAS_ATE_PENALIZAR;
          if (diasPenalizados * PENALIDADE_INATIVIDADE_POR_DIA <= PENALIDADE_INATIVIDADE_MAXIMA) {
            const novoTotal = Math.max(0, p.pontosTotal - PENALIDADE_INATIVIDADE_POR_DIA);
            data.pontosTotal = novoTotal;
            const liga = calcularLiga(novoTotal);
            data.ligaAtual = liga.liga;
            data.ligaNivel = liga.nivel;
          }
        }

        await prisma.paciente.update({ where: { id: p.id }, data });
      }
    } catch (e) {
      console.error("Cron inatividade_ligas error:", e);
    }
  }, TZ);

  // Daily at 20:00 BRT: lembrete de checklist para quem não fez
  cron.schedule("0 20 * * *", async () => {
    try {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const ontem = new Date(hoje);
      ontem.setDate(ontem.getDate() - 1);

      const ciclosAtivos = await prisma.ciclo.findMany({
        where: { status: { in: ["ativo", "aquecimento"] } },
        include: { participantes: { select: { pacienteId: true } } },
      });

      for (const ciclo of ciclosAtivos) {
        for (const p of ciclo.participantes) {
          const fez = await prisma.checklistDiario.findUnique({
            where: { pacienteId_data: { pacienteId: p.pacienteId, data: hoje } },
          });
          if (!fez) {
            const temStreak = await prisma.checklistDiario.findUnique({
              where: { pacienteId_data: { pacienteId: p.pacienteId, data: ontem } },
            });
            const titulo = temStreak ? "🔥 Não esqueça seu check-in!" : "📋 Check-in de hoje";
            const corpo = temStreak
              ? "Sua sequência está em risco. Faça o check-in antes da meia-noite."
              : "Registre suas conquistas de hoje no Nexvel!";
            enviarNotificacaoPaciente(p.pacienteId, titulo, corpo, "/paciente/feed").catch(console.error);
          }
        }
      }
    } catch (e) {
      console.error("Cron checklist_reminder error:", e);
    }
  }, TZ);

  // Lembretes de hábito (Fase 2) — horários padrão BRT; só notifica quem não registrou.
  const agendarHabito = (expr: string, tipo: Parameters<typeof enviarLembretesHabito>[0]) =>
    cron.schedule(expr, () => {
      enviarLembretesHabito(tipo).catch((e) => console.error(`Cron lembrete ${tipo} error:`, e));
    }, TZ);
  agendarHabito("0 9 * * *",  "cafe");
  agendarHabito("0 13 * * *", "almoco");
  agendarHabito("0 16 * * *", "lanche");
  agendarHabito("30 17 * * *", "agua");
  agendarHabito("30 18 * * *", "treino");
  agendarHabito("30 20 * * *", "jantar");
  agendarHabito("30 21 * * *", "sono");

  // Reativação (Fase 3): diária às 10h BRT — paciente sem abrir há 2/5/7 dias.
  cron.schedule("0 10 * * *", () => {
    enviarReativacao().catch((e) => console.error("Cron reativacao error:", e));
  }, TZ);

  // Positivas (Fase 3): semanal, segunda 11h BRT — só quando há evolução real.
  cron.schedule("0 11 * * 1", () => {
    enviarPositivas().catch((e) => console.error("Cron positivas error:", e));
  }, TZ);

  // Daily at 9am BRT: create reminders for overdue payments
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
  }, TZ);
}
