/**
 * Manual D9.1 plaintext retirement. Replaces verified legacy passport
 * values with a non-sensitive placeholder. Does not touch ciphertext.
 *
 * Usage:
 *   npx tsx scripts/retire-plaintext-passports.ts --dry-run
 *   npx tsx scripts/retire-plaintext-passports.ts
 *
 * Never run from postinstall, Vercel, or app startup.
 */
import {
  LEGACY_ENCRYPTED_PASSPORT_PLACEHOLDER,
  decryptTravelerSecret,
  hasEncryptedPassportValue,
  isEncryptedTravelerSecret,
  isLegacyPassportPlaceholder,
} from "../src/lib/traveler-encryption";
import { db } from "../src/prisma/db";

type RetirementCounts = {
  processed: number;
  eligible: number;
  retired: number;
  skipped: number;
  refused: number;
};

export async function retirePlaintextPassports(options: {
  dryRun: boolean;
  travelerIds?: number[];
  passengerIds?: number[];
}) {
  const travelerCounts = emptyCounts();
  const passengerCounts = emptyCounts();

  const travelers = await db.orm.public.TravelerProfile.select(
    "id",
    "passportNumber",
    "passportNumberEncrypted"
  ).all();

  for (const traveler of travelers) {
    if (options.travelerIds && !options.travelerIds.includes(traveler.id)) {
      continue;
    }

    await retireRow(travelerCounts, traveler, options.dryRun, async () => {
      await db.orm.public.TravelerProfile.where({ id: traveler.id }).update({
        passportNumber: LEGACY_ENCRYPTED_PASSPORT_PLACEHOLDER,
      });
    });
  }

  const passengers = await db.orm.public.Passenger.select(
    "id",
    "passportNumber",
    "passportNumberEncrypted"
  ).all();

  for (const passenger of passengers) {
    if (options.passengerIds && !options.passengerIds.includes(passenger.id)) {
      continue;
    }

    await retireRow(passengerCounts, passenger, options.dryRun, async () => {
      await db.orm.public.Passenger.where({ id: passenger.id }).update({
        passportNumber: LEGACY_ENCRYPTED_PASSPORT_PLACEHOLDER,
      });
    });
  }

  return { travelerCounts, passengerCounts };
}

function emptyCounts(): RetirementCounts {
  return {
    processed: 0,
    eligible: 0,
    retired: 0,
    skipped: 0,
    refused: 0,
  };
}

async function retireRow(
  counts: RetirementCounts,
  row: {
    passportNumber: string;
    passportNumberEncrypted: string | null;
  },
  dryRun: boolean,
  writePlaceholder: () => Promise<void>
) {
  counts.processed += 1;

  if (isLegacyPassportPlaceholder(row.passportNumber)) {
    counts.skipped += 1;
    return;
  }

  const encrypted = row.passportNumberEncrypted?.trim() ?? "";

  if (!hasEncryptedPassportValue(encrypted) || !isEncryptedTravelerSecret(encrypted)) {
    counts.refused += 1;
    return;
  }

  try {
    decryptTravelerSecret(encrypted);
  } catch {
    counts.refused += 1;
    return;
  }

  counts.eligible += 1;

  if (!dryRun) {
    await writePlaceholder();
  }

  counts.retired += 1;
}

function printCounts(label: string, counts: RetirementCounts) {
  console.log(`${label}:`);
  console.log(`processed ${counts.processed}`);
  console.log(`eligible ${counts.eligible}`);
  console.log(`retired ${counts.retired}`);
  console.log(`skipped ${counts.skipped}`);
  console.log(`refused ${counts.refused}`);
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");

  if (dryRun) {
    console.log("Retirement dry-run. No database writes.");
  }

  const result = await retirePlaintextPassports({ dryRun });
  printCounts("TravelerProfile", result.travelerCounts);
  printCounts("Passenger", result.passengerCounts);

  if (!dryRun && (result.travelerCounts.refused > 0 || result.passengerCounts.refused > 0)) {
    process.exitCode = 1;
  }
}

const isDirectRun = process.argv[1]?.includes("retire-plaintext-passports");

if (isDirectRun) {
  main()
    .catch((error) => {
      console.error(error instanceof Error ? error.name : "Retirement failed");
      process.exitCode = 1;
    })
    .finally(async () => {
      await db.close();
    });
}
