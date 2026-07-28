// Seed dos 3 nutricionistas parceiros in-house do marketplace.
// Idempotente (upsert por id fixo). O script é a fonte da verdade — edite aqui e re-rode.
//   node scripts/seed-parceiros.mjs
// Lê DATABASE_URL do ambiente/.env (mesma do backend).
//
// PARA COLOCAR NO AR (quando forem nutris REAIS):
//   1. troque nome/especialidade/avaliacao/bio pelos dados reais;
//   2. cole a `walletIdAsaas` de cada um (Asaas) — sem ela a cobrança sai SEM split
//      (100% na plataforma, o parceiro recebe R$0);
//   3. mude `ativo` para true;
//   4. re-rode o script.
// Enquanto `ativo: false`, o parceiro NÃO aparece no marketplace (GET /parceiros filtra ativo:true).
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const PARCEIROS = [
  {
    id: "parceiro-ana",
    nome: "Ana Beatriz Ferraz",
    especialidade: "Emagrecimento e reeducação alimentar",
    avaliacao: 4.9,
    bio: "Especialista em emagrecimento sustentável, com foco em hábitos que cabem na sua rotina.",
    foto: null,
    walletIdAsaas: null,
    ativo: false, // exemplo — troque para true quando for real + walletId setada
  },
  {
    id: "parceiro-bruno",
    nome: "Bruno Tavares",
    especialidade: "Nutrição esportiva e hipertrofia",
    avaliacao: 4.8,
    bio: "Nutrição esportiva para ganho de massa e performance, do iniciante ao avançado.",
    foto: null,
    walletIdAsaas: null,
    ativo: false,
  },
  {
    id: "parceiro-carla",
    nome: "Carla Nunes",
    especialidade: "Saúde da mulher e nutrição clínica",
    avaliacao: 5.0,
    bio: "Nutrição clínica com olhar para a saúde da mulher em todas as fases.",
    foto: null,
    walletIdAsaas: null,
    ativo: false,
  },
];

async function main() {
  for (const p of PARCEIROS) {
    const r = await prisma.nutricionistaParceiro.upsert({
      where: { id: p.id },
      create: p,
      update: {
        nome: p.nome, especialidade: p.especialidade, avaliacao: p.avaliacao,
        bio: p.bio, foto: p.foto, walletIdAsaas: p.walletIdAsaas, ativo: p.ativo,
      },
    });
    console.log(`✓ ${r.nome} (${r.id}) — ${r.ativo ? "ATIVO (visível)" : "oculto"}`);
  }
  const visiveis = await prisma.nutricionistaParceiro.count({ where: { ativo: true } });
  console.log(`\n${PARCEIROS.length} parceiros no banco · ${visiveis} visível(is) no marketplace.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
