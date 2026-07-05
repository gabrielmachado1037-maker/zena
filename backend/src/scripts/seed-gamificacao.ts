// Seed idempotente de gamificação (PontosLog + Conquista + StreakMarco) para dar
// corpo à aba "Liga & Pontos". Roda: npx ts-node src/scripts/seed-gamificacao.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const EMAIL = "teste@nexvel.com.br";

const dayAgo = (n: number) => {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - n);
  return d;
};

async function main() {
  const nutri = await prisma.nutricionista.findUnique({ where: { email: EMAIL }, select: { id: true } });
  if (!nutri) throw new Error(`Nutri ${EMAIL} não encontrada`);

  const pacientes = await prisma.paciente.findMany({
    where: { nutricionistaId: nutri.id, ativo: true },
    orderBy: { pontosTotal: "desc" },
    take: 6,
    select: { id: true, nome: true, streakAtual: true },
  });
  if (!pacientes.length) throw new Error("Nenhum paciente ativo");

  const ids = pacientes.map((p) => p.id);
  const ciclo = await prisma.ciclo.findFirst({ where: { nutricionistaId: nutri.id }, select: { id: true } });

  // Idempotente
  await prisma.pontosLog.deleteMany({ where: { pacienteId: { in: ids } } });
  await prisma.conquista.deleteMany({ where: { pacienteId: { in: ids } } });
  if (ciclo) await prisma.streakMarco.deleteMany({ where: { pacienteId: { in: ids } } });

  for (const p of pacientes) {
    // PontosLog — check-ins diários + eventos pontuais nos últimos 30 dias.
    const logs: { pacienteId: string; tipo: string; pontos: number; data: Date }[] = [];
    for (let i = 0; i < 20; i++) logs.push({ pacienteId: p.id, tipo: "checkin", pontos: 10, data: dayAgo(i) });
    logs.push({ pacienteId: p.id, tipo: "desafio", pontos: 120, data: dayAgo(3) });
    logs.push({ pacienteId: p.id, tipo: "desafio", pontos: 50, data: dayAgo(10) });
    logs.push({ pacienteId: p.id, tipo: "streak", pontos: 80, data: dayAgo(7) });
    logs.push({ pacienteId: p.id, tipo: "bonus", pontos: 40, data: dayAgo(1) });
    logs.push({ pacienteId: p.id, tipo: "liga", pontos: 200, data: dayAgo(14) });
    await prisma.pontosLog.createMany({ data: logs });

    // Conquistas
    await prisma.conquista.createMany({
      data: [
        { pacienteId: p.id, tipo: "sequencia_7", titulo: "Sequência de 7 dias", descricao: "7 check-ins seguidos", icone: "🔥", pontosBonus: 50 },
        { pacienteId: p.id, tipo: "subiu_liga", titulo: "Subiu de Liga", descricao: "Promovido para uma nova liga", icone: "🏆", pontosBonus: 100 },
        { pacienteId: p.id, tipo: "desafio_concluido", titulo: "Desafio Concluído", descricao: "Completou um desafio semanal", icone: "🎯", pontosBonus: 120 },
      ],
    });

    // StreakMarco — só se houver ciclo (o model exige cicloId).
    if (ciclo) {
      const marcos = [7, 14, 21].filter((m) => m <= (p.streakAtual || 30));
      if (marcos.length) {
        await prisma.streakMarco.createMany({
          data: marcos.map((m) => ({ pacienteId: p.id, cicloId: ciclo.id, marco: m, pontosBonus: m * 5 })),
          skipDuplicates: true,
        });
      }
    }
  }

  const totalLogs = await prisma.pontosLog.count({ where: { pacienteId: { in: ids } } });
  const totalConq = await prisma.conquista.count({ where: { pacienteId: { in: ids } } });
  console.log(`OK: ${totalLogs} pontosLog + ${totalConq} conquistas${ciclo ? " + streakMarcos" : ""} para ${pacientes.length} pacientes.`);
  if (!ciclo) console.log("Sem Ciclo para o nutri — StreakMarcos não semeados (marcos exigem cicloId).");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
