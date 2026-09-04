import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

// Server-only module. Do not import from Client Components.
// `server-only` is not used here because traveler write paths are also
// imported by Node test/backfill scripts outside the Next.js runtime.

/**
 * Application-layer passport encryption (D9).
 *
 * Algorithm: AES-256-GCM, random 12-byte IV, 16-byte auth tag.
 *
 * Ciphertext format:
 *   v1:<iv-base64>:<authTag-base64>:<ciphertext-base64>
 *
 * v1 has no key-id. A later rotation can introduce v2:
 *   v2:<keyId>:<iv-base64>:<authTag-base64>:<ciphertext-base64>
 * without changing how v1 rows are parsed. Unknown versions fail closed
 * and are never treated as plaintext.
 *
 * Key: TRAVELER_DATA_ENCRYPTION_KEY must be a base64-encoded 32-byte value.
 * It is never derived from AUTH_SECRET.
 */

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32;
const CURRENT_VERSION = "v1";
const VERSIONED_SECRET_PATTERN = /^v\d+:/;

export type TravelerEncryptionErrorCode =
  | "TRAVELER_ENCRYPTION_NOT_CONFIGURED"
  | "TRAVELER_ENCRYPTION_KEY_INVALID"
  | "TRAVELER_ENCRYPTION_PAYLOAD_INVALID"
  | "TRAVELER_ENCRYPTION_DECRYPT_FAILED";

export class TravelerEncryptionError extends Error {
  constructor(
    readonly code: TravelerEncryptionErrorCode,
    message: string
  ) {
    super(message);
    this.name = "TravelerEncryptionError";
  }
}

let cachedKey: Buffer | null = null;

export function resetTravelerEncryptionKeyCache() {
  cachedKey = null;
}

/** Synthetic 32-byte key for unit/integration tests only. Never a production key. */
const SYNTHETIC_TEST_KEY = Buffer.from(
  "d9-synthetic-test-key-32-bytes!!"
).toString("base64");

export function ensureTestEncryptionKey() {
  if (!process.env.TRAVELER_DATA_ENCRYPTION_KEY?.trim()) {
    process.env.TRAVELER_DATA_ENCRYPTION_KEY = SYNTHETIC_TEST_KEY;
    resetTravelerEncryptionKeyCache();
  }
}

function readConfiguredKey() {
  const raw = process.env.TRAVELER_DATA_ENCRYPTION_KEY?.trim();

  if (!raw) {
    throw new TravelerEncryptionError(
      "TRAVELER_ENCRYPTION_NOT_CONFIGURED",
      "Traveler data encryption is not configured."
    );
  }

  let decoded: Buffer;

  try {
    decoded = Buffer.from(raw, "base64");
  } catch {
    throw new TravelerEncryptionError(
      "TRAVELER_ENCRYPTION_KEY_INVALID",
      "Traveler data encryption key is invalid."
    );
  }

  if (decoded.length !== KEY_LENGTH) {
    throw new TravelerEncryptionError(
      "TRAVELER_ENCRYPTION_KEY_INVALID",
      "Traveler data encryption key is invalid."
    );
  }

  return decoded;
}

function getEncryptionKey() {
  if (!cachedKey) {
    cachedKey = readConfiguredKey();
  }

  return cachedKey;
}

function splitVersionedPayload(value: string) {
  const parts = value.split(":");
  return {
    version: parts[0] ?? "",
    parts,
  };
}

export function isEncryptedTravelerSecret(value: string) {
  return VERSIONED_SECRET_PATTERN.test(value.trim());
}

export function encryptTravelerSecret(plaintext: string) {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  if (authTag.length !== AUTH_TAG_LENGTH) {
    throw new TravelerEncryptionError(
      "TRAVELER_ENCRYPTION_PAYLOAD_INVALID",
      "Unable to protect traveler document data."
    );
  }

  return [
    CURRENT_VERSION,
    iv.toString("base64"),
    authTag.toString("base64"),
    ciphertext.toString("base64"),
  ].join(":");
}

export function decryptTravelerSecret(value: string) {
  const trimmed = value.trim();
  const { version, parts } = splitVersionedPayload(trimmed);

  if (version !== CURRENT_VERSION || parts.length !== 4) {
    throw new TravelerEncryptionError(
      "TRAVELER_ENCRYPTION_PAYLOAD_INVALID",
      "Unable to read traveler document data."
    );
  }

  const [, ivPart, authTagPart, ciphertextPart] = parts;

  if (!ivPart || !authTagPart || !ciphertextPart) {
    throw new TravelerEncryptionError(
      "TRAVELER_ENCRYPTION_PAYLOAD_INVALID",
      "Unable to read traveler document data."
    );
  }

  let iv: Buffer;
  let authTag: Buffer;
  let ciphertext: Buffer;

  try {
    iv = Buffer.from(ivPart, "base64");
    authTag = Buffer.from(authTagPart, "base64");
    ciphertext = Buffer.from(ciphertextPart, "base64");
  } catch {
    throw new TravelerEncryptionError(
      "TRAVELER_ENCRYPTION_PAYLOAD_INVALID",
      "Unable to read traveler document data."
    );
  }

  if (
    iv.length !== IV_LENGTH ||
    authTag.length !== AUTH_TAG_LENGTH ||
    ciphertext.length === 0
  ) {
    throw new TravelerEncryptionError(
      "TRAVELER_ENCRYPTION_PAYLOAD_INVALID",
      "Unable to read traveler document data."
    );
  }

  try {
    const key = getEncryptionKey();
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]).toString("utf8");
  } catch (error) {
    if (error instanceof TravelerEncryptionError) {
      throw error;
    }

    throw new TravelerEncryptionError(
      "TRAVELER_ENCRYPTION_DECRYPT_FAILED",
      "Unable to read traveler document data."
    );
  }
}

/**
 * Dual-read for the D9 migration window.
 * Encrypted value is authoritative whenever present.
 * Do not fall back to plaintext if decryption fails.
 */
export function getDecryptedPassportNumber(row: {
  passportNumber: string;
  passportNumberEncrypted?: string | null;
}) {
  const encrypted = row.passportNumberEncrypted?.trim();

  if (encrypted) {
    return decryptTravelerSecret(encrypted);
  }

  return row.passportNumber;
}

/**
 * Transitional write: keep required plaintext column and always persist ciphertext.
 */
export function passportWriteFields(plaintext: string) {
  return {
    passportNumber: plaintext,
    passportNumberEncrypted: encryptTravelerSecret(plaintext),
  };
}

export function hasEncryptedPassportValue(value: string | null | undefined) {
  return Boolean(value?.trim());
}
