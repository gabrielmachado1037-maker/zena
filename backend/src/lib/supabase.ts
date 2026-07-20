import * as Sentry from "@sentry/node";

export const BUCKET = "fotos";
export const BUCKET_FEED = "feed-fotos";
export const BUCKET_AVATAR_PACIENTE = "avatares-pacientes";

async function uploadBuffer(bucket: string, path: string, buffer: Buffer, contentType = "image/jpeg"): Promise<string> {
  const url = `${process.env.SUPABASE_URL}/storage/v1/object/${bucket}/${path}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
      "Content-Type": contentType,
      "x-upsert": "true",
    },
    body: buffer as unknown as BodyInit,
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Supabase upload error (${res.status}): ${txt}`);
  }
  return `${process.env.SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
}

// Limite de imagem: ~6MB binário (fica sob o limite de 10mb do body JSON já com base64).
const TAMANHO_MAX_MB = 6;

/** Erro de validação de upload — vira 400 (client error) no handler global. */
export class UploadError extends Error {
  status = 400;
  expose = true;
  constructor(message: string) {
    super(message);
    this.name = "UploadError";
  }
}

/** Detecta o tipo REAL pela assinatura (magic bytes) — ignora o mime declarado. */
function sniffTipoImagem(b: Buffer): "image/jpeg" | "image/png" | "image/webp" | null {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  if (b.length >= 12 && b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  return null;
}

/**
 * Valida e decodifica uma imagem base64 (com ou sem data URL).
 * Confere tamanho e tipo REAL (JPEG/PNG/WebP) por magic bytes. Lança UploadError (→ 400).
 */
export function decodeImagem(base64: string): { buffer: Buffer; contentType: string } {
  if (typeof base64 !== "string" || base64.length === 0) throw new UploadError("Imagem ausente.");
  const raw = base64.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, "");
  const buffer = Buffer.from(raw, "base64");
  if (buffer.length === 0) throw new UploadError("Imagem inválida ou vazia.");
  if (buffer.length > TAMANHO_MAX_MB * 1024 * 1024) {
    throw new UploadError(`Imagem muito grande (máx ${TAMANHO_MAX_MB}MB).`);
  }
  const contentType = sniffTipoImagem(buffer);
  if (!contentType) throw new UploadError("Formato não suportado. Envie JPEG, PNG ou WebP.");
  return { buffer, contentType };
}

export async function uploadFoto(path: string, base64: string): Promise<string> {
  const { buffer, contentType } = decodeImagem(base64);
  return uploadBuffer(BUCKET, path, buffer, contentType);
}

export async function uploadFeedFoto(path: string, base64: string): Promise<string> {
  const { buffer, contentType } = decodeImagem(base64);
  return uploadBuffer(BUCKET_FEED, path, buffer, contentType);
}

export async function uploadAvatarPaciente(path: string, base64: string): Promise<string> {
  const { buffer, contentType } = decodeImagem(base64);
  return uploadBuffer(BUCKET_AVATAR_PACIENTE, path, buffer, contentType);
}

export async function uploadImagemChat(path: string, base64: string): Promise<string> {
  const { buffer, contentType } = decodeImagem(base64);
  return uploadBuffer(BUCKET, path, buffer, contentType);
}

export async function deleteFoto(path: string) {
  const url = `${process.env.SUPABASE_URL}/storage/v1/object/${BUCKET}`;
  const res = await fetch(url, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prefixes: [path] }),
  });
  await conferirDelete(res, path);
}

/**
 * O DELETE do storage falhando em silêncio é pior que falhar alto: a linha do
 * banco já foi apagada, o bucket é PÚBLICO, e a foto (dado de saúde) segue
 * baixável por URL eterna — sem nada no banco apontando para ela. Não dá para
 * lançar (a exclusão é best-effort e a transação já commitou), mas tem que
 * deixar rastro para ser possível limpar depois.
 */
async function conferirDelete(res: Response, path: string) {
  if (res.ok) return;
  const corpo = await res.text().catch(() => "");
  const msg = `[storage] DELETE falhou (${res.status}) — arquivo PERMANECE no bucket público: ${path}. ${corpo.slice(0, 200)}`;
  console.error(msg);
  Sentry.captureMessage(msg, "error");
}

/**
 * Remove um objeto do storage a partir da URL pública salva no banco
 * (`.../object/public/<bucket>/<path>`). Best-effort — usado na anonimização (LGPD).
 */
export async function deleteFotoPorUrl(publicUrl: string): Promise<void> {
  const m = publicUrl.match(/\/object\/public\/([^/]+)\/(.+)$/);
  if (!m) return;
  const [, bucket, path] = m;
  const url = `${process.env.SUPABASE_URL}/storage/v1/object/${bucket}`;
  const res = await fetch(url, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prefixes: [path] }),
  });
  await conferirDelete(res, `${bucket}/${path}`);
}
