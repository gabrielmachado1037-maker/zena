import prisma from "../lib/prisma";
import { calcularLiga } from "../config/ligas";
import { adesaoMinimaDe, recompensaDe, diaCumpreDesafio } from "../config/desafios";
import { enviarNotificacao } from "../routes/notificacoes";
import { NotificationEngine } from "./notificationEngine";

const DIA = 86_400_000;
const inicioDoDia = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

/** yyyy-mm-dd no horário local do servidor (mesma convenção de inicioDoDia). */
export const ymdLocal = (d: Date): string => {
  const x = inicioDoDia(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
};

const TIPOS_AUTO = ["hidratacao", "alimentacao", "treino", "sono"];
/** Desafio "manual" = não detectável pelos registros (suplemento, meditar, etc.). */
export const ehCustom = (tipo: string): boolean => !TIPOS_AUTO.includes(tipo);

interface JanelaDesafio { inicio: Date; fim: Date }
/** Janela [inicio, fim) do desafio; null se sem dataInicio (não processável). */
export function janelaDesafio(d: { duracaoDias: number; dataInicio: Date | null; dataFim: Date | null }): JanelaDesafio | null {
  if (!d.dataInicio) return null;
  const inicio = inicioDoDia(d.dataInicio);
  const fim = d.dataFim ? inicioDoDia(d.dataFim) : new Date(inicio.getTime() + d.duracaoDias * DIA);
  return { inicio, fim };
}

interface ProgComDesafio {
  id: string;
  pacienteId: string;
  concluido: boolean;
  encerradoEm: Date | null;
  diasManuais: string[];
  desafio: {
    id: string;
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
  id: true, tipo: true, duracaoDias: true, dataInicio: true, dataFim: true,
  pontosBonus: true, titulo: true, icone: true,
} as const;

const noPeriodo = (s: string, inicio: Date, fim: Date): boolean => {
  const dt = inicioDoDia(new Date(s + "T00:00:00"));
  return dt >= inicio && dt < fim;
};

/**
 * Conta os dias CONFIRMADOS manualmente na janela [inicio, fim).
 * A conclusão é sempre manual (todos os tipos): o paciente confirma cada dia na
 * aba Desafios. Os registros nunca concluem — servem só de sugestão na tela.
 */
function contarDiasCumpridos(inicio: Date, fim: Date, diasManuais: string[]): number {
  return diasManuais.reduce((n, s) => n + (noPeriodo(s, inicioDoDia(inicio), inicioDoDia(fim)) ? 1 : 0), 0);
}

export interface DiaDesafio { dia: number; status: "done" | "today" | "pending" | "missed" }
export interface DesafioDetalhe {
  dias: DiaDesafio[];
  streak: number;
  hojeConcluido: boolean;
  /** Tipo automático cujo registro de hoje já cumpre o hábito, mas ainda não foi confirmado. */
  sugestaoHoje: boolean;
  diasCumpridos: number;
  progresso: number;
}

/**
 * Monta a visão diária (calendário + sequência + status de hoje) para a TELA do paciente.
 * Conclusão é sempre manual: o calendário/sequência/hoje vêm das confirmações (diasManuais).
 * Para tipos automáticos, o registro de hoje que já cumpre o hábito vira apenas SUGESTÃO
 * ("Você já cumpriu este hábito hoje") — não conclui sozinho.
 */
export async function montarDesafioDetalhe(
  prog: { pacienteId: string; diasManuais: string[]; desafio: { tipo: string; duracaoDias: number; dataInicio: Date | null; dataFim: Date | null } },
  hoje: Date,
): Promise<DesafioDetalhe> {
  const d = prog.desafio;
  const win = janelaDesafio(d);
  if (!win) return { dias: [], streak: 0, hojeConcluido: false, sugestaoHoje: false, diasCumpridos: 0, progresso: 0 };
  // Calendário = janela real do desafio (protege contra dados com duração ≠ período).
  const N = Math.max(1, Math.round((win.fim.getTime() - win.inicio.getTime()) / DIA));

  const idxDe = (dt: Date) => Math.round((inicioDoDia(dt).getTime() - win.inicio.getTime()) / DIA);
  const cumpridos = new Set<number>();

  // Só as confirmações manuais contam (todos os tipos).
  for (const s of prog.diasManuais) {
    const i = idxDe(new Date(s + "T00:00:00"));
    if (i >= 0 && i < N) cumpridos.add(i);
  }

  const hoje0 = inicioDoDia(hoje);
  const idxHoje = idxDe(hoje0);
  const hojeNaJanela = idxHoje >= 0 && idxHoje < N;
  const hojeConcluido = hojeNaJanela && cumpridos.has(idxHoje);

  // Sugestão (não conclui): tipo automático cujo registro de hoje já cumpre o hábito.
  let sugestaoHoje = false;
  if (hojeNaJanela && !hojeConcluido && !ehCustom(d.tipo)) {
    const reg = await prisma.registro.findFirst({
      where: { pacienteId: prog.pacienteId, data: { gte: hoje0, lt: new Date(hoje0.getTime() + DIA) } },
      select: { alimentacaoOk: true, treinoOk: true, aguaOk: true, sonoOk: true },
    });
    if (reg && diaCumpreDesafio(d.tipo, reg)) sugestaoHoje = true;
  }

  const dias: DiaDesafio[] = [];
  for (let i = 0; i < N; i++) {
    let status: DiaDesafio["status"];
    if (cumpridos.has(i)) status = "done";
    else if (i === idxHoje) status = "today";
    else if (i < idxHoje) status = "missed";
    else status = "pending";
    dias.push({ dia: i + 1, status });
  }

  // Sequência: dias "done" consecutivos terminando em hoje (ou no último dia antes de hoje).
  let streak = 0;
  let i = Math.min(idxHoje, N - 1);
  if (i >= 0 && !cumpridos.has(i)) i--; // hoje ainda não concluído → conta até ontem
  for (; i >= 0; i--) {
    if (cumpridos.has(i)) streak++;
    else break;
  }

  const diasCumpridos = cumpridos.size;
  return { dias, streak, hojeConcluido, sugestaoHoje, diasCumpridos, progresso: Math.round((diasCumpridos / N) * 100) };
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
  const dias = contarDiasCumpridos(inicio, fim, prog.diasManuais);
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
  const pac = await prisma.paciente.findUnique({
    where: { id: prog.pacienteId },
    select: { pontosTotal: true, nome: true, nutricionistaId: true },
  });
  if (!pac) return;
  // XP sempre pela regra (7→5, 14→10, 21→15) — nunca o valor da coluna (que pode estar obsoleto).
  const bonus = recompensaDe(d.duracaoDias);
  const novoTotal = pac.pontosTotal + bonus;
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
        pontosBonus: bonus,
      },
    }),
  ]);

  // Notifica a nutricionista da conclusão (push — fire-and-forget, não bloqueia o fluxo).
  enviarNotificacao(
    pac.nutricionistaId,
    "🏆 Desafio concluído",
    `${pac.nome} concluiu o desafio "${d.titulo}".`,
    `/app/pacientes/${prog.pacienteId}`,
    "patient",
    prog.pacienteId,
  ).catch((e) => console.error("[desafio] notificar nutri", e));

  // Notifica o PACIENTE — desafio concluído + medalha (via NotificationEngine).
  NotificationEngine.enviar(prog.pacienteId, "desafio_concluido", {
    titulo: "🎉 Parabéns!",
    corpo: `Você concluiu seu desafio "${d.titulo}".`,
    destination: "challenge",
    id: d.id,
    dedupeKey: `desafio_concluido:${prog.id}`,
  }).catch(() => {});
  NotificationEngine.enviar(prog.pacienteId, "medalha", {
    titulo: "🏅 Nova medalha desbloqueada",
    corpo: `Você ganhou uma medalha por concluir "${d.titulo}".`,
    destination: "conta_paciente",
    dedupeKey: `medalha:desafio_concluido:${prog.id}`,
    minIntervalMin: 5,
  }).catch(() => {});
}

/** Processa os desafios ativos de um paciente (chamado ao fechar o dia). */
export async function processarDesafiosDoPaciente(pacienteId: string, hoje: Date): Promise<void> {
  const progressos = await prisma.desafioProgresso.findMany({
    where: { pacienteId, concluido: false, encerradoEm: null },
    select: { id: true, pacienteId: true, concluido: true, encerradoEm: true, diasManuais: true, desafio: { select: SELECT_DESAFIO } },
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
    select: { id: true, pacienteId: true, concluido: true, encerradoEm: true, diasManuais: true, desafio: { select: SELECT_DESAFIO } },
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
