import crypto from "crypto";

const ALG = "aes-256-gcm";

function getKey(): Buffer | null {
  const k = process.env.ENCRYPTION_KEY;
  if (!k || k.length < 64) return null;
  return Buffer.from(k, "hex");
}

export function encrypt(text: string): string {
  const key = getKey();
  if (!key) return text;
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALG, key, iv);
  const enc = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `enc:${iv.toString("hex")}:${tag.toString("hex")}:${enc.toString("hex")}`;
}

export function decrypt(text: string): string {
  if (!text?.startsWith("enc:")) return text;
  const key = getKey();
  if (!key) return text;
  const [, ivHex, tagHex, encHex] = text.split(":");
  const decipher = crypto.createDecipheriv(ALG, key, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  return Buffer.concat([decipher.update(Buffer.from(encHex, "hex")), decipher.final()]).toString("utf8");
}
