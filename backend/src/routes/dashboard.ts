import { Router, Response } from "express";
import prisma from "../lib/prisma";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import { calcularLiga } from "../config/ligas";
import { scoreAderencia30 } from "../lib/adesao";

const router = Router();
router.use(authMiddleware);

const LIGA_ORDEM = ["Bronze", "Prata", "Ouro", "Diamante", "Mestre", "Lendário"];
const LIGA_CORES: Record<string, string> = {
  Bronze: "#C77B3C", Prata: "#C2C9D2", Ouro: "#F8C84B",
  Diamante: "#54B3F0", Mestre: "#F0483E", "Lendário": "#A855F7",
};
const MESES_PT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

router.get("/", async (req: AuthRequest, res: Response) => {
  const now = new Date();
  const mes = now.getMonth();
  const ano = now.getFullYear();
  const inicioMes = new Date(ano, mes, 1);
  const fimMes = new Date(ano, mes + 1, 0, 23, 59, 59);
  const inicioHoje = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const fimHoje = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  const ha30dias = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [pacientesAtivos, consultasHoje, cobrancasMes, semConsulta, totalConsultas, nutri, totalCobrancas, totalPlanos, pacientesComMedicoes, novosPacientesMes, proximosAtend, topPacientes, pacientesComPlanoCount] = await Promise.all([
    prisma.paciente.count({ where: { nutricionistaId: req.nutricionistaId, ativo: true } }),
    prisma.consulta.findMany({
      where: {
        data: { gte: inicioHoje, lte: fimHoje },
        paciente: { nutricionistaId: req.nutricionistaId },
      },
      include: { paciente: { select: { id: true, nome: true, telefone: true, linkUnico: true } } },
      orderBy: { data: "asc" },
    }),
    prisma.cobranca.findMany({
      where: {
        paciente: { nutricionistaId: req.nutricionistaId },
        vencimento: { gte: inicioMes, lte: fimMes },
      },
    }),
    prisma.paciente.findMany({
      where: {
        nutricionistaId: req.nutricionistaId,
        ativo: true,
        consultas: { none: { data: { gte: ha30dias } } },
      },
      select: { id: true, nome: true, telefone: true, linkUnico: true },
    }),
    prisma.consulta.count({ where: { paciente: { nutricionistaId: req.nutricionistaId } } }),
    prisma.nutricionista.findUnique({ where: { id: req.nutricionistaId! }, select: { asaasApiKey: true } }),
    prisma.cobranca.count({ where: { paciente: { nutricionistaId: req.nutricionistaId! } } }),
    prisma.planoAlimentar.count({ where: { paciente: { nutricionistaId: req.nutricionistaId! } } }),
    prisma.paciente.findMany({
      where: { nutricionistaId: req.nutricionistaId!, ativo: true },
      select: { medicoes: { orderBy: { data: "asc" }, select: { peso: true, data: true } } },
    }),
    prisma.paciente.count({ where: { nutricionistaId: req.nutricionistaId!, createdAt: { gte: inicioMes } } }),
    prisma.consulta.findMany({
      where: { data: { gte: now }, paciente: { nutricionistaId: req.nutricionistaId! }, status: { not: "cancelada" } },
      include: { paciente: { select: { nome: true } } },
      orderBy: { data: "asc" },
      take: 4,
    }),
    prisma.paciente.findMany({
      where: { nutricionistaId: req.nutricionistaId!, ativo: true, planosAlimentares: { some: {} } },
      select: { nome: true, _count: { select: { planosAlimentares: true } } },
      orderBy: { planosAlimentares: { _count: "desc" } },
      take: 3,
    }),
    prisma.paciente.count({ where: { nutricionistaId: req.nutricionistaId!, ativo: true, planosAlimentares: { some: {} } } }),
  ]);

  // Evolução de peso
  let perderam = 0, totalComMedicoes = 0;
  const todasMedicoes: { peso: number; data: Date }[] = [];
  for (const p of pacientesComMedicoes) {
    if (p.medicoes.length >= 2) {
      totalComMedicoes++;
      if (p.medicoes[p.medicoes.length - 1].peso < p.medicoes[0].peso) perderam++;
    }
    todasMedicoes.push(...p.medicoes);
  }
  const pctEvolucao = totalComMedicoes > 0 ? Math.round((perderam / totalComMedicoes) * 100) : 0;
  const sixMonthsAgo = new Date(now.getTime() - 6 * 30 * 86400000);
  const medicoesRecentes = todasMedicoes.filter((m) => new Date(m.data) >= sixMonthsAgo);
  const byMonth: Record<string, number[]> = {};
  for (const m of medicoesRecentes) {
    const d = new Date(m.data);
    const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}`;
    if (!byMonth[key]) byMonth[key] = [];
    byMonth[key].push(m.peso);
  }
  const sparkline = Object.keys(byMonth)
    .sort()
    .map((k) => Math.round((byMonth[k].reduce((a, b) => a + b, 0) / byMonth[k].length) * 10) / 10);

  // Evolução semanal para gráfico de área (last 6 months, weekly)
  const monthPt = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  const byWeek: Record<string, number[]> = {};
  for (const m of medicoesRecentes) {
    const d = new Date(m.data);
    const jan1 = new Date(d.getFullYear(), 0, 1);
    const dayOfYear = Math.floor((d.getTime() - jan1.getTime()) / 86400000) + 1;
    const week = Math.ceil(dayOfYear / 7);
    const key = `${d.getFullYear()}-W${String(week).padStart(2, "0")}`;
    if (!byWeek[key]) byWeek[key] = [];
    byWeek[key].push(m.peso);
  }
  const evolucaoSemanal = Object.keys(byWeek).sort().map((k) => {
    const [yearStr, wStr] = k.split("-W");
    const approxDate = new Date(parseInt(yearStr), 0, (parseInt(wStr) - 1) * 7 + 1);
    return {
      semana: k,
      label: monthPt[approxDate.getMonth()],
      pesoMedio: Math.round((byWeek[k].reduce((a, b) => a + b, 0) / byWeek[k].length) * 10) / 10,
    };
  });

  // Adesão aos planos
  const adesaoPlanos = pacientesAtivos > 0 ? Math.round((pacientesComPlanoCount / pacientesAtivos) * 100) : 0;

  const faturamentoMes = cobrancasMes.reduce((s, c) => s + c.valor, 0);
  const recebidoMes = cobrancasMes.filter((c) => c.status === "pago").reduce((s, c) => s + c.valor, 0);
  const aReceber = cobrancasMes.filter((c) => c.status !== "pago").reduce((s, c) => s + c.valor, 0);
  const vencidas = cobrancasMes.filter((c) => c.status === "pendente" && new Date(c.vencimento) < now);

  res.json({
    pacientesAtivos,
    faturamentoMes,
    recebidoMes,
    aReceber,
    consultasHoje,
    cobrancasVencidas: vencidas.length,
    pacientesSemConsulta: semConsulta,
    totalConsultas,
    asaasConectado: !!nutri?.asaasApiKey,
    totalCobrancas,
    totalPlanos,
    evolucaoPeso: { pct: pctEvolucao, sparkline, totalComMedicoes },
    novosPacientesMes,
    adesaoPlanos,
    evolucaoSemanal,
    proximosAtendimentos: proximosAtend.map((c) => ({
      id: c.id,
      data: c.data.toISOString(),
      pacienteNome: c.paciente.nome,
      status: c.status,
    })),
    planosMaisUsados: topPacientes.map((p) => ({ nome: p.nome, count: p._count.planosAlimentares })),
  });
});

router.get("/alertas", async (req: AuthRequest, res: Response) => {
  const now = new Date();
  const id = req.nutricionistaId as string;

  const hoje = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const amanha = new Date(hoje.getTime() + 86400000);
  const fimAmanha = new Date(amanha.getTime() + 86399999);
  const daqui2diasFim = new Date(hoje.getTime() + 2 * 86400000 + 86399999);
  const ha3dias = new Date(hoje.getTime() - 3 * 86400000);
  const ha45dias = new Date(hoje.getTime() - 45 * 86400000);
  const em7dias = new Date(hoje.getTime() + 7 * 86400000);

  type Alerta = {
    id: string; tipo: string; prioridade: number; texto: string;
    acao: string; link: string; template?: string;
    paciente?: { id: string; nome: string; telefone: string | null; linkUnico: string };
  };
  const alertas: Alerta[] = [];

  // 1 — Cobranças vencidas há >3 dias (vermelho)
  const cobVencidas = await prisma.cobranca.findMany({
    where: { paciente: { nutricionistaId: id }, status: { not: "pago" }, vencimento: { lt: ha3dias } },
    include: { paciente: { select: { id: true, nome: true, telefone: true, linkUnico: true } } },
    orderBy: { vencimento: "asc" },
    take: 3,
  });
  for (const c of cobVencidas) {
    const dias = Math.floor((now.getTime() - new Date(c.vencimento).getTime()) / 86400000);
    const val = `R$${c.valor.toFixed(2).replace(".", ",")}`;
    alertas.push({
      id: `cob_vencida_${c.id}`, tipo: "cobranca_vencida", prioridade: 1,
      texto: `${c.paciente.nome.split(" ")[0]} — ${val} venceu há ${dias} dia${dias !== 1 ? "s" : ""}. Cobrar →`,
      acao: "Cobrar", link: "/cobrancas", template: "lembrete_cobranca",
      paciente: c.paciente,
    });
  }

  // 2 — Pacientes sem consulta há +45 dias (amarelo)
  const semConsulta = await prisma.paciente.findMany({
    where: {
      nutricionistaId: id, ativo: true,
      consultas: {
        some: { status: { not: "cancelada" } },
        none: { data: { gte: ha45dias }, status: { not: "cancelada" } },
      },
    },
    select: {
      id: true, nome: true, telefone: true, linkUnico: true,
      consultas: {
        where: { status: { not: "cancelada" } },
        orderBy: { data: "desc" }, take: 1, select: { data: true },
      },
    },
    take: 2,
  });
  for (const p of semConsulta) {
    const ultima = p.consultas[0];
    const dias = ultima ? Math.floor((now.getTime() - new Date(ultima.data).getTime()) / 86400000) : null;
    const quando = dias ? `há ${dias} dias` : "há muito tempo";
    alertas.push({
      id: `sem_consulta_${p.id}`, tipo: "sem_consulta", prioridade: 2,
      texto: `${p.nome.split(" ")[0]} — último retorno foi ${quando}. Chamar →`,
      acao: "Chamar", link: `/pacientes/${p.id}`, template: "lembrete_checkin",
      paciente: { id: p.id, nome: p.nome, telefone: p.telefone, linkUnico: p.linkUnico },
    });
  }

  // 3 — Consultas hoje e amanhã (amarelo)
  const consultasProximas = await prisma.consulta.findMany({
    where: {
      paciente: { nutricionistaId: id },
      data: { gte: hoje, lte: fimAmanha },
      status: { in: ["agendada", "confirmada", "aguardando_confirmacao"] },
    },
    include: { paciente: { select: { id: true, nome: true, telefone: true, linkUnico: true } } },
    orderBy: { data: "asc" },
    take: 3,
  });
  for (const c of consultasProximas) {
    const cData = new Date(c.data);
    const isHoje = cData >= hoje && cData < amanha;
    const hh = cData.getHours().toString().padStart(2, "0");
    const mm = cData.getMinutes().toString().padStart(2, "0");
    const quando = isHoje ? `hoje às ${hh}:${mm}` : `amanhã às ${hh}:${mm}`;
    alertas.push({
      id: `consulta_${c.id}`, tipo: "consulta_proxima", prioridade: 3,
      texto: `Consulta de ${c.paciente.nome.split(" ")[0]} ${quando}. Ver →`,
      acao: "Ver", link: "/horarios", template: "lembrete_consulta",
      paciente: c.paciente,
    });
  }

  // 4 — Cobranças vencendo em ≤2 dias (verde)
  const cobVencendo = await prisma.cobranca.findMany({
    where: {
      paciente: { nutricionistaId: id },
      status: { not: "pago" },
      vencimento: { gte: hoje, lte: daqui2diasFim },
    },
    include: { paciente: { select: { id: true, nome: true, telefone: true, linkUnico: true } } },
    orderBy: { vencimento: "asc" },
    take: 2,
  });
  for (const c of cobVencendo) {
    const dias = Math.floor((new Date(c.vencimento).getTime() - hoje.getTime()) / 86400000);
    const val = `R$${c.valor.toFixed(2).replace(".", ",")}`;
    const quando = dias === 0 ? "hoje" : dias === 1 ? "amanhã" : `em ${dias} dias`;
    alertas.push({
      id: `cob_vencendo_${c.id}`, tipo: "cobranca_vencendo", prioridade: 4,
      texto: `Lembrete: ${c.paciente.nome.split(" ")[0]} paga ${quando} (${val})`,
      acao: "Lembrar", link: "/cobrancas", template: "lembrete_cobranca",
      paciente: c.paciente,
    });
  }

  // 5 — Aniversários esta semana (verde)
  const pacientesAniv = await prisma.paciente.findMany({
    where: { nutricionistaId: id, ativo: true, dataNascimento: { not: null } },
    select: { id: true, nome: true, telefone: true, linkUnico: true, dataNascimento: true },
  });
  for (const p of pacientesAniv) {
    if (!p.dataNascimento) continue;
    const nasc = new Date(p.dataNascimento);
    const anivEsteAno = new Date(hoje.getFullYear(), nasc.getMonth(), nasc.getDate());
    const aniv = anivEsteAno >= hoje ? anivEsteAno : new Date(hoje.getFullYear() + 1, nasc.getMonth(), nasc.getDate());
    if (aniv <= em7dias) {
      const dias = Math.floor((aniv.getTime() - hoje.getTime()) / 86400000);
      const quando = dias === 0 ? "hoje" : dias === 1 ? "amanhã" : `em ${dias} dias`;
      alertas.push({
        id: `aniversario_${p.id}`, tipo: "aniversario", prioridade: 5,
        texto: `${p.nome.split(" ")[0]} faz aniversário ${quando} 🎂`,
        acao: "Parabenizar", link: `/pacientes/${p.id}`,
        paciente: { id: p.id, nome: p.nome, telefone: p.telefone, linkUnico: p.linkUnico },
      });
    }
  }

  alertas.sort((a, b) => a.prioridade - b.prioridade);
  res.json(alertas.slice(0, 10));
});

// GET /api/dashboard/ligas — métricas do Sistema de Ligas (Nexvel)
router.get("/ligas", async (req: AuthRequest, res: Response) => {
  const id = req.nutricionistaId!;
  const now = new Date();
  const hoje = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const fimHoje = new Date(hoje.getTime() + 86_399_999);
  const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1);
  const ha30 = new Date(hoje.getTime() - 30 * 86_400_000);
  const ha3 = new Date(hoje.getTime() - 3 * 86_400_000);
  const ha7 = new Date(hoje.getTime() - 7 * 86_400_000);
  const ha14 = new Date(hoje.getTime() - 14 * 86_400_000);
  const inicioSemana = ha7;
  const seisMesesAtras = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const [pacientes, novosMes, registrosHoje, evolucoesSemana, registros6m, conquistas] =
    await Promise.all([
      prisma.paciente.findMany({
        where: { nutricionistaId: id, ativo: true },
        select: {
          id: true, nome: true, pontosTotal: true, ligaAtual: true, ligaNivel: true,
          streakAtual: true, ultimoCheckin: true, diasInativo: true, fotoPerfilUrl: true,
        },
      }),
      prisma.paciente.count({ where: { nutricionistaId: id, ativo: true, createdAt: { gte: inicioMes } } }),
      prisma.registro.count({ where: { paciente: { nutricionistaId: id }, data: { gte: hoje, lte: fimHoje } } }),
      prisma.registro.count({ where: { paciente: { nutricionistaId: id }, fotoUrl: { not: null }, data: { gte: inicioSemana } } }),
      prisma.registro.findMany({
        where: { paciente: { nutricionistaId: id }, data: { gte: seisMesesAtras } },
        select: { pacienteId: true, data: true },
      }),
      prisma.conquista.findMany({
        where: { paciente: { nutricionistaId: id } },
        include: { paciente: { select: { nome: true } } },
        orderBy: { createdAt: "desc" },
        take: 8,
      }),
    ]);

  // Pedidos de ajuste pendentes
  const pedidosRaw = await prisma.registro.findMany({
    where: { paciente: { nutricionistaId: id }, pediuAjuste: true, ajusteLido: false },
    include: { paciente: { select: { id: true, nome: true, fotoPerfilUrl: true } } },
    orderBy: { data: "desc" },
    take: 10,
  });
  const pedidosAjuste = pedidosRaw.map((r) => ({
    registroId: r.id,
    pacienteId: r.paciente.id,
    pacienteNome: r.paciente.nome,
    foto: r.paciente.fotoPerfilUrl,
    motivo: r.motivoAjuste,
    data: r.data,
  }));

  const total = pacientes.length;

  // Retenção 30 dias — % de pacientes que registraram nos últimos 30 dias
  const ativos30 = pacientes.filter((p) => p.ultimoCheckin && new Date(p.ultimoCheckin) >= ha30).length;
  const retencao30 = total ? Math.round((ativos30 / total) * 100) : 0;

  // Check-ins de hoje (% dos pacientes)
  const pctCheckins = total ? Math.round((registrosHoje / total) * 100) : 0;

  // Em risco de abandono — inativo há 3+ dias (ou nunca registrou)
  const emRisco = pacientes.filter(
    (p) => p.diasInativo >= 3 || !p.ultimoCheckin || new Date(p.ultimoCheckin) < ha3
  ).length;

  // Registros por paciente nos últimos 30 dias (para índice de saúde)
  const reg30ByPac: Record<string, number> = {};
  for (const r of registros6m) {
    if (new Date(r.data) >= ha30) reg30ByPac[r.pacienteId] = (reg30ByPac[r.pacienteId] || 0) + 1;
  }
  let somaAdesao = 0;
  for (const p of pacientes) somaAdesao += Math.min((reg30ByPac[p.id] || 0) / 30, 1);
  const indiceSaude = total ? Math.round((somaAdesao / total) * 100) : 0;

  // Badge da clínica — liga média dos pacientes
  const avgPontos = total ? Math.round(pacientes.reduce((s, p) => s + p.pontosTotal, 0) / total) : 0;
  const ligaClinica = calcularLiga(avgPontos);

  // Distribuição por liga
  const distMap: Record<string, number> = {};
  for (const p of pacientes) distMap[p.ligaAtual] = (distMap[p.ligaAtual] || 0) + 1;
  const distribuicaoLigas = LIGA_ORDEM.map((liga) => ({
    liga, count: distMap[liga] || 0, cor: LIGA_CORES[liga],
  }));

  // Retenção mensal (6 meses)
  const retencaoMensal: { label: string; pct: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const fim = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    const pacs = new Set<string>();
    for (const r of registros6m) {
      const rd = new Date(r.data);
      if (rd >= d && rd < fim) pacs.add(r.pacienteId);
    }
    retencaoMensal.push({ label: MESES_PT[d.getMonth()], pct: total ? Math.round((pacs.size / total) * 100) : 0 });
  }

  // Top ranking (5)
  const topRanking = [...pacientes]
    .sort((a, b) => b.pontosTotal - a.pontosTotal)
    .slice(0, 5)
    .map((p, i) => ({
      pos: i + 1, nome: p.nome, pontos: p.pontosTotal,
      liga: p.ligaAtual, ligaNivel: p.ligaNivel, streak: p.streakAtual, foto: p.fotoPerfilUrl,
    }));

  // Pacientes em risco (detalhe para a lista de alertas)
  const alertas = pacientes
    .filter((p) => p.diasInativo >= 3 || !p.ultimoCheckin || new Date(p.ultimoCheckin) < ha3)
    .sort((a, b) => b.diasInativo - a.diasInativo)
    .slice(0, 6)
    .map((p) => ({
      id: p.id, nome: p.nome, foto: p.fotoPerfilUrl, diasInativo: p.diasInativo,
      liga: p.ligaAtual, ultimoCheckin: p.ultimoCheckin,
    }));

  const atividadeRecente = conquistas.map((c) => ({
    id: c.id, pacienteNome: c.paciente.nome, titulo: c.titulo,
    icone: c.icone, quando: c.createdAt,
  }));

  // Desempenho por categoria — % de adesão de cada hábito nos últimos 30 dias
  const reg30 = await prisma.registro.findMany({
    where: { paciente: { nutricionistaId: id }, data: { gte: ha30 } },
    select: {
      pacienteId: true, data: true,
      alimentacaoOk: true, treinoOk: true, aguaOk: true, sonoOk: true,
      cafeStatus: true, almocoStatus: true, lancheStatus: true, jantarStatus: true,
    },
  });
  const nReg = reg30.length || 1;
  const desempenhoCategoria = {
    alimentacao: Math.round((reg30.filter((r) => r.alimentacaoOk).length / nReg) * 100),
    treino: Math.round((reg30.filter((r) => r.treinoOk).length / nReg) * 100),
    agua: Math.round((reg30.filter((r) => r.aguaOk).length / nReg) * 100),
    sono: Math.round((reg30.filter((r) => r.sonoOk).length / nReg) * 100),
  };

  // Comportamento alimentar — distribuição Seguiu/Adaptou/Pulou entre TODAS as refeições
  // registradas (café/almoço/lanche/jantar) nos últimos 30 dias.
  const REFEICOES_COLS = ["cafeStatus", "almocoStatus", "lancheStatus", "jantarStatus"] as const;
  const contagem = { seguiu: 0, adaptou: 0, comeu_mal: 0, pulou: 0 };
  for (const r of reg30) {
    for (const col of REFEICOES_COLS) {
      const s = r[col];
      if (s === "seguiu" || s === "adaptou" || s === "comeu_mal" || s === "pulou") contagem[s]++;
    }
  }
  const totalRefeicoes = contagem.seguiu + contagem.adaptou + contagem.comeu_mal + contagem.pulou;
  const pctRef = (n: number) => (totalRefeicoes ? Math.round((n / totalRefeicoes) * 100) : null);
  const alimentacaoBreakdown = {
    seguiu: pctRef(contagem.seguiu),
    adaptou: pctRef(contagem.adaptou),
    comeu_mal: pctRef(contagem.comeu_mal),
    pulou: pctRef(contagem.pulou),
    amostra: totalRefeicoes,
  };

  /* ───────── Premium: tendências, carteira e retenção prevista ───────── */

  // Nome da nutri (bloco de boas-vindas)
  const nutriInfo = await prisma.nutricionista.findUnique({ where: { id }, select: { nome: true } });

  // Adesão da clínica semana-a-semana: check-ins (paciente-dia) desta semana vs a anterior,
  // normalizados por (pacientes ativos × 7 dias possíveis).
  const checkins7 = reg30.filter((r) => new Date(r.data) >= ha7).length;
  const checkins14 = reg30.filter((r) => { const d = new Date(r.data); return d >= ha14 && d < ha7; }).length;
  const base = total * 7;
  const aderAtual = base ? Math.round((checkins7 / base) * 100) : 0;
  const aderAnterior = base ? Math.round((checkins14 / base) * 100) : 0;
  const aderenciaSemana = { atual: aderAtual, anterior: aderAnterior, delta: aderAtual - aderAnterior };

  // Hidratação semana-a-semana (% dos check-ins da semana que bateram a meta de água)
  const agua7 = reg30.filter((r) => new Date(r.data) >= ha7 && r.aguaOk).length;
  const agua14 = reg30.filter((r) => { const d = new Date(r.data); return d >= ha14 && d < ha7 && r.aguaOk; }).length;
  const aguaAtual = checkins7 ? Math.round((agua7 / checkins7) * 100) : 0;
  const aguaAnterior = checkins14 ? Math.round((agua14 / checkins14) * 100) : 0;
  const aguaSemana = { atual: aguaAtual, anterior: aguaAnterior, delta: aguaAtual - aguaAnterior };

  // Retenção prevista (estimativa honesta): % de ativos SEM sinal de saída —
  // sequência viva (streak > 0) e check-in nos últimos 3 dias.
  const propensos = pacientes.filter(
    (p) => p.streakAtual > 0 && p.ultimoCheckin && new Date(p.ultimoCheckin) >= ha3
  ).length;
  const retencaoPrevista = total ? Math.round((propensos / total) * 100) : 0;

  // Adesão por hábito POR paciente (30d) → maior dificuldade de cada um
  const HAB: { key: "alimentacao" | "treino" | "agua" | "sono"; col: "alimentacaoOk" | "treinoOk" | "aguaOk" | "sonoOk"; label: string }[] = [
    { key: "alimentacao", col: "alimentacaoOk", label: "Alimentação" },
    { key: "treino", col: "treinoOk", label: "Treino" },
    { key: "agua", col: "aguaOk", label: "Hidratação" },
    { key: "sono", col: "sonoOk", label: "Sono" },
  ];
  const habByPac: Record<string, { n: number; alimentacaoOk: number; treinoOk: number; aguaOk: number; sonoOk: number }> = {};
  for (const r of reg30) {
    let a = habByPac[r.pacienteId];
    if (!a) a = habByPac[r.pacienteId] = { n: 0, alimentacaoOk: 0, treinoOk: 0, aguaOk: 0, sonoOk: 0 };
    a.n++;
    if (r.alimentacaoOk) a.alimentacaoOk++;
    if (r.treinoOk) a.treinoOk++;
    if (r.aguaOk) a.aguaOk++;
    if (r.sonoOk) a.sonoOk++;
  }
  function maiorDificuldade(pid: string) {
    const a = habByPac[pid];
    if (!a || a.n < 3) return null; // amostra insuficiente
    let pior: { habito: string; label: string; pct: number } | null = null;
    for (const h of HAB) {
      const pct = Math.round((a[h.col] / a.n) * 100);
      if (!pior || pct < pior.pct) pior = { habito: h.key, label: h.label, pct };
    }
    return pior;
  }

  const ORDEM_TONE: Record<string, number> = { risco: 0, atencao: 1, ok: 2 };
  const riscoTone = (p: { diasInativo: number; ultimoCheckin: Date | null }) =>
    p.diasInativo >= 3 || !p.ultimoCheckin ? "risco" : p.diasInativo >= 1 ? "atencao" : "ok";

  const pacientesLista = pacientes
    .map((p) => ({
      id: p.id, nome: p.nome, foto: p.fotoPerfilUrl,
      liga: p.ligaAtual, ligaNivel: p.ligaNivel, pontos: p.pontosTotal,
      streak: p.streakAtual, diasInativo: p.diasInativo,
      ultimoCheckin: p.ultimoCheckin,
      score: scoreAderencia30(reg30ByPac[p.id] || 0),
      risco: riscoTone(p),
      maiorDificuldade: maiorDificuldade(p.id),
    }))
    .sort((a, b) => ORDEM_TONE[a.risco] - ORDEM_TONE[b.risco] || b.diasInativo - a.diasInativo || a.score - b.score);

  // Subiram de liga nesta semana (conquistas de promoção nos últimos 7 dias)
  const promos = await prisma.conquista.findMany({
    where: { paciente: { nutricionistaId: id }, tipo: "subiu_liga", createdAt: { gte: ha7 } },
    include: { paciente: { select: { id: true, nome: true, fotoPerfilUrl: true, ligaAtual: true, ligaNivel: true } } },
    orderBy: { createdAt: "desc" },
    take: 8,
  });
  const subiramSemana = promos.map((c) => ({
    id: c.paciente.id, nome: c.paciente.nome, foto: c.paciente.fotoPerfilUrl,
    liga: c.paciente.ligaAtual, ligaNivel: c.paciente.ligaNivel,
  }));

  // Impacto dos desafios (leitura honesta: ativos, participantes, concluídos)
  const desafiosAtivos = await prisma.desafio.findMany({
    where: { nutricionistaId: id, status: "ativo" }, select: { id: true },
  });
  const progressos = desafiosAtivos.length
    ? await prisma.desafioProgresso.findMany({
        where: { desafioId: { in: desafiosAtivos.map((d) => d.id) } },
        select: { pacienteId: true, concluido: true },
      })
    : [];
  const desafiosResumo = {
    ativos: desafiosAtivos.length,
    participantes: new Set(progressos.map((p) => p.pacienteId)).size,
    concluidos: progressos.filter((p) => p.concluido).length,
  };

  res.json({
    nutri: { nome: nutriInfo?.nome ?? "" },
    aderenciaSemana,
    aguaSemana,
    retencaoPrevista,
    pacientesLista,
    subiramSemana,
    desafiosResumo,
    kpis: {
      pacientesAtivos: total,
      novosMes,
      retencao30,
      checkinsHoje: registrosHoje,
      pctCheckins,
      evolucoesSemana,
      emRisco,
      indiceSaude,
      ligaClinica: { liga: ligaClinica.liga, nivel: ligaClinica.nivel, cor: ligaClinica.cor, icone: ligaClinica.icone },
    },
    distribuicaoLigas,
    retencaoMensal,
    topRanking,
    alertas,
    atividadeRecente,
    pedidosAjuste,
    desempenhoCategoria,
    alimentacaoBreakdown,
  });
});

export default router;
