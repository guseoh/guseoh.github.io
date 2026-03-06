#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { webcrypto } from "node:crypto";

const [payloadPath, keyPath = "private-comment.private.pem"] = process.argv.slice(2);

if (!payloadPath) {
  console.error("Usage: node scripts/decrypt-private-comment.mjs <payload.json> [private-key-path]");
  process.exit(1);
}

const payload = JSON.parse(readFileSync(payloadPath, "utf8"));
const privatePem = readFileSync(keyPath, "utf8");

const b64ToArrayBuffer = (b64) => {
  const binary = Buffer.from(b64, "base64");
  return binary.buffer.slice(binary.byteOffset, binary.byteOffset + binary.byteLength);
};

const pemToArrayBuffer = (pem) => {
  const clean = pem.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s+/g, "");
  return b64ToArrayBuffer(clean);
};

const privateKey = await webcrypto.subtle.importKey(
  "pkcs8",
  pemToArrayBuffer(privatePem),
  { name: "RSA-OAEP", hash: "SHA-256" },
  false,
  ["decrypt"]
);

const wrappedKeyBuffer = b64ToArrayBuffer(payload.wrappedKey);
const ivBuffer = b64ToArrayBuffer(payload.iv);
const ciphertextBuffer = b64ToArrayBuffer(payload.ciphertext);

const rawAesKey = await webcrypto.subtle.decrypt({ name: "RSA-OAEP" }, privateKey, wrappedKeyBuffer);
const aesKey = await webcrypto.subtle.importKey("raw", rawAesKey, { name: "AES-GCM" }, false, ["decrypt"]);

const decrypted = await webcrypto.subtle.decrypt(
  { name: "AES-GCM", iv: new Uint8Array(ivBuffer) },
  aesKey,
  ciphertextBuffer
);

const plaintext = new TextDecoder().decode(decrypted);
console.log(plaintext);