/**
 * Manual D9 backfill. Encrypts existing plaintext passport numbers.
 *
 * Usage:
 *   npx tsx scripts/backfill-passport-encryption.ts --dry-run
 *   npx tsx scripts/backfill-passport-encryption.ts
 *
 * Never run from postinstall, Vercel, or app startup.
 */
import {
  encryptTravelerSecret,
  hasEncryptedPassportValue,
} from "../src/lib/traveler-encryption";
import { db } from "../src/prisma/db";

type BackfillCounts = {
  processed: number;
  encrypted: number;
  skipped: number;
};

export async function backfillPassportEncryption(options: {
  dryRun: boolean;
  travelerIds?: number[];
  passengerIds?: number[];
}) {
  const travelerCounts: BackfillCounts = {
    processed: 0,
    encrypted: 0,
    skipped: 0,
  };
  const passengerCounts: BackfillCounts = {
    processed: 0,
    encrypted: 0,
    skipped: 0,
  };

  const travelers = await db.orm.public.TravelerProfile.select(
    "id",
    "passportNumber",
    "passportNumberEncrypted"
  ).all();

  for (const traveler of travelers) {
    if (
      options.travelerIds &&
      !options.travelerIds.includes(traveler.id)
    ) {
      continue;
    }
    travelerCounts.processed += 1;

    if (hasEncryptedPassportValue(traveler.passportNumberEncrypted)) {
      travelerCounts.skipped += 1;
      continue;
    }

    if (!traveler.passportNumber.trim()) {
      travelerCounts.skipped += 1;
      continue;
    }

    const encrypted = encryptTravelerSecret(traveler.passportNumber);

    if (!options.dryRun) {
      await db.orm.public.TravelerProfile.where({ id: traveler.id }).update({
        passportNumberEncrypted: encrypted,
      });
    }

    travelerCounts.encrypted += 1;
  }

  const passengers = await db.orm.public.Passenger.select(
    "id",
    "passportNumber",
    "passportNumberEncrypted"
  ).all();

  for (const passenger of passengers) {
    if (
      options.passengerIds &&
      !options.passengerIds.includes(passenger.id)
    ) {
      continue;
    }
    passengerCounts.processed += 1;

    if (hasEncryptedPassportValue(passenger.passportNumberEncrypted)) {
      passengerCounts.skipped += 1;
      continue;
    }

    if (!passenger.passportNumber.trim()) {
      passengerCounts.skipped += 1;
      continue;
    }

    const encrypted = encryptTravelerSecret(passenger.passportNumber);

    if (!options.dryRun) {
      await db.orm.public.Passenger.where({ id: passenger.id }).update({
        passportNumberEncrypted: encrypted,
      });
    }

    passengerCounts.encrypted += 1;
  }

  return { travelerCounts, passengerCounts };
}

function printCounts(label: string, counts: BackfillCounts) {
  console.log(`${label}:`);
  console.log(`processed ${counts.processed}`);
  console.log(`encrypted ${counts.encrypted}`);
  console.log(`skipped ${counts.skipped}`);
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");

  if (dryRun) {
    console.log("Backfill dry-run. No database writes.");
  }

  const result = await backfillPassportEncryption({ dryRun });
  printCounts("TravelerProfile", result.travelerCounts);
  printCounts("Passenger", result.passengerCounts);
}

const isDirectRun = process.argv[1]?.includes("backfill-passport-encryption");

if (isDirectRun) {
  main()
    .catch((error) => {
      console.error(
        error instanceof Error ? error.name : "Backfill failed"
      );
      process.exitCode = 1;
    })
    .finally(async () => {
      await db.close();
    });
}
