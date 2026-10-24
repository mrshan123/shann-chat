/**
 * Browser Web Crypto helpers. This is a building block, NOT a complete,
 * audited Signal-protocol implementation. Do not advertise production E2EE
 * until identity/prekey management, device verification, rotation, recovery,
 * and protocol review have been implemented and audited.
 */
const enc = new TextEncoder();
const dec = new TextDecoder();

export async function createLocalKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}

export async function encryptText(plainText: string, key: CryptoKey) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(plainText));
  return { iv: toBase64(iv), ciphertext: toBase64(new Uint8Array(cipher)), version: 1 };
}

export async function decryptText(payload: { iv: string; ciphertext: string }, key: CryptoKey) {
  const clear = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromBase64(payload.iv) },
    key,
    fromBase64(payload.ciphertext)
  );
  return dec.decode(clear);
}

function toBase64(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach((b) => binary += String.fromCharCode(b));
  return btoa(binary);
}
function fromBase64(value: string) {
  const binary = atob(value);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}
