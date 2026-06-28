import { Router, Response } from "express";
import prisma from "../lib/prisma";
import { authMiddleware, AuthRequest } from "../middleware/auth";

const router = Router();
router.use(authMiddleware);

router.get("/", async (req: AuthRequest, res: Response) => {
  const now = new Date();
  const mes = now.getMonth();
  const ano = now.getFullYear();
  const inicioMes = new Date(ano, mes, 1);
  const fimMes = new Date(ano, mes + 1, 0, 23, 59, 59);
  const inicioHoje = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const fimHoje = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  const ha30dias = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [pacientesAtivos, consultasHoje, cobrancasMes, semConsulta, totalConsultas, nutri, totalCobrancas, totalPlanos, pacientesComMedicoes] = await Promise.all([
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

export default router;
