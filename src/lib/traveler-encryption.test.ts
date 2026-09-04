import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import {
  LEGACY_ENCRYPTED_PASSPORT_PLACEHOLDER,
  TravelerEncryptionError,
  decryptTravelerSecret,
  encryptTravelerSecret,
  getDecryptedPassportNumber,
  isEncryptedTravelerSecret,
  isLegacyPassportPlaceholder,
  passportWriteFields,
  resetTravelerEncryptionKeyCache,
} from "./traveler-encryption";

const SYNTHETIC_KEY = Buffer.from("d9-synthetic-test-key-32-bytes!!").toString(
  "base64"
);
const PLAINTEXT = "AB1234567";

function withKey(value: string | undefined) {
  if (value == null) {
    delete process.env.TRAVELER_DATA_ENCRYPTION_KEY;
  } else {
    process.env.TRAVELER_DATA_ENCRYPTION_KEY = value;
  }
  resetTravelerEncryptionKeyCache();
}

afterEach(() => {
  withKey(SYNTHETIC_KEY);
});

describe("traveler encryption", () => {
  it("round-trips a synthetic passport number", () => {
    withKey(SYNTHETIC_KEY);
    const encrypted = encryptTravelerSecret(PLAINTEXT);
    assert.match(encrypted, /^v1:/);
    assert.equal(decryptTravelerSecret(encrypted), PLAINTEXT);
  });

  it("produces different ciphertext for the same plaintext", () => {
    withKey(SYNTHETIC_KEY);
    const first = encryptTravelerSecret(PLAINTEXT);
    const second = encryptTravelerSecret(PLAINTEXT);
    assert.notEqual(first, second);
    assert.equal(decryptTravelerSecret(first), PLAINTEXT);
    assert.equal(decryptTravelerSecret(second), PLAINTEXT);
  });

  it("fails closed when ciphertext is tampered with", () => {
    withKey(SYNTHETIC_KEY);
    const encrypted = encryptTravelerSecret(PLAINTEXT);
    const parts = encrypted.split(":");
    const ciphertext = Buffer.from(parts[3] ?? "", "base64");
    ciphertext[0] = ciphertext[0] ^ 0xff;
    parts[3] = ciphertext.toString("base64");
    const tampered = parts.join(":");

    assert.throws(
      () => decryptTravelerSecret(tampered),
      (error: unknown) =>
        error instanceof TravelerEncryptionError &&
        error.code === "TRAVELER_ENCRYPTION_DECRYPT_FAILED"
    );
  });

  it("rejects a key that is not 32 bytes", () => {
    withKey(Buffer.alloc(16, 1).toString("base64"));
    assert.throws(
      () => encryptTravelerSecret(PLAINTEXT),
      (error: unknown) =>
        error instanceof TravelerEncryptionError &&
        error.code === "TRAVELER_ENCRYPTION_KEY_INVALID"
    );
  });

  it("rejects a missing key", () => {
    withKey(undefined);
    assert.throws(
      () => encryptTravelerSecret(PLAINTEXT),
      (error: unknown) =>
        error instanceof TravelerEncryptionError &&
        error.code === "TRAVELER_ENCRYPTION_NOT_CONFIGURED"
    );
  });

  it("rejects a malformed v1 payload", () => {
    withKey(SYNTHETIC_KEY);
    assert.throws(
      () => decryptTravelerSecret("v1:not-enough"),
      (error: unknown) =>
        error instanceof TravelerEncryptionError &&
        error.code === "TRAVELER_ENCRYPTION_PAYLOAD_INVALID"
    );
  });

  it("detects plaintext versus v1 ciphertext", () => {
    withKey(SYNTHETIC_KEY);
    assert.equal(isEncryptedTravelerSecret(PLAINTEXT), false);
    assert.equal(isEncryptedTravelerSecret(encryptTravelerSecret(PLAINTEXT)), true);
  });

  it("fails closed on an unknown version instead of treating it as plaintext", () => {
    withKey(SYNTHETIC_KEY);
    const unknown = "v2:abc:def:ghi";
    assert.equal(isEncryptedTravelerSecret(unknown), true);
    assert.throws(
      () => decryptTravelerSecret(unknown),
      (error: unknown) =>
        error instanceof TravelerEncryptionError &&
        error.code === "TRAVELER_ENCRYPTION_PAYLOAD_INVALID"
    );
    assert.throws(
      () =>
        getDecryptedPassportNumber({
          passportNumberEncrypted: unknown,
        }),
      (error: unknown) => error instanceof TravelerEncryptionError
    );
  });

  it("reads encrypted values only and never falls back to plaintext", () => {
    withKey(SYNTHETIC_KEY);
    const encrypted = encryptTravelerSecret(PLAINTEXT);
    assert.equal(
      getDecryptedPassportNumber({
        passportNumberEncrypted: encrypted,
      }),
      PLAINTEXT
    );
    assert.throws(
      () =>
        getDecryptedPassportNumber({
          passportNumberEncrypted: null,
        }),
      (error: unknown) =>
        error instanceof TravelerEncryptionError &&
        error.code === "TRAVELER_ENCRYPTION_MISSING"
    );
  });

  it("writes ciphertext and a non-sensitive legacy placeholder", () => {
    withKey(SYNTHETIC_KEY);
    const fields = passportWriteFields(PLAINTEXT);
    assert.equal(fields.passportNumber, LEGACY_ENCRYPTED_PASSPORT_PLACEHOLDER);
    assert.equal(isLegacyPassportPlaceholder(fields.passportNumber), true);
    assert.match(fields.passportNumberEncrypted, /^v1:/);
    assert.equal(decryptTravelerSecret(fields.passportNumberEncrypted), PLAINTEXT);
  });
});
