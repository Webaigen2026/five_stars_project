/**
 * Verify D9.1 plaintext retirement.
 *
 * Usage:
 *   npx tsx scripts/verify-passport-retirement.ts
 *
 * Reports counts only. Never prints passport values or keys.
 */
import {
  decryptTravelerSecret,
  isEncryptedTravelerSecret,
  isLegacyPassportPlaceholder,
} from "../src/lib/traveler-encryption";
import { db } from "../src/prisma/db";

type RetirementVerifyCounts = {
  rows: number;
  encrypted: number;
  missingEncrypted: number;
  invalidFormat: number;
  decryptFailed: number;
  leftoverPlaintext: number;
  retired: number;
};

function emptyCounts(): RetirementVerifyCounts {
  return {
    rows: 0,
    encrypted: 0,
    missingEncrypted: 0,
    invalidFormat: 0,
    decryptFailed: 0,
    leftoverPlaintext: 0,
    retired: 0,
  };
}

function verifyRow(
  counts: RetirementVerifyCounts,
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
    decryptTravelerSecret(encrypted);
  } catch {
    counts.decryptFailed += 1;
    return;
  }

  if (isLegacyPassportPlaceholder(row.passportNumber)) {
    counts.retired += 1;
    return;
  }

  counts.leftoverPlaintext += 1;
}

export async function verifyPassportRetirement() {
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

function printCounts(label: string, counts: RetirementVerifyCounts) {
  console.log(`${label}:`);
  console.log(`rows ${counts.rows}`);
  console.log(`encrypted ${counts.encrypted}`);
  console.log(`missingEncrypted ${counts.missingEncrypted}`);
  console.log(`invalidFormat ${counts.invalidFormat}`);
  console.log(`decryptFailed ${counts.decryptFailed}`);
  console.log(`leftoverPlaintext ${counts.leftoverPlaintext}`);
  console.log(`retired ${counts.retired}`);
}

function hasFailures(counts: RetirementVerifyCounts) {
  return (
    counts.missingEncrypted > 0 ||
    counts.invalidFormat > 0 ||
    counts.decryptFailed > 0 ||
    counts.leftoverPlaintext > 0
  );
}

async function main() {
  const result = await verifyPassportRetirement();
  printCounts("TravelerProfile", result.travelerCounts);
  printCounts("Passenger", result.passengerCounts);

  if (
    hasFailures(result.travelerCounts) ||
    hasFailures(result.passengerCounts)
  ) {
    process.exitCode = 1;
  }
}

const isDirectRun = process.argv[1]?.includes("verify-passport-retirement");

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
