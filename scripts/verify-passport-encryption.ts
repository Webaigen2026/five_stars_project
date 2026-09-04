/**
 * Verify D9 passport ciphertext after backfill.
 *
 * Usage:
 *   npx tsx scripts/verify-passport-encryption.ts
 *
 * Reports counts only. Never prints passport values or keys.
 */
import {
  decryptTravelerSecret,
  isEncryptedTravelerSecret,
} from "../src/lib/traveler-encryption";
import { db } from "../src/prisma/db";

type VerifyCounts = {
  rows: number;
  encrypted: number;
  missingEncrypted: number;
  invalidFormat: number;
  decryptFailed: number;
  plaintextMismatch: number;
};

function emptyCounts(): VerifyCounts {
  return {
    rows: 0,
    encrypted: 0,
    missingEncrypted: 0,
    invalidFormat: 0,
    decryptFailed: 0,
    plaintextMismatch: 0,
  };
}

function verifyRow(
  counts: VerifyCounts,
  row: {
    passportNumber: string;
    passportNumberEncrypted: string | null;
  }
) {
  counts.rows += 1;

  const encrypted = row.passportNumberEncrypted?.trim() ?? "";

  if (!encrypted) {
    counts.missingEncrypted += 1;
    return;
  }

  counts.encrypted += 1;

  if (!isEncryptedTravelerSecret(encrypted) || !encrypted.startsWith("v1:")) {
    counts.invalidFormat += 1;
    return;
  }

  try {
    const decrypted = decryptTravelerSecret(encrypted);

    if (decrypted !== row.passportNumber) {
      counts.plaintextMismatch += 1;
    }
  } catch {
    counts.decryptFailed += 1;
  }
}

export async function verifyPassportEncryption() {
  const travelerCounts = emptyCounts();
  const passengerCounts = emptyCounts();

  const travelers = await db.orm.public.TravelerProfile.select(
    "passportNumber",
    "passportNumberEncrypted"
  ).all();

  for (const traveler of travelers) {
    verifyRow(travelerCounts, traveler);
  }

  const passengers = await db.orm.public.Passenger.select(
    "passportNumber",
    "passportNumberEncrypted"
  ).all();

  for (const passenger of passengers) {
    verifyRow(passengerCounts, passenger);
  }

  return { travelerCounts, passengerCounts };
}

function printCounts(label: string, counts: VerifyCounts) {
  console.log(`${label}:`);
  console.log(`rows ${counts.rows}`);
  console.log(`encrypted ${counts.encrypted}`);
  console.log(`missingEncrypted ${counts.missingEncrypted}`);
  console.log(`invalidFormat ${counts.invalidFormat}`);
  console.log(`decryptFailed ${counts.decryptFailed}`);
  console.log(`plaintextMismatch ${counts.plaintextMismatch}`);
}

function hasFailures(counts: VerifyCounts) {
  return (
    counts.missingEncrypted > 0 ||
    counts.invalidFormat > 0 ||
    counts.decryptFailed > 0 ||
    counts.plaintextMismatch > 0
  );
}

async function main() {
  const result = await verifyPassportEncryption();
  printCounts("TravelerProfile", result.travelerCounts);
  printCounts("Passenger", result.passengerCounts);

  if (
    hasFailures(result.travelerCounts) ||
    hasFailures(result.passengerCounts)
  ) {
    process.exitCode = 1;
  }
}

const isDirectRun = process.argv[1]?.includes("verify-passport-encryption");

if (isDirectRun) {
  main()
    .catch((error) => {
      console.error(
        error instanceof Error ? error.name : "Verification failed"
      );
      process.exitCode = 1;
    })
    .finally(async () => {
      await db.close();
    });
}
