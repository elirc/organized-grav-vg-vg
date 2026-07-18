import crypto from "node:crypto";

const KEY_HEX = process.env.FIELD_ENCRYPTION_KEY || "";

function getKeyBuffer() {
  if (!KEY_HEX) {
    return null;
  }

  try {
    const key = Buffer.from(KEY_HEX, "hex");
    if (key.length !== 32) {
      return null;
    }
    return key;
  } catch {
    return null;
  }
}

const keyBuffer = getKeyBuffer();

export function encryptField(value) {
  if (!value) {
    return value;
  }

  if (!keyBuffer) {
    return value;
  }

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", keyBuffer, iv);
  const encrypted = Buffer.concat([cipher.update(String(value), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `enc:v1:${Buffer.concat([iv, tag, encrypted]).toString("base64")}`;
}

export function decryptField(value) {
  if (!value || typeof value !== "string") {
    return value;
  }

  if (!value.startsWith("enc:v1:")) {
    return value;
  }

  if (!keyBuffer) {
    return value;
  }

  try {
    const payload = Buffer.from(value.slice(7), "base64");
    const iv = payload.subarray(0, 12);
    const tag = payload.subarray(12, 28);
    const encrypted = payload.subarray(28);

    const decipher = crypto.createDecipheriv("aes-256-gcm", keyBuffer, iv);
    decipher.setAuthTag(tag);

    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
  } catch {
    return value;
  }
}
