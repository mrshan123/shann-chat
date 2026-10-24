import { describe, it, expect } from "vitest";
import { createLocalKey, decryptText, encryptText } from "../src/lib/crypto";

describe("Web Crypto helper", () => {
  it("encrypts and decrypts a message", async () => {
    const key = await createLocalKey();
    const encrypted = await encryptText("hello Shann", key);
    expect(encrypted.ciphertext).not.toContain("hello Shann");
    await expect(decryptText(encrypted, key)).resolves.toBe("hello Shann");
  });
  it("uses a different IV for each encryption", async () => {
    const key = await createLocalKey();
    const a = await encryptText("same", key);
    const b = await encryptText("same", key);
    expect(a.iv).not.toBe(b.iv);
  });
});