#!/usr/bin/env node
/**
 * Checagem de segurança do código — roda no CI a cada push e localmente com
 * `npm run seguranca`.
 *
 * Cada checagem aqui corresponde a um incidente REAL que já aconteceu neste
 * projeto. A ideia não é adivinhar vulnerabilidades novas (auditoria faz
 * isso); é garantir que as antigas não voltem em silêncio, que foi o padrão
 * que se repetiu: código correto, proteção removida sem ninguém notar.
 *
 * Falha = exit 1. Não use `|| true` no CI: uma checagem que não pode
 * reprovar é uma checagem que não existe.
 */
import { readFileSync, existsSync } from "node:fs";
import { verificarSincronia } from "./gerar-endpoints.mjs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const ler = (p) => (existsSync(join(raiz, p)) ? readFileSync(join(raiz, p), "utf8") : null);

const checagens = [];
const checar = (nome, incidente, fn) => checagens.push({ nome, incidente, fn });

checar(
  "trust proxy configurado",
  "Sem isso, req.ip é o IP do proxy da Render para todos: os rate limiters viram um balde global e 5 logins errados travam TODAS as contas.",
  () => {
    const src = ler("src/index.ts") ?? "";
    if (!/app\.set\(\s*["']trust proxy["']/.test(src)) return "app.set('trust proxy', …) sumiu do index.ts";
    if (/app\.set\(\s*["']trust proxy["']\s*,\s*true\s*\)/.test(src))
      return "trust proxy está como `true` — o cliente forja X-Forwarded-For e escapa do rate limit. Use o número de hops.";
    return null;
  },
);

checar(
  "encrypt() recusa gravar sem chave",
  "encrypt() devolvia texto puro sem ENCRYPTION_KEY: a chave Asaas do nutri ia para o banco legível, sem erro.",
  () => {
    const src = ler("src/lib/crypto.ts") ?? "";
    const corpo = src.slice(src.indexOf("export function encrypt"), src.indexOf("export function decrypt"));
    if (!/throw new Error/.test(corpo)) return "encrypt() não lança mais quando falta a chave";
    return null;
  },
);

checar(
  "webhooks Asaas continuam fail-closed",
  "ASAAS_WEBHOOK_TOKEN ausente rejeitava 100% dos webhooks — mas o inverso (aceitar sem token) perderia pagamento e liberaria plano de graça.",
  () => {
    for (const arq of ["src/routes/billing.ts", "src/routes/financeiro.ts"]) {
      const src = ler(arq) ?? "";
      if (!/!expected/.test(src)) return `${arq}: sumiu a checagem de token ausente (!expected) antes da comparação`;
    }
    return null;
  },
);

checar(
  "troca de senha revoga sessões",
  "Trocar a senha não revogava refresh token (TTL 30 dias): quem invadiu seguia dentro por um mês depois da 'contenção'.",
  () => {
    const alvos = [
      ["src/routes/auth.ts", /refreshToken\.updateMany/],
      ["src/routes/authPaciente.ts", /refreshTokenPaciente\.updateMany/],
      ["src/routes/pacienteApp.ts", /refreshTokenPaciente\.updateMany/],
    ];
    for (const [arq, padrao] of alvos) {
      if (!padrao.test(ler(arq) ?? "")) return `${arq}: não revoga mais refresh token na troca de senha`;
    }
    return null;
  },
);

checar(
  "push não pode ser sequestrado",
  "O upsert por `endpoint` cru deixava qualquer conta reescrever o dono e receber as notificações da vítima.",
  () => {
    for (const arq of ["src/routes/notificacoes.ts", "src/routes/pacienteApp.ts"]) {
      if (!/endpoint_de_outra_conta/.test(ler(arq) ?? "")) return `${arq}: sumiu a recusa de takeover de endpoint`;
    }
    return null;
  },
);

checar(
  "caminho de foto não é adivinhável",
  "Fotos de corpo ficavam em <pacienteId>/<ano>/<mes>/frente.jpg num bucket público — qualquer paciente montava a URL das fotos dos colegas.",
  () => {
    const src = ler("src/routes/registroFotos.ts") ?? "";
    if (!/randomBytes/.test(src)) return "o caminho do upload voltou a ser previsível (sem componente aleatório)";
    return null;
  },
);

checar(
  "delete de storage é verificado",
  "deleteFoto ignorava res.ok: a linha do banco sumia, a foto seguia baixável no bucket público, e o usuário recebia confirmação de exclusão LGPD.",
  () => {
    const src = ler("src/lib/supabase.ts") ?? "";
    if (!/conferirDelete/.test(src)) return "sumiu a conferência do resultado do DELETE no storage";
    return null;
  },
);

checar(
  "assinatura de mídia montada",
  "Os buckets de fotos são PRIVADOS. Sem este middleware, o app devolve URL pública e TODAS as imagens somem — foto de perfil, feed, evolução.",
  () => {
    const src = ler("src/index.ts") ?? "";
    if (!/app\.use\(\s*assinarMidia\s*\)/.test(src)) return "app.use(assinarMidia) sumiu do index.ts";
    // Precisa vir antes das rotas: montado depois, res.json já foi chamado.
    const posMiddleware = src.indexOf("app.use(assinarMidia)");
    const posPrimeiraRota = src.indexOf('app.use("/api/');
    if (posPrimeiraRota !== -1 && posMiddleware > posPrimeiraRota)
      return "assinarMidia está montado DEPOIS das rotas — não intercepta nada";
    return null;
  },
);

checar(
  "verificação de segurança roda no boot",
  "É o que denuncia trust proxy desligado, ASAAS_ENV em sandbox e JWT_SECRET fraco. Sem a chamada, o arquivo existe e nunca executa.",
  () => {
    const src = ler("src/index.ts") ?? "";
    if (!/verificarSeguranca\s*\(\s*app\s*\)/.test(src)) return "verificarSeguranca(app) não é mais chamado no boot";
    return null;
  },
);

checar(
  ".dockerignore protege o .env",
  "COPY . . sem .dockerignore embute o .env com segredos reais numa camada da imagem, legível por docker history.",
  () => {
    const di = ler(".dockerignore");
    if (!di) return ".dockerignore não existe";
    for (const alvo of [".env", "node_modules"]) {
      if (!di.split(/\r?\n/).some((l) => l.trim() === alvo)) return `.dockerignore não ignora ${alvo}`;
    }
    return null;
  },
);

checar(
  "segredo não versionado",
  "Higiene básica: um .env commitado vaza tudo de uma vez e o histórico do Git é para sempre.",
  () => {
    const gi = ler("../.gitignore") ?? ler(".gitignore") ?? "";
    if (!/(^|\n)\s*\*?\*?\/?\.env\b/.test(gi)) return ".env não aparece no .gitignore";
    return null;
  },
);

checar(
  "login tem trava por conta, não só por IP",
  "Limiter só por IP não vê ataque distribuído: um IP por tentativa gasta 1 das 5 e o número de chutes contra uma conta específica fica ilimitado.",
  () => {
    const lib = ler("src/lib/limitePorConta.ts");
    if (!lib) return "src/lib/limitePorConta.ts sumiu";
    if (!/skipSuccessfulRequests:\s*true/.test(lib))
      return "skipSuccessfulRequests saiu: acerto de senha voltaria a contar e o uso normal chegaria ao teto";
    if (!/keyGenerator/.test(lib) || !/normalizarEmail/.test(lib))
      return "a chave deixou de ser o e-mail normalizado — variação de caixa driblaria a trava";
    for (const arq of ["src/routes/auth.ts", "src/routes/authPaciente.ts"]) {
      const src = ler(arq) ?? "";
      if (!/router\.post\(\s*["']\/login["'][^\n]*loginPorConta/.test(src))
        return `${arq}: POST /login não passa mais por loginPorConta`;
    }
    return null;
  },
);

checar(
  "MCP documenta as rotas REAIS",
  "A lista de endpoints do MCP era mantida à mão e envelheceu: documentava um portal público /api/publica/:linkUnico (auth:false) que nunca existiu e um POST /api/checkins inexistente. Uma IA leu isso pela ferramenta ver_endpoints_api e produziu uma auditoria de segurança inteira para rotas fantasmas.",
  () => verificarSincronia(),
);

let falhou = 0;
console.log("Checagem de segurança — cada item já foi um incidente real.\n");
for (const { nome, incidente, fn } of checagens) {
  let erro;
  try {
    erro = fn();
  } catch (e) {
    erro = `checagem quebrou: ${e.message}`;
  }
  if (erro) {
    falhou++;
    console.error(`  ✗ ${nome}\n      ${erro}\n      Contexto: ${incidente}\n`);
  } else {
    console.log(`  ✓ ${nome}`);
  }
}

if (falhou > 0) {
  console.error(`\n${falhou} checagem(ns) falhando. Uma proteção que já custou caro foi removida — entenda o porquê antes de seguir.`);
  process.exit(1);
}
console.log(`\n${checagens.length} checagens passaram.`);
