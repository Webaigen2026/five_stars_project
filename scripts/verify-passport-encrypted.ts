/**
 * Encrypted-only passport health check. Does not read any legacy column.
 *
 * Usage:
 *   npx tsx scripts/verify-passport-encrypted.ts
 *
 * Reports counts only.
 */
import {
  decryptTravelerSecret,
  isEncryptedTravelerSecret,
} from "../src/lib/traveler-encryption";
import { db } from "../src/prisma/db";

type EncryptedVerifyCounts = {
  rows: number;
  encrypted: number;
  missingEncrypted: number;
  invalidFormat: number;
  decryptFailed: number;
};

function emptyCounts(): EncryptedVerifyCounts {
  return {
    rows: 0,
    encrypted: 0,
    missingEncrypted: 0,
    invalidFormat: 0,
    decryptFailed: 0,
  };
}

function verifyRow(
  counts: EncryptedVerifyCounts,
  encryptedValue: string | null
) {
  counts.rows += 1;

  const encrypted = encryptedValue?.trim() ?? "";

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
    decryptTravelerSecret(encrypted);
  } catch {
    counts.decryptFailed += 1;
  }
}

export async function verifyPassportEncrypted() {
  const travelerCounts = emptyCounts();
  const passengerCounts = emptyCounts();

  const travelers = await db.orm.public.TravelerProfile.select(
    "passportNumberEncrypted"
  ).all();

  for (const traveler of travelers) {
    verifyRow(travelerCounts, traveler.passportNumberEncrypted);
  }

  const passengers = await db.orm.public.Passenger.select(
    "passportNumberEncrypted"
  ).all();

  for (const passenger of passengers) {
    verifyRow(passengerCounts, passenger.passportNumberEncrypted);
  }

  return { travelerCounts, passengerCounts };
}

function printCounts(label: string, counts: EncryptedVerifyCounts) {
  console.log(`${label}:`);
  console.log(`rows ${counts.rows}`);
  console.log(`encrypted ${counts.encrypted}`);
  console.log(`missingEncrypted ${counts.missingEncrypted}`);
  console.log(`invalidFormat ${counts.invalidFormat}`);
  console.log(`decryptFailed ${counts.decryptFailed}`);
}

function hasFailures(counts: EncryptedVerifyCounts) {
  return (
    counts.missingEncrypted > 0 ||
    counts.invalidFormat > 0 ||
    counts.decryptFailed > 0
  );
}

async function main() {
  const result = await verifyPassportEncrypted();
  printCounts("TravelerProfile", result.travelerCounts);
  printCounts("Passenger", result.passengerCounts);

  if (
    hasFailures(result.travelerCounts) ||
    hasFailures(result.passengerCounts)
  ) {
    process.exitCode = 1;
  }
}

const isDirectRun = process.argv[1]?.includes("verify-passport-encrypted");

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
