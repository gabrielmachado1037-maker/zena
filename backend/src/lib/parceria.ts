import prisma from "./prisma";
import { scoreAderencia30 } from "./adesao";

// ─────────────────────────────────────────────────────────────────────────────
// Regras de negócio do Marketplace de Nutricionistas Parceiros.
// Feature isolada: NÃO toca no fluxo B2B (billing.ts / Nutricionista).
// ─────────────────────────────────────────────────────────────────────────────

export const PRECO_CONSULTA = 200;   // R$ — valor fixo da consulta
export const VALOR_PARCEIRO = 150;   // R$ — split para a wallet do parceiro
export const VALOR_PLATAFORMA = 50;  // R$ — retido pela plataforma
export const DIAS_ACESSO = 30;       // dias de acesso liberados após o pagamento

// Prefixo do externalReference no Asaas: distingue pagamentos do marketplace dos
// pagamentos B2B (assinatura da nutri) que compartilham o mesmo webhook.
export const REF_PREFIX = "mkt:";

const DIA_MS = 24 * 60 * 60 * 1000;

/** Link único da videochamada da consulta (Jitsi) — mesmo para paciente e parceiro. */
export function jitsiUrl(room: string): string {
  return `https://meet.jit.si/${room}`;
}

export function diasRestantes(expiraEm: Date | null | undefined): number {
  if (!expiraEm) return 0;
  return Math.max(0, Math.ceil((expiraEm.getTime() - Date.now()) / DIA_MS));
}

/**
 * Fecha (status → "expirado") todas as consultas cujo acesso já venceu.
 * Idempotente. Chamada pelo cron diário e, defensivamente, pelo gate de acesso.
 */
export async function expirarVencidas(): Promise<number> {
  const r = await prisma.consultaParceria.updateMany({
    where: { status: "ativo", expiraEm: { lte: new Date() } },
    data: { status: "expirado" },
  });
  return r.count;
}

/**
 * Consulta com acesso ATIVO do paciente (status "ativo" e ainda dentro da janela).
 * Expira preguiçosamente qualquer registro vencido antes de decidir.
 */
export async function acessoAtivo(pacienteId: string) {
  const agora = new Date();
  // Fecha vencidas deste paciente (barato e mantém o estado consistente sem depender do cron).
  await prisma.consultaParceria.updateMany({
    where: { pacienteId, status: "ativo", expiraEm: { lte: agora } },
    data: { status: "expirado" },
  });
  return prisma.consultaParceria.findFirst({
    where: { pacienteId, status: "ativo", expiraEm: { gt: agora } },
    include: { parceiro: true },
    orderBy: { expiraEm: "desc" },
  });
}

/**
 * Ativa uma consulta paga: abre a janela de 30 dias e garante a regra
 * "um acesso ativo por vez" — qualquer outro acesso ativo do paciente é encerrado.
 * Idempotente: se já estiver ativa, não reabre a janela.
 */
export async function ativarConsulta(consultaId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const consulta = await tx.consultaParceria.findUnique({ where: { id: consultaId } });
    if (!consulta) return;
    if (consulta.status === "ativo") return; // idempotência: webhook + poll não reabrem a janela

    const agora = new Date();
    const expira = new Date(agora.getTime() + DIAS_ACESSO * DIA_MS);

    // Regra: só um acesso ativo por paciente. Encerra os demais ativos.
    await tx.consultaParceria.updateMany({
      where: { pacienteId: consulta.pacienteId, status: "ativo", id: { not: consultaId } },
      data: { status: "expirado" },
    });

    await tx.consultaParceria.update({
      where: { id: consultaId },
      data: { status: "ativo", iniciaEm: agora, expiraEm: expira, pagoEm: agora },
    });

    // Agenda automática (sem hora marcada): assim que ativa, a consulta por vídeo
    // já nasce como a PRIMEIRA mensagem da conversa — os dois lados veem o mesmo
    // link no chat, sem botão separado. Roda 1x (a ativação é idempotente).
    await tx.mensagemParceria.create({
      data: {
        consultaId,
        autor: "sistema",
        conteudo: `🎥 Sua consulta por vídeo está liberada! Entrem por este link a qualquer momento: ${jitsiUrl(consulta.videoRoom)}`,
      },
    });
  });
}

/**
 * Processa o webhook Asaas de um pagamento do marketplace (externalReference "mkt:<id>").
 * Só ativa em pagamento confirmado/recebido. Chamado por billing.ts.
 */
export async function processarWebhookParceria(event: string, consultaId: string): Promise<void> {
  if (event === "PAYMENT_CONFIRMED" || event === "PAYMENT_RECEIVED") {
    await ativarConsulta(consultaId);
  }
}

export interface LinhaRanking {
  pacienteId: string;
  nome: string;
  fotoPerfilUrl: string | null;
  score: number;      // 0–100 (% de aderência normalizada — comparável entre parceiros)
  checkins: number;   // check-ins nos últimos 30 dias
  streak: number;
  parceiroNome?: string;
}

// Conta check-ins finalizados dos últimos 30 dias por paciente, numa query só.
async function checkins30d(pacienteIds: string[]): Promise<Map<string, number>> {
  const mapa = new Map<string, number>();
  if (pacienteIds.length === 0) return mapa;
  const desde = new Date(Date.now() - 30 * DIA_MS);
  const grupos = await prisma.registro.groupBy({
    by: ["pacienteId"],
    where: { pacienteId: { in: pacienteIds }, finalizado: true, data: { gte: desde } },
    _count: { _all: true },
  });
  for (const g of grupos) mapa.set(g.pacienteId, g._count._all);
  return mapa;
}

function ordenar(linhas: LinhaRanking[]): LinhaRanking[] {
  // Score normalizado desc; empate desfeito por streak e nome (determinístico).
  return linhas.sort((a, b) => b.score - a.score || b.streak - a.streak || a.nome.localeCompare(b.nome));
}

/**
 * Ranking de UM parceiro: pacientes com acesso ativo a ele, ordenados pela
 * aderência NORMALIZADA (% de check-ins em 30d) — reaproveita scoreAderencia30.
 */
export async function rankingDoParceiro(parceiroId: string): Promise<LinhaRanking[]> {
  const consultas = await prisma.consultaParceria.findMany({
    where: { parceiroId, status: "ativo", expiraEm: { gt: new Date() } },
    select: { paciente: { select: { id: true, nome: true, fotoPerfilUrl: true, streakAtual: true } } },
  });
  const pacientes = consultas.map((c) => c.paciente);
  const counts = await checkins30d(pacientes.map((p) => p.id));
  const linhas: LinhaRanking[] = pacientes.map((p) => {
    const n = counts.get(p.id) ?? 0;
    return { pacienteId: p.id, nome: p.nome, fotoPerfilUrl: p.fotoPerfilUrl, score: scoreAderencia30(n), checkins: n, streak: p.streakAtual };
  });
  return ordenar(linhas);
}

/**
 * Ranking GLOBAL: soma os pacientes dos 3 parceiros num único ranking.
 * A comparação é pela % de aderência (normalizada) — não pelo XP bruto — para não
 * distorcer por um parceiro ter pacientes mais assíduos. Cada paciente aparece uma vez.
 */
export async function rankingGlobal(): Promise<LinhaRanking[]> {
  const consultas = await prisma.consultaParceria.findMany({
    where: { status: "ativo", expiraEm: { gt: new Date() } },
    select: {
      paciente: { select: { id: true, nome: true, fotoPerfilUrl: true, streakAtual: true } },
      parceiro: { select: { nome: true } },
    },
  });
  // Dedup por paciente (se por acaso houver mais de um ativo, mantém o primeiro).
  const porPaciente = new Map<string, { nome: string; fotoPerfilUrl: string | null; streak: number; parceiroNome: string }>();
  for (const c of consultas) {
    if (!porPaciente.has(c.paciente.id)) {
      porPaciente.set(c.paciente.id, {
        nome: c.paciente.nome,
        fotoPerfilUrl: c.paciente.fotoPerfilUrl,
        streak: c.paciente.streakAtual,
        parceiroNome: c.parceiro.nome,
      });
    }
  }
  const ids = [...porPaciente.keys()];
  const counts = await checkins30d(ids);
  const linhas: LinhaRanking[] = ids.map((id) => {
    const p = porPaciente.get(id)!;
    const n = counts.get(id) ?? 0;
    return { pacienteId: id, nome: p.nome, fotoPerfilUrl: p.fotoPerfilUrl, score: scoreAderencia30(n), checkins: n, streak: p.streak, parceiroNome: p.parceiroNome };
  });
  return ordenar(linhas);
}
