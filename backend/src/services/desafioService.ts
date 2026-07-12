import prisma from "../lib/prisma";
import { calcularLiga } from "../config/ligas";
import { adesaoMinimaDe, diaCumpreDesafio } from "../config/desafios";
import { enviarNotificacao } from "../routes/notificacoes";

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

const noPeriodo = (s: string, inicio: Date, fim: Date): boolean => {
  const dt = inicioDoDia(new Date(s + "T00:00:00"));
  return dt >= inicio && dt < fim;
};

/**
 * Conta os dias cumpridos na janela [inicio, fim).
 * Tipos automáticos: dias fechados cujos registros batem a regra (reusa os registros).
 * Custom (manual): quantidade de marcações manuais dentro da janela.
 */
async function contarDiasCumpridos(pacienteId: string, tipo: string, inicio: Date, fim: Date, diasManuais: string[]): Promise<number> {
  if (ehCustom(tipo)) {
    return diasManuais.reduce((n, s) => n + (noPeriodo(s, inicioDoDia(inicio), inicioDoDia(fim)) ? 1 : 0), 0);
  }
  const regs = await prisma.registro.findMany({
    where: { pacienteId, finalizado: true, data: { gte: inicioDoDia(inicio), lt: inicioDoDia(fim) } },
    select: { alimentacaoOk: true, treinoOk: true, aguaOk: true, sonoOk: true },
  });
  return regs.reduce((n, r) => n + (diaCumpreDesafio(tipo, r) ? 1 : 0), 0);
}

export interface DiaDesafio { dia: number; status: "done" | "today" | "pending" | "missed" }
export interface DesafioDetalhe {
  dias: DiaDesafio[];
  streak: number;
  hojeConcluido: boolean;
  diasCumpridos: number;
  progresso: number;
}

/**
 * Monta a visão diária (calendário + sequência + status de hoje) para a TELA do paciente.
 * "Hoje" conta em tempo real: automático = registro de hoje (mesmo não-fechado) já bate a regra;
 * custom = data de hoje presente nas marcações manuais. XP/finalização seguem no motor (inalterados).
 */
export async function montarDesafioDetalhe(
  prog: { pacienteId: string; diasManuais: string[]; desafio: { tipo: string; duracaoDias: number; dataInicio: Date | null; dataFim: Date | null } },
  hoje: Date,
): Promise<DesafioDetalhe> {
  const d = prog.desafio;
  const N = d.duracaoDias;
  const win = janelaDesafio(d);
  if (!win) return { dias: [], streak: 0, hojeConcluido: false, diasCumpridos: 0, progresso: 0 };

  const idxDe = (dt: Date) => Math.round((inicioDoDia(dt).getTime() - win.inicio.getTime()) / DIA);
  const custom = ehCustom(d.tipo);
  const cumpridos = new Set<number>();

  if (custom) {
    for (const s of prog.diasManuais) {
      const i = idxDe(new Date(s + "T00:00:00"));
      if (i >= 0 && i < N) cumpridos.add(i);
    }
  } else {
    const regs = await prisma.registro.findMany({
      where: { pacienteId: prog.pacienteId, finalizado: true, data: { gte: win.inicio, lt: win.fim } },
      select: { data: true, alimentacaoOk: true, treinoOk: true, aguaOk: true, sonoOk: true },
    });
    for (const r of regs) {
      if (!diaCumpreDesafio(d.tipo, r)) continue;
      const i = idxDe(r.data);
      if (i >= 0 && i < N) cumpridos.add(i);
    }
  }

  // Hoje ao vivo (item 3: conta ao atingir a meta, sem depender de fechar o dia).
  const hoje0 = inicioDoDia(hoje);
  const idxHoje = idxDe(hoje0);
  let hojeConcluido = cumpridos.has(idxHoje);
  if (idxHoje >= 0 && idxHoje < N && !hojeConcluido) {
    if (custom) {
      hojeConcluido = prog.diasManuais.includes(ymdLocal(hoje0));
    } else {
      const reg = await prisma.registro.findFirst({
        where: { pacienteId: prog.pacienteId, data: { gte: hoje0, lt: new Date(hoje0.getTime() + DIA) } },
        select: { alimentacaoOk: true, treinoOk: true, aguaOk: true, sonoOk: true },
      });
      if (reg && diaCumpreDesafio(d.tipo, reg)) hojeConcluido = true;
    }
    if (hojeConcluido) cumpridos.add(idxHoje);
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
  return { dias, streak, hojeConcluido, diasCumpridos, progresso: Math.round((diasCumpridos / N) * 100) };
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
  const dias = await contarDiasCumpridos(prog.pacienteId, d.tipo, inicio, fim, prog.diasManuais);
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

  // Notifica a nutricionista da conclusão (push — fire-and-forget, não bloqueia o fluxo).
  enviarNotificacao(
    pac.nutricionistaId,
    "🏆 Desafio concluído",
    `${pac.nome} concluiu o desafio "${d.titulo}".`,
    `/app/pacientes/${prog.pacienteId}`,
  ).catch((e) => console.error("[desafio] notificar nutri", e));
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
