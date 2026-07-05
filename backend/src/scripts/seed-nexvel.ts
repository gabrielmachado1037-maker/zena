/**
 * Popula dados de gamificação (check-ins/Registro) para a conta de teste do
 * dashboard Nexvel: teste@nexvel.com.br. Idempotente — escopado a essa nutri.
 */
import prisma from "../lib/prisma";

const EMAIL = "teste@nexvel.com.br";

// data em UTC-midnight (Registro.data é @db.Date, unique [pacienteId, data])
const dia = (offset: number) => {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - offset);
  return d;
};

const chance = (p: number) => Math.random() < p;

async function main() {
  const nutri = await prisma.nutricionista.findUnique({ where: { email: EMAIL }, select: { id: true } });
  if (!nutri) throw new Error(`Nutri de teste ${EMAIL} não encontrada`);
  const nutricionistaId = nutri.id;

  // ── pacientes a garantir (upsert por linkUnico) ──────────────────────────
  // Os 3 originais já existem; referenciamos pelos nomes p/ pegar o id.
  const existentes = await prisma.paciente.findMany({
    where: { nutricionistaId },
    select: { id: true, nome: true },
  });
  const idPorNome = new Map(existentes.map((p) => [p.nome, p.id]));

  // novos pacientes p/ completar ligas + casos em risco (nomes do mockup)
  const novos = [
    { link: "nexvel-pedro", nome: "Pedro Prata Lima", liga: "Prata", pontos: 900, ativo: true },
    { link: "nexvel-sofia", nome: "Sofia Mestre Alves", liga: "Mestre", pontos: 4200, ativo: true },
    { link: "nexvel-lucas", nome: "Lucas Lenda Martins", liga: "Lendário", pontos: 6100, ativo: true },
    { link: "nexvel-roberto", nome: "Roberto Mendes", liga: "Prata", pontos: 700, risco: 8 },
    { link: "nexvel-juliana", nome: "Juliana Costa", liga: "Bronze", pontos: 300, risco: 5 },
    { link: "nexvel-helena", nome: "Helena Santos", liga: "Ouro", pontos: 1500, risco: 12 },
  ];

  for (const n of novos) {
    const p = await prisma.paciente.upsert({
      where: { linkUnico: n.link },
      update: { ligaAtual: n.liga, pontosTotal: n.pontos },
      create: {
        nome: n.nome,
        objetivo: "Reeducação alimentar",
        dataInicio: dia(180),
        linkUnico: n.link,
        ligaAtual: n.liga,
        pontosTotal: n.pontos,
        nutricionistaId,
      },
      select: { id: true, nome: true },
    });
    idPorNome.set(p.nome, p.id);
  }

  // classificação: ativos (check-in recente) x em risco (check-in antigo)
  const ativos = ["Bruno Ouro Costa", "Carla Diamante Rocha", "Ana Bronze Silva", "Pedro Prata Lima", "Sofia Mestre Alves", "Lucas Lenda Martins"]
    .map((nome) => idPorNome.get(nome)!)
    .filter(Boolean);
  const emRisco = novos
    .filter((n) => n.risco)
    .map((n) => ({ id: idPorNome.get(n.nome)!, diasInativo: n.risco! }));

  const todosIds = [...ativos, ...emRisco.map((r) => r.id)];

  // ── limpa registros anteriores desses pacientes (idempotência) ───────────
  await prisma.registro.deleteMany({ where: { pacienteId: { in: todosIds } } });

  // ── gera registros ───────────────────────────────────────────────────────
  // ratios de adesão por hábito (aprox. mockup): aliment 94 / água 80 / treino 74 / sono 65
  const registros: {
    pacienteId: string; data: Date; alimentacaoOk: boolean; treinoOk: boolean;
    aguaOk: boolean; sonoOk: boolean; pontosGanhos: number; humor: string;
    pediuAjuste?: boolean; motivoAjuste?: string;
  }[] = [];

  const mkReg = (pacienteId: string, offset: number, extra?: Partial<{ pediuAjuste: boolean; motivoAjuste: string }>) => {
    const alimentacaoOk = chance(0.94), aguaOk = chance(0.8), treinoOk = chance(0.74), sonoOk = chance(0.65);
    const oks = [alimentacaoOk, aguaOk, treinoOk, sonoOk].filter(Boolean).length;
    const humores = ["otimo", "bom", "bom", "neutro", "dificil"];
    registros.push({
      pacienteId, data: dia(offset), alimentacaoOk, treinoOk, aguaOk, sonoOk,
      pontosGanhos: oks * 5, humor: humores[Math.floor(Math.random() * humores.length)],
      pediuAjuste: extra?.pediuAjuste, motivoAjuste: extra?.motivoAjuste,
    });
  };

  // ativos: quase todos os últimos 30 dias + esparso nos 6 meses (retenção)
  for (const id of ativos) {
    for (let off = 0; off <= 30; off++) if (off === 0 || chance(0.86)) mkReg(id, off);
    for (let off = 31; off <= 180; off++) if (chance(0.4)) mkReg(id, off);
  }

  // 2 pedidos de ajuste pendentes (Bruno e Pedro) no check-in mais recente
  const bruno = idPorNome.get("Bruno Ouro Costa");
  const pedro = idPorNome.get("Pedro Prata Lima");
  for (const r of registros) {
    if (r.data.getTime() === dia(0).getTime() && (r.pacienteId === bruno || r.pacienteId === pedro)) {
      r.pediuAjuste = true;
      r.motivoAjuste = r.pacienteId === bruno ? "Treino muito puxado, sem tempo" : "Plano com alimentos que não gosto";
    }
  }

  // em risco: check-ins terminando há N dias (aparecem no Radar), esparsos antes
  for (const { id, diasInativo } of emRisco) {
    for (let off = diasInativo; off <= 90; off++) if (chance(0.35)) mkReg(id, off);
  }

  await prisma.registro.createMany({ data: registros, skipDuplicates: true });

  // ── atualiza campos de gamificação dos pacientes ─────────────────────────
  const streaks: Record<string, number> = {
    "Bruno Ouro Costa": 12, "Carla Diamante Rocha": 28, "Ana Bronze Silva": 3,
    "Pedro Prata Lima": 9, "Sofia Mestre Alves": 21, "Lucas Lenda Martins": 34,
  };
  for (const id of ativos) {
    const nome = [...idPorNome.entries()].find(([, v]) => v === id)?.[0] ?? "";
    await prisma.paciente.update({
      where: { id },
      data: { ultimoCheckin: dia(0), diasInativo: 0, streakAtual: streaks[nome] ?? 5, streakMaximo: (streaks[nome] ?? 5) + 4, ativo: true },
    });
  }
  for (const { id, diasInativo } of emRisco) {
    await prisma.paciente.update({
      where: { id },
      data: { ultimoCheckin: dia(diasInativo), diasInativo, streakAtual: 0, ativo: true },
    });
  }

  // ── planos alimentares (Taxa de Adesão) ──────────────────────────────────
  await prisma.planoAlimentar.deleteMany({ where: { pacienteId: { in: todosIds } } });
  const comPlano = todosIds.slice(0, 8); // 8 de 9 pacientes com plano (~89%)
  await prisma.planoAlimentar.createMany({
    data: comPlano.map((pacienteId) => ({
      pacienteId,
      cafeManha: "Ovos mexidos, aveia e fruta",
      almoco: "Frango grelhado, arroz integral, salada",
      jantar: "Peixe assado com legumes",
      observacoes: "Beber 2L de água por dia",
    })),
  });

  // ── cobranças (Receita Mensal / a receber) ───────────────────────────────
  await prisma.cobranca.deleteMany({ where: { pacienteId: { in: todosIds } } });
  const noMes = (offsetMeses: number, day: number) => {
    const d = new Date();
    d.setUTCHours(12, 0, 0, 0);
    d.setUTCMonth(d.getUTCMonth() + offsetMeses, day);
    return d;
  };
  const valores = [350, 400, 450, 500, 350, 600, 400, 450, 380];
  const cobrancas: { pacienteId: string; valor: number; vencimento: Date; status: string; metodo: string; pagoEm?: Date }[] = [];
  todosIds.forEach((pacienteId, i) => {
    const valor = valores[i % valores.length];
    // pago no mês atual
    cobrancas.push({ pacienteId, valor, vencimento: noMes(0, 5), status: "pago", metodo: "pix", pagoEm: noMes(0, 5) });
    // pago no mês passado (~15% menor → trend de alta realista)
    cobrancas.push({ pacienteId, valor: Math.round(valor * 0.85), vencimento: noMes(-1, 5), status: "pago", metodo: "pix", pagoEm: noMes(-1, 6) });
  });
  // 2 inadimplentes (a receber) — os 2 primeiros em risco
  emRisco.slice(0, 2).forEach(({ id }, i) => {
    cobrancas.push({ pacienteId: id, valor: valores[i], vencimento: noMes(0, 1), status: "pendente", metodo: "pix" });
  });
  await prisma.cobranca.createMany({ data: cobrancas });

  const totalReg = await prisma.registro.count({ where: { pacienteId: { in: todosIds } } });
  console.log(`OK — ${todosIds.length} pacientes | ${totalReg} check-ins | ${comPlano.length} com plano | ${cobrancas.length} cobranças | ${emRisco.length} em risco | 2 pedidos de ajuste`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
