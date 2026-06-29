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

export async function uploadFoto(path: string, base64: string): Promise<string> {
  const data = base64.replace(/^data:image\/\w+;base64,/, "");
  return uploadBuffer(BUCKET, path, Buffer.from(data, "base64"));
}

export async function uploadFeedFoto(path: string, base64: string): Promise<string> {
  const match = base64.match(/^data:(image\/\w+);base64,/);
  const contentType = match?.[1] ?? "image/jpeg";
  const data = base64.replace(/^data:image\/\w+;base64,/, "");
  return uploadBuffer(BUCKET_FEED, path, Buffer.from(data, "base64"), contentType);
}

export async function uploadAvatarPaciente(path: string, base64: string): Promise<string> {
  const match = base64.match(/^data:(image\/\w+);base64,/);
  const contentType = match?.[1] ?? "image/jpeg";
  const data = base64.replace(/^data:image\/\w+;base64,/, "");
  return uploadBuffer(BUCKET_AVATAR_PACIENTE, path, Buffer.from(data, "base64"), contentType);
}

export async function deleteFoto(path: string) {
  const url = `${process.env.SUPABASE_URL}/storage/v1/object/${BUCKET}`;
  await fetch(url, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prefixes: [path] }),
  });
}
