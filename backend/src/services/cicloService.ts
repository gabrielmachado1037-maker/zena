import prisma from "../lib/prisma";
import { enviarNotificacao, enviarNotificacaoPaciente } from "../routes/notificacoes";
import { PONTOS, LIMITES_DIARIOS } from "../config/pontuacao";

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

function calcularMelhorStreak(
  checklists: { refeicoesOk: boolean; aguaOk: boolean; treinoOk: boolean; data: Date }[]
): number {
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
      pontosTotal: Math.round(participante?.pontosCiclo ?? 0),
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
      pontosTotal: Math.round(participante?.pontosCiclo ?? 0),
      posicaoFinal: participante?.posicaoAtual ?? 0,
      totalParticipantes,
      destaque,
    },
  });
}

// ─── Streak e marcos ──────────────────────────────────────────────────────────

async function atualizarStreak(pacienteId: string, cicloId: string | null) {
  const paciente = await prisma.paciente.findUnique({ where: { id: pacienteId } });
  if (!paciente) return;

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const ontem = new Date(hoje);
  ontem.setDate(ontem.getDate() - 1);

  let novoStreak = 1;

  if (paciente.ultimoCheckin) {
    const ultimaData = new Date(paciente.ultimoCheckin);
    ultimaData.setHours(0, 0, 0, 0);
    if (ultimaData.getTime() === ontem.getTime()) {
      novoStreak = (paciente.streakAtual || 0) + 1;
    }
    // Se foi antes de ontem, quebrou — volta para 1
  }

  const novoMaximo = Math.max(novoStreak, paciente.streakMaximo || 0);

  await prisma.paciente.update({
    where: { id: pacienteId },
    data: {
      streakAtual:  novoStreak,
      streakMaximo: novoMaximo,
      ultimoCheckin: hoje,
    },
  });

  // Verificar marcos de streak (apenas 1x por ciclo)
  if (!cicloId) return;

  for (const marco of [7, 21]) {
    if (novoStreak === marco) {
      const jaGanhou = await prisma.streakMarco.findUnique({
        where: { pacienteId_cicloId_marco: { pacienteId, cicloId, marco } },
      });

      if (!jaGanhou) {
        const pontosBonus = marco === 7 ? PONTOS.streak_7dias : PONTOS.streak_21dias;

        await prisma.streakMarco.create({
          data: { pacienteId, cicloId, marco, pontosBonus },
        });

        await Promise.all([
          prisma.cicloParticipante.update({
            where: { cicloId_pacienteId: { cicloId, pacienteId } },
            data: { pontosCiclo: { increment: pontosBonus } },
          }),
          prisma.paciente.update({
            where: { id: pacienteId },
            data: { pontosTotal: { increment: pontosBonus } },
          }),
        ]);

        enviarNotificacaoPaciente(
          pacienteId,
          marco === 7 ? "🔥 7 dias seguidos!" : "👑 21 dias sem parar!",
          marco === 7
            ? "Você ganhou +5 pts bônus pela sequência!"
            : "Incrível! +10 pts bônus. Você é imparável!",
          "/paciente/feed"
        ).catch(console.error);
      }
    }
  }
}

// ─── Processar checklist ──────────────────────────────────────────────────────

export async function processarChecklist(
  pacienteId: string,
  cicloId: string | null,
  dados: { refeicoesOk: boolean; aguaOk: boolean; treinoOk: boolean }
) {
  const { refeicoesOk, aguaOk, treinoOk } = dados;

  let pontosDia = 0;
  if (refeicoesOk) pontosDia += PONTOS.refeicoes_ok;
  if (aguaOk)      pontosDia += PONTOS.agua_ok;
  if (treinoOk)    pontosDia += PONTOS.treino_ok;
  if (refeicoesOk && aguaOk && treinoOk) pontosDia += PONTOS.bonus_tudo;

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
      pontosRefeicao: refeicoesOk ? PONTOS.refeicoes_ok : 0,
      pontosAgua:     aguaOk     ? PONTOS.agua_ok       : 0,
      pontosTreino:   treinoOk   ? PONTOS.treino_ok     : 0,
      pontosTotalDia: pontosDia,
    },
  });

  if (cicloId) {
    await prisma.cicloParticipante.upsert({
      where: { cicloId_pacienteId: { cicloId, pacienteId } },
      create: {
        cicloId,
        pacienteId,
        pontosCiclo: pontosDia,
        diasConsistente: pontosDia > 0 ? 1 : 0,
        diasTotal: 1,
      },
      update: {
        pontosCiclo: { increment: pontosDia },
        ...(pontosDia > 0 ? { diasConsistente: { increment: 1 } } : {}),
        diasTotal: { increment: 1 },
      },
    });
    await recalcularPosicoes(cicloId);
  }

  // Atualizar pontos totais do paciente
  await prisma.paciente.update({
    where: { id: pacienteId },
    data: { pontosTotal: { increment: pontosDia } },
  });

  // Atualizar streak e verificar marcos
  await atualizarStreak(pacienteId, cicloId);

  return { pontosGanhos: pontosDia, checklist };
}

// ─── Processar pontos sociais ─────────────────────────────────────────────────

export async function processarPontoSocial(
  pacienteId: string,
  cicloId: string | null,
  tipo: "comentario" | "curtida" | "registro_excecao"
) {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const limite =
    tipo === "comentario"       ? LIMITES_DIARIOS.comentarios_pontuados :
    tipo === "curtida"          ? LIMITES_DIARIOS.curtidas_pontuadas     :
    /* registro_excecao */        LIMITES_DIARIOS.registros_excecao;

  const count = await prisma.pontosLog.count({
    where: { pacienteId, tipo, data: hoje },
  });

  if (count >= limite) return { pontosGanhos: 0 };

  const pontos = PONTOS[tipo];

  await prisma.pontosLog.create({
    data: { pacienteId, tipo, pontos, data: hoje },
  });

  await prisma.paciente.update({
    where: { id: pacienteId },
    data: { pontosTotal: { increment: pontos } },
  });

  if (cicloId) {
    await prisma.cicloParticipante.update({
      where: { cicloId_pacienteId: { cicloId, pacienteId } },
      data: { pontosCiclo: { increment: pontos } },
    }).catch(() => {}); // silencia se não participar do ciclo
  }

  return { pontosGanhos: pontos };
}

// ─── Recalcular posições ──────────────────────────────────────────────────────

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

// ─── Encerrar ciclo ───────────────────────────────────────────────────────────

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

  // ── Registrar campeões (top 3) ──
  const top3 = ciclo.participantes.slice(0, 3);
  const agora = new Date();

  for (let i = 0; i < top3.length; i++) {
    const p      = top3[i];
    const posicao = i + 1;
    const ehCampeao = posicao === 1;
    const pct = diasCiclo > 0
      ? Math.round((p.diasConsistente / diasCiclo) * 100)
      : 0;

    await prisma.cicloCampeao.create({
      data: {
        cicloId,
        pacienteId:      p.pacienteId,
        nutricionistaId: ciclo.nutricionistaId,
        posicao,
        pontosFinais:    p.pontosCiclo,
        percentualConsistencia: pct,
        streakMaximo:    p.streakNoCiclo,
        fotoUrl:         p.paciente.fotoPerfilUrl ?? null,
        nomePaciente:    p.paciente.nome,
        escudoAtivo:     ehCampeao,
        escudoExpiresEm: ehCampeao
          ? new Date(agora.getTime() + 24 * 60 * 60 * 1000)
          : null,
        cicloNumero: ciclo.numero,
        cicloTitulo: ciclo.titulo ?? null,
        cicloDataFim: ciclo.dataFim,
      },
    });
  }

  // Desativar escudo do ciclo anterior
  await prisma.cicloCampeao.updateMany({
    where: { nutricionistaId: ciclo.nutricionistaId, cicloId: { not: cicloId }, escudoAtivo: true },
    data: { escudoAtivo: false },
  });

  // Manter apenas os 3 ciclos mais recentes no histórico
  const ciclosNoHistorico = await prisma.cicloCampeao.findMany({
    where: { nutricionistaId: ciclo.nutricionistaId },
    select: { cicloId: true },
    distinct: ["cicloId"],
    orderBy: { createdAt: "desc" },
  });
  const ciclosUnicos = [...new Set(ciclosNoHistorico.map(c => c.cicloId))];
  if (ciclosUnicos.length > 3) {
    await prisma.cicloCampeao.deleteMany({
      where: { cicloId: { in: ciclosUnicos.slice(3) } },
    });
  }

  // ── FeedEncerramento ──
  const vencedor = ciclo.participantes[0];
  const top3Json = ciclo.participantes.slice(0, 3).map((p, i) => ({
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
      top3: top3Json,
      mensagem: vencedor
        ? `🎉 ${vencedor.paciente.nome} venceu o Ciclo ${String(ciclo.numero).padStart(2, "0")}!`
        : `🎉 Ciclo ${String(ciclo.numero).padStart(2, "0")} encerrado!`,
    },
  });

  await prisma.ciclo.update({
    where: { id: cicloId },
    data: { status: "encerrado", relatorioGerado: true },
  });

  // ── Notificações ──
  if (top3[0]) {
    enviarNotificacaoPaciente(
      top3[0].pacienteId,
      "👑 Parabéns! Você venceu!",
      `Você venceu o Ciclo ${String(ciclo.numero).padStart(2, "0")}! Seu escudo dourado está no topo!`,
      "/paciente/relatorio/" + cicloId, "report", cicloId
    ).catch(console.error);
  }

  for (const p of ciclo.participantes.slice(1)) {
    enviarNotificacaoPaciente(
      p.pacienteId,
      "🎉 Ciclo encerrado!",
      `Veja seu relatório do Ciclo ${String(ciclo.numero).padStart(2, "0")}.`,
      "/paciente/relatorio/" + cicloId, "report", cicloId
    ).catch(console.error);
  }

  enviarNotificacao(
    ciclo.nutricionistaId,
    `Ciclo ${String(ciclo.numero).padStart(2, "0")} encerrado`,
    `${total} participantes. Veja os relatórios.`,
    "/app/ranking", "app_ranking"
  ).catch(console.error);

  // ── Criar próximo ciclo automaticamente ──
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
