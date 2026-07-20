#!/usr/bin/env node
/**
 * Gera a lista de endpoints que o MCP expõe em `ver_endpoints_api`, lendo as
 * ROTAS REAIS do backend.
 *
 * Por que isto existe: a lista era um array escrito à mão em
 * `mcp-server/index.ts`. Ela envelheceu em silêncio e passou a documentar rotas
 * que não existem (`GET /api/publica/:linkUnico` como auth:false,
 * `POST /api/checkins`, `/api/perfil`) e a errar o nome de rotas que existem
 * (`forgot-password` em vez de `esqueci-senha`). Uma IA lendo essa lista pela
 * ferramenta do MCP gerou uma auditoria de segurança inteira para um portal
 * público que nunca foi escrito.
 *
 * Um documento que mente sobre a API é pior que documento nenhum: ninguém
 * duvida dele, e o custo aparece como trabalho fantasma semanas depois.
 *
 * As DESCRIÇÕES continuam sendo escritas à mão (o código não sabe explicar o
 * que a rota faz para um humano), mas ficam num mapa indexado pela rota real —
 * então uma descrição órfã denuncia rota que sumiu, e uma rota sem descrição
 * denuncia rota nova ainda não documentada.
 *
 *   node scripts/gerar-endpoints.mjs           # escreve o arquivo
 *   node scripts/gerar-endpoints.mjs --check   # só verifica se está sincronizado
 *
 * O `npm run seguranca` chama gerarEndpoints() e reprova se houver divergência.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const destino = join(raiz, "..", "mcp-server", "endpoints.generated.ts");

/** Descrições humanas, indexadas por "METODO /rota". Rota que não estiver aqui
 *  é gerada mesmo assim, com desc vazia, e o --check avisa. */
const DESCRICOES = {
  "POST /api/auth/register": "Cadastro de nutricionista",
  "POST /api/auth/login": "Login da nutricionista (retorna access + refresh)",
  "POST /api/auth/refresh": "Troca refresh por novo par de tokens",
  "POST /api/auth/logout": "Revoga o refresh token",
  "POST /api/auth/esqueci-senha": "Envia e-mail de redefinição de senha",
  "POST /api/auth/redefinir-senha": "Redefine a senha usando o token do e-mail",
  "POST /api/auth/verificar-email": "Confirma o e-mail pelo token",
  "POST /api/auth/reenviar-verificacao": "Reenvia o e-mail de verificação",
  "GET /api/auth/me": "Dados da nutricionista logada",
  "PUT /api/auth/perfil": "Atualiza o perfil da nutricionista",
  "GET /api/auth/exportar": "Exporta os dados da conta (LGPD)",
  "DELETE /api/auth/conta": "Exclui a conta (LGPD)",
  "GET /api/pacientes": "Lista pacientes com paginação (busca, status, limit, page)",
  "POST /api/pacientes": "Cria paciente (gera convite individual)",
  "GET /api/pacientes/:id": "Dados completos do paciente",
  "PUT /api/pacientes/:id": "Atualiza paciente",
  "DELETE /api/pacientes/:id": "Anonimiza e desativa o paciente (LGPD)",
  "POST /api/pacientes/:id/convite": "(Re)gera o convite individual do paciente",
  "GET /api/pacientes/:id/relatorio-mensal": "Relatório mensal (base do PDF)",
  "GET /api/dashboard": "Métricas resumo do dashboard",
  "GET /api/consultas": "Lista consultas (inicio, fim)",
  "POST /api/consultas": "Cria consulta",
  "GET /api/financeiro/dashboard": "Resumo financeiro da clínica",
  "GET /api/ranking": "Ranking de pacientes",
  "GET /api/feed": "Feed de posts dos pacientes",
  "GET /api/horarios": "Horários de atendimento",
  "GET /api/relatorios": "Insights agregados da carteira",
  "POST /api/registros": "Check-in do dia do paciente (one-shot, 409 se repetido)",
};

const VERBOS = "get|post|put|patch|delete";

const AUTH_MW = /(authMiddleware|authPacienteMiddleware)/;

/** Descobre os routers montados: app.use("/api/x", yRouter) + o import de y.
 *  O import pode ter named imports junto (`import r, { x } from …`) — billing é
 *  assim, e ignorar essa forma fazia o router INTEIRO sumir da lista. */
function routersMontados(indexSrc) {
  const arquivos = {};
  const reImport = /^import\s+(\w+)\s*(?:,\s*\{[^}]*\})?\s+from\s+"\.\/(routes\/\w+)"/gm;
  for (const m of indexSrc.matchAll(reImport)) arquivos[m[1]] = m[2];

  const montados = [];
  for (const m of indexSrc.matchAll(/app\.use\(\s*"(\/api[^"]*)"\s*,\s*(\w+)\s*\)/g)) {
    const arquivo = arquivos[m[2]];
    if (arquivo) montados.push({ prefixo: m[1], arquivo });
  }
  return montados;
}

/** Caminhos de uma rota: `"/x"` ou a forma em array `["/:id", "/"]`. */
function caminhosDe(literal) {
  if (!literal.trim().startsWith("[")) return [literal.replace(/^"|"$/g, "")];
  return [...literal.matchAll(/"([^"]*)"/g)].map((m) => m[1]);
}

/** Uma rota é pública quando nem um `router.use(auth…)` ANTERIOR a ela nem a
 *  própria linha exigem auth. A posição importa: billing/notificacoes definem
 *  rotas públicas antes do `router.use`, e tratar o arquivo inteiro como
 *  protegido marcaria um webhook aberto como autenticado — exatamente o tipo de
 *  mentira que este gerador existe para impedir. */
function extrairRotas(src, prefixo) {
  const cortesAuth = [...src.matchAll(/router\.use\(\s*(authMiddleware|authPacienteMiddleware)\s*\)/g)].map(
    (m) => m.index,
  );
  const rotas = [];
  const re = new RegExp(`router\\.(${VERBOS})\\(\\s*("[^"]*"|\\[[^\\]]*\\])([^\\n]*)`, "g");
  for (const m of src.matchAll(re)) {
    const [, verbo, literal, resto] = m;
    const protegidaAntes = cortesAuth.some((pos) => pos < m.index);
    for (const caminho of caminhosDe(literal)) {
      rotas.push({
        metodo: verbo.toUpperCase(),
        rota: caminho === "/" ? prefixo : `${prefixo}${caminho}`,
        auth: protegidaAntes || AUTH_MW.test(resto),
      });
    }
  }
  return rotas;
}

/** Rotas penduradas direto no app (fora de router): webhook do Stripe, health.
 *  São justamente as públicas — omiti-las era o furo mais grave. */
function rotasNoApp(indexSrc) {
  const rotas = [];
  const re = new RegExp(`app\\.(${VERBOS})\\(\\s*"(\\/api[^"]*)"([^\\n]*)`, "g");
  for (const m of indexSrc.matchAll(re)) {
    rotas.push({ metodo: m[1].toUpperCase(), rota: m[2], auth: AUTH_MW.test(m[3]) });
  }
  return rotas;
}

export function gerarEndpoints() {
  const indexSrc = readFileSync(join(raiz, "src", "index.ts"), "utf8");
  const todas = [...rotasNoApp(indexSrc)];
  for (const { prefixo, arquivo } of routersMontados(indexSrc)) {
    const caminho = join(raiz, "src", `${arquivo}.ts`);
    if (!existsSync(caminho)) continue;
    todas.push(...extrairRotas(readFileSync(caminho, "utf8"), prefixo));
  }
  todas.sort((a, b) => a.rota.localeCompare(b.rota) || a.metodo.localeCompare(b.metodo));
  return todas.map((e) => ({ ...e, desc: DESCRICOES[`${e.metodo} ${e.rota}`] ?? "" }));
}

function renderizar(endpoints) {
  const linhas = endpoints
    .map((e) => `  ${JSON.stringify(e)},`)
    .join("\n");
  return `// GERADO por backend/scripts/gerar-endpoints.mjs — NÃO EDITE À MÃO.
// A lista anterior era mantida manualmente e passou a documentar rotas
// inexistentes. Para mudar uma descrição, edite DESCRICOES no gerador e rode
// \`npm run endpoints\` no backend.
export const ENDPOINTS_API = [
${linhas}
] as const;
`;
}

/** null = sincronizado; string = o que está errado. Usado pelo npm run seguranca. */
export function verificarSincronia() {
  if (!existsSync(destino)) return "mcp-server/endpoints.generated.ts não existe — rode `npm run endpoints`";
  const esperado = renderizar(gerarEndpoints());
  if (readFileSync(destino, "utf8") !== esperado)
    return "mcp-server/endpoints.generated.ts diverge das rotas reais — rode `npm run endpoints`";
  return null;
}

/** Rotas geradas que ninguém descreveu, e descrições que perderam a rota. */
export function divergenciasDeDescricao(endpoints) {
  const chaves = new Set(endpoints.map((e) => `${e.metodo} ${e.rota}`));
  return {
    orfas: Object.keys(DESCRICOES).filter((k) => !chaves.has(k)),
  };
}

// pathToFileURL: no Windows o caminho vira file:///C:/... e a comparação
// ingênua com `file://${argv[1]}` nunca casa (uma barra a menos, sem escape).
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const endpoints = gerarEndpoints();
  const conteudo = renderizar(endpoints);
  const checar = process.argv.includes("--check");
  const atual = existsSync(destino) ? readFileSync(destino, "utf8") : null;

  if (checar) {
    if (atual !== conteudo) {
      console.error("endpoints.generated.ts está fora de sincronia com as rotas reais.");
      console.error("Rode: npm run endpoints");
      process.exit(1);
    }
    console.log(`endpoints.generated.ts sincronizado (${endpoints.length} rotas).`);
  } else {
    writeFileSync(destino, conteudo);
    console.log(`✓ ${endpoints.length} rotas escritas em mcp-server/endpoints.generated.ts`);
  }

  const { orfas } = divergenciasDeDescricao(endpoints);
  if (orfas.length) {
    console.warn(`\n⚠️  ${orfas.length} descrição(ões) sem rota correspondente (rota removida ou renomeada?):`);
    for (const o of orfas) console.warn(`    ${o}`);
  }
  const semDesc = endpoints.filter((e) => !e.desc).length;
  if (semDesc) console.log(`\n(${semDesc} rotas sem descrição — opcional, adicione em DESCRICOES quando fizer sentido)`);
}
