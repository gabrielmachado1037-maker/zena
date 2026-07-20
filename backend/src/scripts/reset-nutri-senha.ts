import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { hashSenha } from "../lib/senha";

const prisma = new PrismaClient();
const EMAIL = "teste@nexvel.com.br";
const NOVA = "nexvel123";

async function main() {
  const nutri = await prisma.nutricionista.findUnique({ where: { email: EMAIL }, select: { id: true, nome: true } });
  if (!nutri) throw new Error(`Nutri ${EMAIL} não encontrada`);
  const hash = await hashSenha(NOVA);
  await prisma.nutricionista.update({ where: { email: EMAIL }, data: { senha: hash } });
  console.log(`OK — senha de ${EMAIL} (${nutri.nome}) resetada para: ${NOVA}`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
