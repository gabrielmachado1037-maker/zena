// Seed dos 3 nutricionistas parceiros in-house do marketplace.
// Idempotente (upsert por id fixo). Rode UMA vez após aplicar a migration:
//   node scripts/seed-parceiros.mjs
// Lê DATABASE_URL do ambiente/.env (mesma do backend).
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// walletIdAsaas: cole aqui a walletId de cada parceiro no Asaas para ligar o split
// (R$150 → parceiro). Sem ela, a cobrança é criada sem split (100% na plataforma).
const PARCEIROS = [
  {
    id: "parceiro-ana",
    nome: "Ana Beatriz Ferraz",
    especialidade: "Emagrecimento e reeducação alimentar",
    avaliacao: 4.9,
    bio: "Especialista em emagrecimento sustentável, com foco em hábitos que cabem na sua rotina.",
    foto: null,
    walletIdAsaas: null,
  },
  {
    id: "parceiro-bruno",
    nome: "Bruno Tavares",
    especialidade: "Nutrição esportiva e hipertrofia",
    avaliacao: 4.8,
    bio: "Nutrição esportiva para ganho de massa e performance, do iniciante ao avançado.",
    foto: null,
    walletIdAsaas: null,
  },
  {
    id: "parceiro-carla",
    nome: "Carla Nunes",
    especialidade: "Saúde da mulher e nutrição clínica",
    avaliacao: 5.0,
    bio: "Nutrição clínica com olhar para a saúde da mulher em todas as fases.",
    foto: null,
    walletIdAsaas: null,
  },
];

async function main() {
  for (const p of PARCEIROS) {
    const r = await prisma.nutricionistaParceiro.upsert({
      where: { id: p.id },
      create: { ...p, ativo: true },
      update: { nome: p.nome, especialidade: p.especialidade, avaliacao: p.avaliacao, bio: p.bio, ativo: true },
    });
    console.log(`✓ ${r.nome} (${r.id})`);
  }
  console.log(`\n${PARCEIROS.length} parceiros prontos.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
