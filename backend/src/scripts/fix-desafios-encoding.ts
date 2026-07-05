// Corrige desafios com encoding UTF-8 quebrado (caractere U+FFFD).
// Roda: npx ts-node src/scripts/fix-desafios-encoding.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const EMAIL = "teste@nexvel.com.br";
const BAD = "�";

const corrompido = (s: string | null) => !!s && (s.includes(BAD) || s.includes("??"));

async function main() {
  const nutri = await prisma.nutricionista.findUnique({ where: { email: EMAIL }, select: { id: true } });
  if (!nutri) throw new Error(`Nutri ${EMAIL} não encontrada`);

  const desafios = await prisma.desafio.findMany({ where: { nutricionistaId: nutri.id } });
  let fixed = 0;

  for (const d of desafios) {
    if (!corrompido(d.titulo) && !corrompido(d.descricao) && !corrompido(d.icone)) continue;

    // Reparo conhecido: desafio de hidratação.
    if ((d.titulo ?? "").startsWith("Hidrata")) {
      await prisma.desafio.update({
        where: { id: d.id },
        data: { titulo: "Hidratação em 7 dias", descricao: "Beber 2L de água por dia", icone: "💧" },
      });
      console.log(`✔ Corrigido ${d.id}: "${d.titulo}" → "Hidratação em 7 dias"`);
      fixed++;
    } else {
      // Não arrisco reescrever texto que não reconheço — só limpo o ícone corrompido.
      const data: { icone?: string } = {};
      if (corrompido(d.icone)) data.icone = "🎯";
      if (Object.keys(data).length) {
        await prisma.desafio.update({ where: { id: d.id }, data });
        console.log(`✔ Ícone corrigido em ${d.id} (titulo="${d.titulo}") — revise o texto manualmente`);
        fixed++;
      } else {
        console.log(`⚠ Corrompido mas sem regra: ${d.id} titulo="${d.titulo}" — revise manualmente`);
      }
    }
  }
  console.log(`\nOK: ${fixed} desafio(s) corrigido(s) de ${desafios.length} verificado(s).`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
