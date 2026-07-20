import * as Sentry from "@sentry/node";
import type { Request, Response, NextFunction } from "express";

/**
 * Assinatura de URLs de mídia.
 *
 * Contexto: os buckets do Supabase eram públicos e as URLs iam cruas para o
 * cliente. Como fotos de evolução corporal e do feed são dado de saúde, isso
 * significava que qualquer pessoa com a URL — ou capaz de adivinhá-la — baixava
 * a imagem sem autenticação, para sempre.
 *
 * Estratégia: o banco continua guardando a URL pública (sem migration), e a
 * troca por uma URL assinada e temporária acontece na SAÍDA, interceptando
 * `res.json`. Foi decisão deliberada não assinar rota por rota: são dezenas de
 * lugares que devolvem imagem e bastava esquecer um para o app quebrar depois
 * que o bucket virasse privado. Aqui, qualquer rota — inclusive as que ainda
 * nem existem — sai assinada.
 *
 * Falha é ABERTA de propósito: se a assinatura falhar, devolvemos a URL
 * original. Enquanto o bucket for público, a imagem continua carregando; se já
 * for privado, ela quebra, mas quebra visivelmente, sem derrubar a resposta
 * inteira (uma foto que não carrega é melhor que uma tela em branco).
 */

const VALIDADE_SEGUNDOS = 6 * 60 * 60;
// Renova antes de expirar: uma aba aberta há horas não pode receber uma URL
// que morre em seguida.
const CACHE_MS = 5 * 60 * 60 * 1000;

type Entrada = { assinada: string; expiraEm: number };
const cache = new Map<string, Entrada>();

const base = () => (process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");

/** `https://x.supabase.co/storage/v1/object/public/<bucket>/<path>` → {bucket, path} */
export function decompor(url: string): { bucket: string; path: string } | null {
  if (typeof url !== "string" || !url.startsWith(base()) || !base()) return null;
  const m = url.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/);
  if (!m) return null;
  return { bucket: m[1], path: decodeURIComponent(m[2].split("?")[0]) };
}

/** Assina em lote (uma chamada por bucket) e devolve mapa url-pública → url-assinada. */
async function assinarLote(urls: string[]): Promise<Map<string, string>> {
  const resultado = new Map<string, string>();
  const agora = Date.now();
  const porBucket = new Map<string, { url: string; path: string }[]>();

  for (const url of urls) {
    const emCache = cache.get(url);
    if (emCache && emCache.expiraEm > agora) {
      resultado.set(url, emCache.assinada);
      continue;
    }
    const partes = decompor(url);
    if (!partes) continue;
    porBucket.set(partes.bucket, [...(porBucket.get(partes.bucket) ?? []), { url, path: partes.path }]);
  }

  await Promise.all(
    [...porBucket.entries()].map(async ([bucket, itens]) => {
      try {
        const resp = await fetch(`${base()}/storage/v1/object/sign/${bucket}`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ expiresIn: VALIDADE_SEGUNDOS, paths: itens.map((i) => i.path) }),
        });
        if (!resp.ok) throw new Error(`sign ${resp.status}: ${(await resp.text()).slice(0, 200)}`);

        const dados = (await resp.json()) as { path?: string; signedURL?: string; error?: string | null }[];
        for (const d of dados) {
          if (!d?.signedURL || !d.path) continue;
          const item = itens.find((i) => i.path === d.path || i.path === decodeURIComponent(d.path!));
          if (!item) continue;
          const assinada = `${base()}/storage/v1${d.signedURL}`;
          cache.set(item.url, { assinada, expiraEm: agora + CACHE_MS });
          resultado.set(item.url, assinada);
        }
      } catch (e) {
        // Sem isto a falha seria invisível: as URLs voltariam públicas e
        // ninguém saberia que a proteção parou de funcionar.
        const msg = `[midia] falha ao assinar ${itens.length} URL(s) do bucket ${bucket}: ${(e as Error).message}`;
        console.error(msg);
        Sentry.captureMessage(msg, "error");
      }
    }),
  );

  return resultado;
}

/** Percorre o payload coletando URLs públicas do Supabase. */
function coletar(valor: unknown, achadas: Set<string>, profundidade = 0): void {
  if (profundidade > 12 || achadas.size > 500) return;
  if (typeof valor === "string") {
    if (decompor(valor)) achadas.add(valor);
    return;
  }
  if (Array.isArray(valor)) {
    for (const v of valor) coletar(v, achadas, profundidade + 1);
    return;
  }
  if (valor && typeof valor === "object") {
    for (const v of Object.values(valor as Record<string, unknown>)) coletar(v, achadas, profundidade + 1);
  }
}

/** Reconstrói o payload trocando as URLs pelas assinadas. */
function substituir<T>(valor: T, mapa: Map<string, string>, profundidade = 0): T {
  if (profundidade > 12) return valor;
  if (typeof valor === "string") return (mapa.get(valor) ?? valor) as T;
  if (Array.isArray(valor)) return valor.map((v) => substituir(v, mapa, profundidade + 1)) as T;
  if (valor && typeof valor === "object" && (valor as object).constructor === Object) {
    const saida: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(valor as Record<string, unknown>)) {
      saida[k] = substituir(v, mapa, profundidade + 1);
    }
    return saida as T;
  }
  return valor;
}

export function assinarMidia(_req: Request, res: Response, next: NextFunction) {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) return next();

  const jsonOriginal = res.json.bind(res);
  res.json = (body: unknown) => {
    const achadas = new Set<string>();
    coletar(body, achadas);
    if (achadas.size === 0) return jsonOriginal(body);

    assinarLote([...achadas])
      .then((mapa) => jsonOriginal(mapa.size ? substituir(body, mapa) : body))
      .catch(() => jsonOriginal(body));
    return res;
  };

  next();
}

/** Usado pelo health check: prova que a assinatura funciona ANTES de fechar o bucket. */
export async function testarAssinatura(url: string): Promise<boolean> {
  const mapa = await assinarLote([url]);
  return mapa.size > 0;
}
