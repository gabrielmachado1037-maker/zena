import prisma from "../lib/prisma";
import { NotificationEngine } from "./notificationEngine";

// Notificações agendadas de engajamento (Fase 3): reativação (paciente sumido) e
// positivas (boa evolução, limitadas). Ambas passam pelo NotificationEngine.
// Base legal = consentimento (LGPD): o titular pode revogá-lo pela pref
// "engajamento" (o engine para o envio); seguem respeitando quiet-hours/dedup.

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
      ...marco, destination: "dashboard_paciente",
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
      ...msg, destination: "evolucao_paciente", dedupeKey: `positiva:${semanaKey}`,
    });
  }
}

/**
 * Marketplace de parceiros: avisa o paciente quando faltam ~5 dias para o acesso
 * de 30 dias vencer. Transacional (não é engajamento): não é gated por preferência
 * — só respeita quiet-hours e o dedupe (dispara 1x por consulta). Roda no cron diário.
 */
export async function avisarParceriaExpirando(): Promise<void> {
  const agora = Date.now();
  const em5d = new Date(agora + 5 * DIA);

  // Janela "≤ 5 dias" (não uma faixa de 24h): se o cron pular um dia, o aviso ainda
  // sai no dia seguinte. O dedupeKey (por consulta) garante exatamente 1 envio.
  const consultas = await prisma.consultaParceria.findMany({
    where: {
      status: "ativo",
      expiraEm: { gt: new Date(agora), lte: em5d },
      paciente: { anonimizadoEm: null, pushSubscriptionsPaciente: { some: {} } },
    },
    select: { id: true, pacienteId: true, expiraEm: true, parceiro: { select: { nome: true } } },
  });

  for (const c of consultas) {
    const dias = Math.max(1, Math.ceil((c.expiraEm!.getTime() - agora) / DIA));
    await NotificationEngine.enviar(c.pacienteId, "parceria_expira", {
      titulo: `⏳ Seu acesso vence em ${dias} ${dias === 1 ? "dia" : "dias"}`,
      corpo: `Faltam ${dias} ${dias === 1 ? "dia" : "dias"} no seu acesso a ${c.parceiro.nome}. Renove para não perder o acompanhamento.`,
      destination: "parceria",
      dedupeKey: `acesso_expira:${c.id}`,
    });
  }
}

/**
 * Acesso B2B: avisa o paciente ~5 dias antes de a janela definida pela nutri
 * (`acessoExpiraEm`) vencer. Transacional (só quiet-hours + dedupe). O paciente
 * não renova sozinho — o texto pede para falar com a nutri.
 */
export async function avisarAcessoB2bExpirando(): Promise<void> {
  const agora = Date.now();
  const em5d = new Date(agora + 5 * DIA);

  // Janela "≤ 5 dias" auto-curável (ver avisarParceriaExpirando). O dedupeKey inclui a
  // data de vencimento: se a nutri ESTENDER o prazo e ele voltar a se aproximar, um
  // novo aviso é permitido (chave diferente).
  const pacientes = await prisma.paciente.findMany({
    where: {
      ativo: true, anonimizadoEm: null,
      acessoExpiraEm: { gt: new Date(agora), lte: em5d },
      pushSubscriptionsPaciente: { some: {} },
    },
    select: { id: true, acessoExpiraEm: true },
  });

  for (const p of pacientes) {
    const dias = Math.max(1, Math.ceil((p.acessoExpiraEm!.getTime() - agora) / DIA));
    await NotificationEngine.enviar(p.id, "acesso_b2b_expira", {
      titulo: `⏳ Seu acesso vence em ${dias} ${dias === 1 ? "dia" : "dias"}`,
      corpo: "Fale com seu nutricionista para renovar e não perder seu acompanhamento.",
      destination: "dashboard_paciente",
      dedupeKey: `acesso_b2b:${p.id}:${ymd(p.acessoExpiraEm!)}`,
    });
  }
}
