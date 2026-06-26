import prisma from "./lib/prisma";
import bcrypt from "bcryptjs";

async function main() {
  const senha = await bcrypt.hash("zena123", 10);

  const nutri = await prisma.nutricionista.upsert({
    where: { email: "ana@zena.app" },
    update: {},
    create: { nome: "Ana Beatriz Silva", email: "ana@zena.app", senha, crn: "CRN-3 12345" },
  });

  const p1 = await prisma.paciente.upsert({
    where: { linkUnico: "demo-link-maria" },
    update: {},
    create: {
      nome: "Maria Clara Santos",
      email: "maria@email.com",
      telefone: "11999990001",
      objetivo: "Emagrecimento e melhora da composição corporal",
      dataInicio: new Date("2024-01-15"),
      linkUnico: "demo-link-maria",
      pesoMeta: 62,
      nutricionistaId: nutri.id,
    },
  });

  const p2 = await prisma.paciente.upsert({
    where: { linkUnico: "demo-link-julia" },
    update: {},
    create: {
      nome: "Júlia Fernandes",
      email: "julia@email.com",
      telefone: "11999990002",
      objetivo: "Ganho de massa muscular",
      dataInicio: new Date("2024-03-01"),
      linkUnico: "demo-link-julia",
      pesoMeta: 58,
      nutricionistaId: nutri.id,
    },
  });

  const p3 = await prisma.paciente.upsert({
    where: { linkUnico: "demo-link-carol" },
    update: {},
    create: {
      nome: "Carolina Ribeiro",
      email: "carol@email.com",
      telefone: "11999990003",
      objetivo: "Reeducação alimentar",
      dataInicio: new Date("2024-02-10"),
      linkUnico: "demo-link-carol",
      pesoMeta: 70,
      nutricionistaId: nutri.id,
    },
  });

  const medicoes = [
    { pacienteId: p1.id, data: new Date("2024-01-15"), peso: 72, gordura: 34, musculo: 28 },
    { pacienteId: p1.id, data: new Date("2024-02-15"), peso: 70.2, gordura: 32, musculo: 29 },
    { pacienteId: p1.id, data: new Date("2024-03-15"), peso: 68.5, gordura: 30, musculo: 30 },
    { pacienteId: p1.id, data: new Date("2024-04-15"), peso: 66.8, gordura: 28, musculo: 31 },
    { pacienteId: p1.id, data: new Date("2024-05-15"), peso: 65.1, gordura: 26, musculo: 32 },
    { pacienteId: p2.id, data: new Date("2024-03-01"), peso: 52, gordura: 22, musculo: 35 },
    { pacienteId: p2.id, data: new Date("2024-04-01"), peso: 53.5, gordura: 21, musculo: 37 },
    { pacienteId: p2.id, data: new Date("2024-05-01"), peso: 55, gordura: 20, musculo: 39 },
    { pacienteId: p3.id, data: new Date("2024-02-10"), peso: 74, gordura: 36, musculo: 27 },
    { pacienteId: p3.id, data: new Date("2024-03-10"), peso: 72.5, gordura: 34, musculo: 28 },
  ];

  for (const m of medicoes) {
    await prisma.medicao.create({ data: m });
  }

  await prisma.planoAlimentar.create({
    data: {
      pacienteId: p1.id,
      cafeManha: "2 fatias de pão integral + 2 ovos mexidos + 1 copo de suco de laranja natural",
      lancheManha: "1 banana + 10 amêndoas",
      almoco: "4 col. de arroz integral + 1 concha de feijão + 150g frango grelhado + salada verde à vontade + azeite",
      lancheTarde: "1 iogurte grego natural + 1 colher de granola",
      jantar: "Sopa de legumes com frango ou omelete com 2 ovos + salada",
      ceia: "1 copo de leite morno desnatado",
      observacoes: "Evitar frituras e alimentos ultraprocessados. Beber no mínimo 2L de água por dia.",
    },
  });

  const agora = new Date();
  const amanha = new Date(agora.getTime() + 24 * 60 * 60 * 1000);
  const proximaSemana = new Date(agora.getTime() + 7 * 24 * 60 * 60 * 1000);

  await prisma.consulta.createMany({
    data: [
      { pacienteId: p1.id, data: new Date(agora.getFullYear(), agora.getMonth(), agora.getDate(), 9, 0), status: "confirmada", notas: "Retorno mensal" },
      { pacienteId: p2.id, data: new Date(agora.getFullYear(), agora.getMonth(), agora.getDate(), 10, 30), status: "agendada" },
      { pacienteId: p3.id, data: new Date(amanha.getFullYear(), amanha.getMonth(), amanha.getDate(), 14, 0), status: "agendada" },
      { pacienteId: p1.id, data: proximaSemana, status: "agendada" },
    ],
  });

  await prisma.cobranca.createMany({
    data: [
      { pacienteId: p1.id, valor: 180, vencimento: new Date(agora.getFullYear(), agora.getMonth(), 5), status: "pago", metodo: "pix", pagoEm: new Date(agora.getFullYear(), agora.getMonth(), 5) },
      { pacienteId: p2.id, valor: 180, vencimento: new Date(agora.getFullYear(), agora.getMonth(), 10), status: "pago", metodo: "pix", pagoEm: new Date(agora.getFullYear(), agora.getMonth(), 10) },
      { pacienteId: p3.id, valor: 180, vencimento: new Date(agora.getFullYear(), agora.getMonth(), 15), status: "pendente", metodo: "pix" },
      { pacienteId: p1.id, valor: 180, vencimento: new Date(agora.getFullYear(), agora.getMonth() - 1, 5), status: "pago", metodo: "dinheiro", pagoEm: new Date(agora.getFullYear(), agora.getMonth() - 1, 6) },
    ],
  });

  console.log("Seed concluído! Login: ana@zena.app / zena123");
}

main().catch(console.error).finally(() => prisma.$disconnect());
