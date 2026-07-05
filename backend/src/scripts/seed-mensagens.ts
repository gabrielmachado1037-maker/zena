// Seed idempotente de conversas (MensagemChat) para a tela de Mensagens.
// Roda: npx ts-node src/scripts/seed-mensagens.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const EMAIL = "teste@nexvel.com.br";

// minutos atrás → Date
const min = (m: number) => new Date(Date.now() - m * 60_000);

async function main() {
  const nutri = await prisma.nutricionista.findUnique({
    where: { email: EMAIL },
    select: { id: true, nome: true },
  });
  if (!nutri) throw new Error(`Nutri ${EMAIL} não encontrada`);

  const pacientes = await prisma.paciente.findMany({
    where: { nutricionistaId: nutri.id, ativo: true },
    orderBy: { pontosTotal: "desc" },
    take: 3,
    select: { id: true, nome: true },
  });
  if (pacientes.length === 0) throw new Error("Nenhum paciente ativo para semear conversas");

  // Idempotente: limpa o chat deste nutri antes de recriar.
  await prisma.mensagemChat.deleteMany({ where: { nutricionistaId: nutri.id } });

  const p0 = pacientes[0]!;
  await prisma.mensagemChat.createMany({
    data: [
      { nutricionistaId: nutri.id, pacienteId: p0.id, autor: "paciente", conteudo: "Bom dia! Estou seguindo o plano à risca. O peso deu uma leve estagnada, mas sinto as roupas mais folgadas.", lida: true, criadoEm: min(42) },
      { nutricionistaId: nutri.id, pacienteId: p0.id, autor: "nutri", conteudo: "Excelente notícia! É perfeitamente normal. A composição corporal muitas vezes mascara a perda de peso na balança. O parâmetro das roupas é ótimo.", lida: true, criadoEm: min(37) },
      { nutricionistaId: nutri.id, pacienteId: p0.id, autor: "paciente", conteudo: "Consegui bater as metas hoje! A hidratação foi 100% também.", lida: false, criadoEm: min(3) },
    ],
  });

  if (pacientes[1]) {
    const p1 = pacientes[1];
    await prisma.mensagemChat.createMany({
      data: [
        { nutricionistaId: nutri.id, pacienteId: p1.id, autor: "paciente", conteudo: "Oi! Tenho uma dúvida sobre o pré-treino, posso trocar a fruta por outra?", lida: false, criadoEm: min(1300) },
      ],
    });
  }

  if (pacientes[2]) {
    const p2 = pacientes[2];
    await prisma.mensagemChat.createMany({
      data: [
        { nutricionistaId: nutri.id, pacienteId: p2.id, autor: "nutri", conteudo: "Passando pra lembrar da sua consulta amanhã. Qualquer coisa, me chama por aqui!", lida: true, criadoEm: min(2880) },
        { nutricionistaId: nutri.id, pacienteId: p2.id, autor: "paciente", conteudo: "Combinado, obrigada!", lida: true, criadoEm: min(2875) },
      ],
    });
  }

  const total = await prisma.mensagemChat.count({ where: { nutricionistaId: nutri.id } });
  console.log(`OK: ${total} mensagens semeadas para ${nutri.nome} em ${pacientes.length} conversa(s).`);
  console.log("Pacientes:", pacientes.map((p) => p.nome).join(", "));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
