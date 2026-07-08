import prisma from "../lib/prisma";
import { calcularLiga } from "../config/ligas";
import { adesaoMinimaDe, diaCumpreDesafio } from "../config/desafios";

const DIA = 86_400_000;
const inicioDoDia = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

interface ProgComDesafio {
  id: string;
  pacienteId: string;
  concluido: boolean;
  encerradoEm: Date | null;
  desafio: {
    tipo: string;
    duracaoDias: number;
    dataInicio: Date | null;
    dataFim: Date | null;
    pontosBonus: number;
    titulo: string;
    icone: string;
  };
}

const SELECT_DESAFIO = {
  tipo: true, duracaoDias: true, dataInicio: true, dataFim: true,
  pontosBonus: true, titulo: true, icone: true,
} as const;

/** Conta os dias cumpridos (por tipo) na janela [inicio, fim) — só dias fechados. */
async function contarDiasCumpridos(pacienteId: string, tipo: string, inicio: Date, fim: Date): Promise<number> {
  const regs = await prisma.registro.findMany({
    where: { pacienteId, finalizado: true, data: { gte: inicioDoDia(inicio), lt: inicioDoDia(fim) } },
    select: { alimentacaoOk: true, treinoOk: true, aguaOk: true, sonoOk: true },
  });
  return regs.reduce((n, r) => n + (diaCumpreDesafio(tipo, r) ? 1 : 0), 0);
}

/**
 * Recalcula o progresso de um desafio e o finaliza quando o período termina.
 * Ao concluir (>= aderência mínima): credita XP + medalha + recalcula liga.
 * Idempotente: só age em progressos ativos (concluido=false, encerradoEm=null).
 */
async function processarProgresso(prog: ProgComDesafio, hoje: Date): Promise<void> {
  if (prog.concluido || prog.encerradoEm) return;
  const d = prog.desafio;
  if (!d.dataInicio) return; // sem janela definida, não processa

  const inicio = inicioDoDia(d.dataInicio);
  const fim = d.dataFim ? inicioDoDia(d.dataFim) : new Date(inicio.getTime() + d.duracaoDias * DIA);
  const dias = await contarDiasCumpridos(prog.pacienteId, d.tipo, inicio, fim);
  const pct = Math.min(100, Math.round((dias / d.duracaoDias) * 100));
  const janelaAcabou = inicioDoDia(hoje).getTime() >= fim.getTime();

  if (!janelaAcabou) {
    await prisma.desafioProgresso.update({ where: { id: prog.id }, data: { diasCumpridos: dias, progresso: pct } });
    return;
  }

  // Período terminou → finaliza (venceu ou não).
  const venceu = dias >= adesaoMinimaDe(d.duracaoDias);
  await prisma.desafioProgresso.update({
    where: { id: prog.id },
    data: { diasCumpridos: dias, progresso: pct, concluido: venceu, encerradoEm: hoje },
  });
  if (!venceu) return;

  // Recompensa: XP bônus + medalha + liga (transação).
  const pac = await prisma.paciente.findUnique({ where: { id: prog.pacienteId }, select: { pontosTotal: true } });
  if (!pac) return;
  const novoTotal = pac.pontosTotal + d.pontosBonus;
  const liga = calcularLiga(novoTotal);
  await prisma.$transaction([
    prisma.paciente.update({
      where: { id: prog.pacienteId },
      data: { pontosTotal: novoTotal, ligaAtual: liga.liga, ligaNivel: liga.nivel },
    }),
    prisma.conquista.create({
      data: {
        pacienteId: prog.pacienteId,
        tipo: "desafio_concluido",
        titulo: d.titulo,
        descricao: `Desafio concluído com ${dias} de ${d.duracaoDias} dias`,
        icone: d.icone || "🏅",
        pontosBonus: d.pontosBonus,
      },
    }),
  ]);
}

/** Processa os desafios ativos de um paciente (chamado ao fechar o dia). */
export async function processarDesafiosDoPaciente(pacienteId: string, hoje: Date): Promise<void> {
  const progressos = await prisma.desafioProgresso.findMany({
    where: { pacienteId, concluido: false, encerradoEm: null },
    select: { id: true, pacienteId: true, concluido: true, encerradoEm: true, desafio: { select: SELECT_DESAFIO } },
  });
  for (const p of progressos) {
    try { await processarProgresso(p as ProgComDesafio, hoje); }
    catch (e) { console.error("[desafio] processar paciente", p.id, e); }
  }
}

/** Finaliza desafios cujo período já terminou (cron diário) — pega quem não fechou o dia. */
export async function finalizarDesafiosVencidos(hoje: Date): Promise<void> {
  const progressos = await prisma.desafioProgresso.findMany({
    where: { concluido: false, encerradoEm: null, desafio: { dataFim: { lte: inicioDoDia(hoje) } } },
    select: { id: true, pacienteId: true, concluido: true, encerradoEm: true, desafio: { select: SELECT_DESAFIO } },
  });
  for (const p of progressos) {
    try { await processarProgresso(p as ProgComDesafio, hoje); }
    catch (e) { console.error("[desafio] finalizar vencido", p.id, e); }
  }
}

/** Conta desafios ativos (não encerrados) de um paciente — para o limite de 2 simultâneos. */
export async function contarDesafiosAtivos(pacienteId: string): Promise<number> {
  return prisma.desafioProgresso.count({ where: { pacienteId, concluido: false, encerradoEm: null } });
}
