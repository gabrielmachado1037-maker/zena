/**
 * Valida o frontend/vercel.json contra o schema da Vercel.
 *
 * Por que isto existe: em 20/07 um comentario `"//"` dentro de headers[] fez a
 * Vercel recusar a config inteira ("should NOT have additional property"). O
 * deploy do frontend ficou 17 HORAS falhando e ninguem viu, porque o erro
 * acontece na VALIDACAO da config — antes do build — entao:
 *   - `npm run build` local continuava passando (o build nunca era o problema);
 *   - o CI ficava VERDE, dando falsa seguranca enquanto producao congelava.
 *
 * A licao nao e "nao use comentario em JSON": e que nada no pipeline olhava
 * para este arquivo. Agora olha.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const arquivo = path.join(raiz, "vercel.json");

// Chaves aceitas pela Vercel em cada tipo de entrada (as que este projeto usa).
const PERMITIDAS = {
  headers: ["source", "headers", "has", "missing"],
  rewrites: ["source", "destination", "has", "missing"],
  redirects: ["source", "destination", "permanent", "statusCode", "has", "missing"],
};

const erros = [];

if (!fs.existsSync(arquivo)) {
  console.log("vercel.json nao existe — nada a validar.");
  process.exit(0);
}

let cfg;
try {
  cfg = JSON.parse(fs.readFileSync(arquivo, "utf8"));
} catch (e) {
  console.error(`✗ vercel.json nao e JSON valido: ${e.message}`);
  process.exit(1);
}

for (const [secao, permitidas] of Object.entries(PERMITIDAS)) {
  const lista = cfg[secao];
  if (!Array.isArray(lista)) continue;
  lista.forEach((entrada, i) => {
    for (const chave of Object.keys(entrada)) {
      if (!permitidas.includes(chave)) {
        erros.push(
          `${secao}[${i}] tem a propriedade "${chave}", que a Vercel recusa. ` +
            `Permitidas: ${permitidas.join(", ")}. ` +
            (chave === "//"
              ? 'JSON nao aceita comentario — explique no commit, nao no arquivo.'
              : ""),
        );
      }
    }
    // headers[].headers[] so aceita key/value
    if (secao === "headers" && Array.isArray(entrada.headers)) {
      entrada.headers.forEach((h, j) => {
        for (const k of Object.keys(h)) {
          if (k !== "key" && k !== "value") erros.push(`headers[${i}].headers[${j}] tem "${k}" (so key/value).`);
        }
      });
    }
  });
}

if (erros.length) {
  console.error("✗ vercel.json invalido — a Vercel vai RECUSAR o deploy:\n");
  erros.forEach((e) => console.error("  - " + e));
  console.error("\nO deploy falharia na validacao da config, sem log de build.");
  process.exit(1);
}

console.log("✓ vercel.json valido (nenhuma propriedade estranha)");
