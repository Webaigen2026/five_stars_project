/**
 * Read-only audit of Passenger rows missing passportNumberEncrypted.
 *
 * Does NOT print passport numbers, ciphertext, DOB, or other PII.
 *
 * Usage:
 *   npx tsx --conditions=react-server scripts/audit-passenger-encryption.ts
 *   npx tsx --conditions=react-server scripts/audit-passenger-encryption.ts --dry-run
 *
 * --dry-run is accepted for consistency with other scripts; this audit never writes.
 */
import "dotenv/config";

import { db } from "../src/prisma/db";

type Category =
  | "A_recoverable_legacy"
  | "B_incomplete_test"
  | "C_historical_unavailable"
  | "D_unknown";

type AuditRow = {
  passengerId: number;
  bookingId: number;
  createdAt: string;
  updatedAt: string;
  bookingExists: boolean;
  bookingReferencePrefix: string | null;
  hasLegacyPassportSource: false;
  category: Category;
  categoryReason: string;
};

const TEST_BOOKING_PREFIXES = [
  "SJ-SEAT-",
  "SJ-PT-",
  "SJ-CHK-",
  "SJ-TEST-",
  "TEST-",
  "GUEST-",
];

const dryRun = process.argv.includes("--dry-run");

function bookingLooksLikeTest(reference: string | null | undefined) {
  if (!reference) {
    return false;
  }

  const upper = reference.toUpperCase();
  return TEST_BOOKING_PREFIXES.some((prefix) => upper.startsWith(prefix));
}

function categorize(input: {
  bookingExists: boolean;
  bookingReference: string | null;
}): Pick<AuditRow, "category" | "categoryReason"> {
  // Current schema stores only ciphertext — no plaintext passport column remains.
  // Therefore no row is Category A (recoverable legacy).

  if (!input.bookingExists) {
    return {
      category: "B_incomplete_test",
      categoryReason:
        "No booking row for bookingId; orphaned/incomplete development data.",
    };
  }

  if (bookingLooksLikeTest(input.bookingReference)) {
    return {
      category: "B_incomplete_test",
      categoryReason:
        "Booking reference matches known test/script prefix; likely disposable script data.",
    };
  }

  if (input.bookingExists) {
    return {
      category: "C_historical_unavailable",
      categoryReason:
        "Booking exists and is not an obvious test reference; passport ciphertext missing with no legacy source to backfill.",
    };
  }

  return {
    category: "D_unknown",
    categoryReason: "Unable to classify confidently; needs manual review.",
  };
}

function referencePrefix(reference: string | null) {
  if (!reference) {
    return null;
  }

  const upper = reference.toUpperCase();
  for (const prefix of TEST_BOOKING_PREFIXES) {
    if (upper.startsWith(prefix)) {
      return prefix;
    }
  }

  const parts = reference.split("-");
  if (parts.length >= 2) {
    return `${parts[0]}-${parts[1]}-`;
  }

  return reference.slice(0, 8);
}

export async function auditPassengerEncryption() {
  const passengers = await db.orm.public.Passenger.select(
    "id",
    "bookingId",
    "passportNumberEncrypted",
    "createdAt",
    "updatedAt"
  ).all();

  const bookings = await db.orm.public.Booking.select(
    "id",
    "bookingReference"
  ).all();
  const bookingsById = new Map(
    bookings.map((booking) => [booking.id, booking])
  );

  const missing = passengers.filter(
    (passenger) => !passenger.passportNumberEncrypted?.trim()
  );

  const rows: AuditRow[] = missing.map((passenger) => {
    const booking = bookingsById.get(passenger.bookingId) ?? null;
    const bookingExists = booking != null;
    const classified = categorize({
      bookingExists,
      bookingReference: booking?.bookingReference ?? null,
    });

    return {
      passengerId: passenger.id,
      bookingId: passenger.bookingId,
      createdAt: passenger.createdAt,
      updatedAt: passenger.updatedAt,
      bookingExists,
      bookingReferencePrefix: referencePrefix(
        booking?.bookingReference ?? null
      ),
      hasLegacyPassportSource: false,
      category: classified.category,
      categoryReason: classified.categoryReason,
    };
  });

  const counts = {
    A_recoverable_legacy: 0,
    B_incomplete_test: 0,
    C_historical_unavailable: 0,
    D_unknown: 0,
  };

  for (const row of rows) {
    counts[row.category] += 1;
  }

  return {
    mode: dryRun ? "dry-run" : "audit-readonly",
    writesPerformed: false,
    legacyPassportColumnExists: false,
    safeBackfillPossible: false,
    totalPassengerRows: passengers.length,
    missingEncryptedCount: missing.length,
    categoryCounts: counts,
    rows,
  };
}

async function main() {
  const result = await auditPassengerEncryption();

  console.log(
    JSON.stringify(
      {
        mode: result.mode,
        writesPerformed: result.writesPerformed,
        legacyPassportColumnExists: result.legacyPassportColumnExists,
        safeBackfillPossible: result.safeBackfillPossible,
        totalPassengerRows: result.totalPassengerRows,
        missingEncryptedCount: result.missingEncryptedCount,
        categoryCounts: result.categoryCounts,
        note: "Row details omit names, DOB, passport values, and ciphertext.",
        rows: result.rows,
      },
      null,
      2
    )
  );

  if (result.missingEncryptedCount > 0) {
    console.log(
      "\nNo automatic backfill: schema has no legacy plaintext passport field."
    );
    console.log(
      "Admin UI should show Unavailable for these rows. Do not invent ciphertext."
    );

    if (result.categoryCounts.B_incomplete_test > 0) {
      console.log(
        "\nRecommended (manual approval only) cleanup for Category B test rows:"
      );
      console.log(
        "  Review IDs above, then delete SeatAssignment → Passenger → related test Booking if disposable."
      );
      console.log(
        "  Do not run destructive deletes without explicit approval."
      );
    }
  }
}

main()
  .catch((error) => {
    console.error(
      error instanceof Error ? error.message : "Passenger encryption audit failed"
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.close();
  });
