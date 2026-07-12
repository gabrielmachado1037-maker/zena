// One-off: normaliza desafios EM ANDAMENTO cujos campos divergem.
// Torna duracaoDias/dataFim/pontosBonus coerentes com a regra (7→5,14→10,21→15).
// Alvo: desafios com dataInicio definido e que ainda não terminaram (dataFim >= hoje ou null).
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const DIA = 86_400_000;
const VALID = [7, 14, 21];
const RECOMPENSA: Record<number, number> = { 7: 5, 14: 10, 21: 15 };
// Piso de dia em UTC (os dados são gravados em meia-noite UTC; o backend roda em UTC).
const inicioDoDia = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
const clampDur = (d: number) => VALID.reduce((b, v) => (Math.abs(v - d) < Math.abs(b - d) ? v : b), VALID[0]);

async function main() {
  const hoje0 = inicioDoDia(new Date());
  const desafios = await prisma.desafio.findMany({
    where: {
      dataInicio: { not: null },
      OR: [{ dataFim: null }, { dataFim: { gte: hoje0 } }],
    },
    select: { id: true, titulo: true, duracaoDias: true, dataInicio: true, dataFim: true, pontosBonus: true },
  });

  let alterados = 0;
  for (const d of desafios) {
    const inicio = inicioDoDia(d.dataInicio!);
    const windowDays = d.dataFim ? Math.round((inicioDoDia(d.dataFim).getTime() - inicio.getTime()) / DIA) : d.duracaoDias;
    const newDur = clampDur(windowDays > 0 ? windowDays : d.duracaoDias);
    const newFim = new Date(inicio.getTime() + newDur * DIA);
    const newXp = RECOMPENSA[newDur] ?? 0;

    const mudou = d.duracaoDias !== newDur
      || d.pontosBonus !== newXp
      || !d.dataFim
      || inicioDoDia(d.dataFim).getTime() !== newFim.getTime();
    if (!mudou) continue;

    console.log(`• ${d.titulo}: dur ${d.duracaoDias}→${newDur} | XP ${d.pontosBonus}→${newXp} | fim ${d.dataFim?.toISOString().slice(0, 10)}→${newFim.toISOString().slice(0, 10)}`);
    await prisma.desafio.update({
      where: { id: d.id },
      data: { duracaoDias: newDur, dataFim: newFim, pontosBonus: newXp },
    });
    alterados++;
  }
  console.log(`\n${alterados} desafio(s) normalizado(s) de ${desafios.length} em andamento.`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
