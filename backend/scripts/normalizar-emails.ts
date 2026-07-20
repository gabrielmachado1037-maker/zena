/**
 * Normaliza e-mails existentes para minúsculo.
 *
 * Por padrão só RELATA. Para aplicar: `npx tsx scripts/normalizar-emails.ts --aplicar`
 *
 * Contexto: cadastro/login gravavam o e-mail como digitado, então existem (ou
 * podem existir) contas com maiúscula. O código já foi corrigido para buscar de
 * forma insensível a caixa — ninguém está travado hoje —, mas enquanto o dado
 * estiver misturado sobra um risco: a unicidade do Postgres É sensível a caixa,
 * então `Ana@x.com` e `ana@x.com` coexistem como contas DIFERENTES, e a busca
 * insensível encontra uma delas de forma arbitrária. Quem tiver a outra pode
 * ficar sem conseguir entrar.
 *
 * Por isso o script se recusa a aplicar quando detecta colisão: juntar duas
 * contas reais (com pacientes, prontuário e cobranças de cada lado) não é
 * decisão de script — é decisão de quem conhece o negócio.
 */
import prisma from "../src/lib/prisma";

const aplicar = process.argv.includes("--aplicar");

type Linha = { id: string; email: string };

function agruparPorMinusculo(linhas: Linha[]) {
  const mapa = new Map<string, Linha[]>();
  for (const l of linhas) {
    const chave = l.email.trim().toLowerCase();
    mapa.set(chave, [...(mapa.get(chave) ?? []), l]);
  }
  return mapa;
}

async function processar(nome: string, linhas: Linha[], atualizar: (id: string, email: string) => Promise<unknown>) {
  const grupos = agruparPorMinusculo(linhas);
  const colisoes = [...grupos.entries()].filter(([, v]) => v.length > 1);
  const paraNormalizar = linhas.filter((l) => l.email !== l.email.trim().toLowerCase());

  console.log(`\n── ${nome} ──`);
  console.log(`  total: ${linhas.length}`);
  console.log(`  fora do padrão (maiúscula/espaço): ${paraNormalizar.length}`);
  console.log(`  colisões (mesmo e-mail em caixas diferentes): ${colisoes.length}`);

  for (const [chave, v] of colisoes) {
    console.log(`    ⚠️  ${chave} → ${v.length} contas: ${v.map((x) => `${x.id} (${x.email})`).join(", ")}`);
  }

  if (colisoes.length > 0) {
    console.log(`  ⛔ ${nome}: NÃO vou normalizar — juntar contas distintas exige decisão humana.`);
    return { alterados: 0, bloqueado: true };
  }
  if (paraNormalizar.length === 0) return { alterados: 0, bloqueado: false };
  if (!aplicar) {
    console.log(`  (relatório apenas — rode com --aplicar para gravar)`);
    for (const l of paraNormalizar.slice(0, 10)) console.log(`    ${l.email} → ${l.email.trim().toLowerCase()}`);
    if (paraNormalizar.length > 10) console.log(`    … e mais ${paraNormalizar.length - 10}`);
    return { alterados: 0, bloqueado: false };
  }

  for (const l of paraNormalizar) await atualizar(l.id, l.email.trim().toLowerCase());
  console.log(`  ✓ ${paraNormalizar.length} normalizados.`);
  return { alterados: paraNormalizar.length, bloqueado: false };
}

(async () => {
  console.log(aplicar ? "MODO: aplicar (vai gravar)" : "MODO: relatório (não grava nada)");

  const nutris = await prisma.nutricionista.findMany({ select: { id: true, email: true } });
  const r1 = await processar("Nutricionistas", nutris, (id, email) =>
    prisma.nutricionista.update({ where: { id }, data: { email } }),
  );

  const pacientes = await prisma.pacienteUser.findMany({ select: { id: true, email: true } });
  const r2 = await processar("PacienteUser", pacientes, (id, email) =>
    prisma.pacienteUser.update({ where: { id }, data: { email } }),
  );

  console.log(
    `\nResumo: ${r1.alterados + r2.alterados} alterados.` +
      (r1.bloqueado || r2.bloqueado ? " Há colisões pendentes de decisão — nada foi alterado nas tabelas afetadas." : ""),
  );
})()
  .catch((e) => {
    console.error("Falhou:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
