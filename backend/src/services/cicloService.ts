import prisma from "../lib/prisma";
import { enviarNotificacao, enviarNotificacaoPaciente } from "../routes/notificacoes";

const PONTOS = { refeicoes: 8, agua: 6, treino: 6, bonus: 5 };

export function calcularStatusCiclo(ciclo: { dataInicio: Date; dataFim: Date }) {
  const diasRestantes = Math.ceil(
    (ciclo.dataFim.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  if (diasRestantes > 3) return "ativo";
  if (diasRestantes > 0) return "aquecimento";
  return "encerrado";
}

export function calcularProgressoCiclo(ciclo: { dataInicio: Date; dataFim: Date }) {
  const total = ciclo.dataFim.getTime() - ciclo.dataInicio.getTime();
  const passado = Date.now() - ciclo.dataInicio.getTime();
  const percentual = Math.min(Math.round((passado / total) * 100), 100);
  const diasRestantes = Math.max(
    Math.ceil((ciclo.dataFim.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
    0
  );
  return { percentual, diasRestantes };
}

function gerarMensagemPersonalizada(percentual: number): string {
  if (percentual >= 90) return "Desempenho excepcional! Você foi consistente quase todos os dias. Continue assim!";
  if (percentual >= 70) return "Ótimo ciclo! Você manteve um ritmo saudável na maioria dos dias.";
  if (percentual >= 50) return "Bom começo! Você mostrou comprometimento. O próximo ciclo será ainda melhor.";
  return "Todo ciclo é um aprendizado. O importante é não desistir!";
}

function calcularMelhorStreak(checklists: { refeicoesOk: boolean; aguaOk: boolean; treinoOk: boolean; data: Date }[]): number {
  const sorted = [...checklists].sort((a, b) => a.data.getTime() - b.data.getTime());
  let melhor = 0;
  let atual = 0;
  for (const c of sorted) {
    if (c.refeicoesOk || c.aguaOk || c.treinoOk) {
      atual++;
      melhor = Math.max(melhor, atual);
    } else {
      atual = 0;
    }
  }
  return melhor;
}

export async function gerarRelatorioCiclo(cicloId: string, pacienteId: string) {
  const ciclo = await prisma.ciclo.findUnique({ where: { id: cicloId } });
  if (!ciclo) throw new Error("Ciclo não encontrado");

  const checklists = await prisma.checklistDiario.findMany({
    where: { pacienteId, cicloId },
    orderBy: { data: "asc" },
  });

  const diasTotal = checklists.length;
  if (diasTotal === 0) {
    return prisma.relatorioCiclo.upsert({
      where: { cicloId_pacienteId: { cicloId, pacienteId } },
      create: { cicloId, pacienteId, mensagemNutri: gerarMensagemPersonalizada(0) },
      update: { mensagemNutri: gerarMensagemPersonalizada(0) },
    });
  }

  const pctRefeicao = Math.round((checklists.filter(c => c.refeicoesOk).length / diasTotal) * 100);
  const pctAgua = Math.round((checklists.filter(c => c.aguaOk).length / diasTotal) * 100);
  const pctTreino = Math.round((checklists.filter(c => c.treinoOk).length / diasTotal) * 100);
  const pctGeral = Math.round((pctRefeicao + pctAgua + pctTreino) / 3);

  const melhor = Math.max(pctRefeicao, pctAgua, pctTreino);
  const destaque =
    melhor === pctAgua ? "Seu ponto mais alto foi a hidratação! 💧"
    : melhor === pctRefeicao ? "Seu ponto mais alto foi a alimentação! 🍽️"
    : "Seu ponto mais alto foi a atividade física! 🏃";

  const participante = await prisma.cicloParticipante.findUnique({
    where: { cicloId_pacienteId: { cicloId, pacienteId } },
  });
  const totalParticipantes = await prisma.cicloParticipante.count({ where: { cicloId } });

  return prisma.relatorioCiclo.upsert({
    where: { cicloId_pacienteId: { cicloId, pacienteId } },
    create: {
      cicloId,
      pacienteId,
      percentualGeral: pctGeral,
      percentualHidratacao: pctAgua,
      percentualRefeicao: pctRefeicao,
      percentualTreino: pctTreino,
      melhorSequencia: calcularMelhorStreak(checklists),
      pontosTotal: participante?.pontosCiclo ?? 0,
      posicaoFinal: participante?.posicaoAtual ?? 0,
      totalParticipantes,
      destaque,
      mensagemNutri: gerarMensagemPersonalizada(pctGeral),
    },
    update: {
      percentualGeral: pctGeral,
      percentualHidratacao: pctAgua,
      percentualRefeicao: pctRefeicao,
      percentualTreino: pctTreino,
      melhorSequencia: calcularMelhorStreak(checklists),
      pontosTotal: participante?.pontosCiclo ?? 0,
      posicaoFinal: participante?.posicaoAtual ?? 0,
      totalParticipantes,
      destaque,
    },
  });
}

export async function processarChecklist(
  pacienteId: string,
  cicloId: string | null,
  dados: { refeicoesOk: boolean; aguaOk: boolean; treinoOk: boolean }
) {
  const { refeicoesOk, aguaOk, treinoOk } = dados;

  let pontosDia = 0;
  if (refeicoesOk) pontosDia += PONTOS.refeicoes;
  if (aguaOk) pontosDia += PONTOS.agua;
  if (treinoOk) pontosDia += PONTOS.treino;
  if (refeicoesOk && aguaOk && treinoOk) pontosDia += PONTOS.bonus;

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const checklist = await prisma.checklistDiario.create({
    data: {
      pacienteId,
      cicloId,
      data: hoje,
      refeicoesOk,
      aguaOk,
      treinoOk,
      pontosRefeicao: refeicoesOk ? PONTOS.refeicoes : 0,
      pontosAgua: aguaOk ? PONTOS.agua : 0,
      pontosTreino: treinoOk ? PONTOS.treino : 0,
      pontosTotalDia: pontosDia,
    },
  });

  if (cicloId) {
    await prisma.cicloParticipante.upsert({
      where: { cicloId_pacienteId: { cicloId, pacienteId } },
      create: { cicloId, pacienteId, pontosCiclo: pontosDia, diasConsistente: pontosDia > 0 ? 1 : 0, diasTotal: 1 },
      update: {
        pontosCiclo: { increment: pontosDia },
        ...(pontosDia > 0 ? { diasConsistente: { increment: 1 } } : {}),
        diasTotal: { increment: 1 },
      },
    });
    await recalcularPosicoes(cicloId);
  }

  return { pontosGanhos: pontosDia, checklist };
}

async function recalcularPosicoes(cicloId: string) {
  const participantes = await prisma.cicloParticipante.findMany({
    where: { cicloId },
    orderBy: { pontosCiclo: "desc" },
  });
  await Promise.all(
    participantes.map((p, i) =>
      prisma.cicloParticipante.update({
        where: { id: p.id },
        data: { posicaoAnterior: p.posicaoAtual, posicaoAtual: i + 1 },
      })
    )
  );
}

export async function encerrarCiclo(cicloId: string) {
  const ciclo = await prisma.ciclo.findUnique({
    where: { id: cicloId },
    include: {
      participantes: {
        orderBy: { pontosCiclo: "desc" },
        include: { paciente: true },
      },
    },
  });
  if (!ciclo) return;

  const total = ciclo.participantes.length;
  const diasCiclo = Math.ceil(
    (ciclo.dataFim.getTime() - ciclo.dataInicio.getTime()) / (1000 * 60 * 60 * 24)
  );

  await Promise.all(
    ciclo.participantes.map(async (p, i) => {
      const pct = diasCiclo > 0 ? Math.round((p.diasConsistente / diasCiclo) * 100) : 0;
      await prisma.cicloParticipante.update({
        where: { id: p.id },
        data: { posicaoAtual: i + 1, diasTotal: diasCiclo, percentualConsistencia: pct },
      });
      await gerarRelatorioCiclo(cicloId, p.pacienteId);
    })
  );

  const vencedor = ciclo.participantes[0];
  const top3 = ciclo.participantes.slice(0, 3).map((p, i) => ({
    pacienteId: p.pacienteId,
    nome: p.paciente.nome,
    pontos: p.pontosCiclo,
    posicao: i + 1,
  }));

  await prisma.feedEncerramento.create({
    data: {
      cicloId,
      nutricionistaId: ciclo.nutricionistaId,
      vencedorId: vencedor?.pacienteId ?? null,
      top3,
      mensagem: vencedor
        ? `🎉 ${vencedor.paciente.nome} venceu o Ciclo ${String(ciclo.numero).padStart(2, "0")}!`
        : `🎉 Ciclo ${String(ciclo.numero).padStart(2, "0")} encerrado!`,
    },
  });

  await prisma.ciclo.update({
    where: { id: cicloId },
    data: { status: "encerrado", relatorioGerado: true },
  });

  for (const p of ciclo.participantes) {
    const isVencedor = p.pacienteId === vencedor?.pacienteId;
    const titulo = isVencedor ? "👑 Parabéns! Você venceu!" : "🎉 Ciclo encerrado!";
    const corpo = isVencedor
      ? `Você venceu o Ciclo ${String(ciclo.numero).padStart(2, "0")}! Veja seu relatório.`
      : `Veja seu relatório do Ciclo ${String(ciclo.numero).padStart(2, "0")}.`;
    enviarNotificacaoPaciente(p.pacienteId, titulo, corpo, `/paciente/relatorio/${cicloId}`).catch(console.error);
  }

  enviarNotificacao(
    ciclo.nutricionistaId,
    `Ciclo ${String(ciclo.numero).padStart(2, "0")} encerrado`,
    `${total} participantes. Veja os relatórios.`,
    "/app/ranking"
  ).catch(console.error);

  const proximoNumero = ciclo.numero + 1;
  const novoInicio = new Date(ciclo.dataFim);
  novoInicio.setDate(novoInicio.getDate() + 1);
  const novoFim = new Date(novoInicio);
  novoFim.setDate(novoFim.getDate() + 29);

  const proximoCiclo = await prisma.ciclo.create({
    data: {
      nutricionistaId: ciclo.nutricionistaId,
      numero: proximoNumero,
      dataInicio: novoInicio,
      dataFim: novoFim,
      status: "ativo",
    },
  });

  // Auto-enroll pacientes ativos no próximo ciclo
  const pacientes = await prisma.paciente.findMany({
    where: { nutricionistaId: ciclo.nutricionistaId, ativo: true },
    select: { id: true },
  });
  if (pacientes.length > 0) {
    await prisma.cicloParticipante.createMany({
      data: pacientes.map(p => ({ cicloId: proximoCiclo.id, pacienteId: p.id })),
      skipDuplicates: true,
    });
  }

  enviarNotificacao(
    ciclo.nutricionistaId,
    `🏆 Ciclo ${String(proximoNumero).padStart(2, "0")} criado`,
    `O Ciclo ${String(proximoNumero).padStart(2, "0")} começa em ${novoInicio.toLocaleDateString("pt-BR")}.`,
    "/app/ranking"
  ).catch(console.error);

  return proximoCiclo;
}

export async function notificarAquecimento(ciclo: { id: string; numero: number; nutricionistaId: string }) {
  const participantes = await prisma.cicloParticipante.findMany({
    where: { cicloId: ciclo.id },
    select: { pacienteId: true },
  });
  const nrStr = String(ciclo.numero).padStart(2, "0");
  for (const p of participantes) {
    enviarNotificacaoPaciente(
      p.pacienteId,
      "🔥 Faltam 3 dias!",
      `O Ciclo ${nrStr} está encerrando. Dê tudo de si para subir no ranking!`,
      "/paciente/feed"
    ).catch(console.error);
  }
}

export async function notificarUltimasHoras(ciclo: { id: string; numero: number }) {
  const participantes = await prisma.cicloParticipante.findMany({
    where: { cicloId: ciclo.id },
    select: { pacienteId: true },
  });
  const nrStr = String(ciclo.numero).padStart(2, "0");
  for (const p of participantes) {
    enviarNotificacaoPaciente(
      p.pacienteId,
      `⏰ Últimas 24h do Ciclo ${nrStr}!`,
      "Faça seu check-in e garanta sua posição!",
      "/paciente/feed"
    ).catch(console.error);
  }
}
