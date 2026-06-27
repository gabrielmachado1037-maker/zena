export const BUCKET = "fotos";

function headers() {
  return {
    Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
    "Content-Type": "image/jpeg",
  };
}

export async function uploadFoto(path: string, base64: string): Promise<string> {
  const data = base64.replace(/^data:image\/\w+;base64,/, "");
  const buffer = Buffer.from(data, "base64");

  const url = `${process.env.SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { ...headers(), "x-upsert": "true" },
    body: buffer,
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Supabase upload error (${res.status}): ${txt}`);
  }
  return `${process.env.SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;
}

export async function deleteFoto(path: string) {
  const url = `${process.env.SUPABASE_URL}/storage/v1/object/${BUCKET}`;
  await fetch(url, {
    method: "DELETE",
    headers: { ...headers(), "Content-Type": "application/json" },
    body: JSON.stringify({ prefixes: [path] }),
  });
}
