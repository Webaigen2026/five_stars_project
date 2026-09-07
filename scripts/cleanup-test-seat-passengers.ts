/**
 * Cleanup disposable SJ-SEAT-* test leftovers from scripts/test-seat-assignments.ts.
 *
 * Defaults to DRY RUN (zero writes).
 *
 * Usage:
 *   npx tsx --conditions=react-server scripts/cleanup-test-seat-passengers.ts
 *   npx tsx --conditions=react-server scripts/cleanup-test-seat-passengers.ts --dry-run
 *
 * Destructive (do not run unless explicitly approved):
 *   npx tsx --conditions=react-server scripts/cleanup-test-seat-passengers.ts \
 *     --execute --confirm-test-seat-cleanup
 *
 * Never prints passport values, ciphertext, DOB, email, phone, or payment secrets.
 */
import "dotenv/config";

import { db } from "../src/prisma/db";

const CANDIDATE_BOOKING_IDS = new Set([75, 76, 77, 78, 92, 93]);
const CANDIDATE_PASSENGER_IDS = new Set([61, 63, 65, 67, 69, 71]);
const TEST_BOOKING_PREFIX = "SJ-SEAT-";

const wantsExecute = process.argv.includes("--execute");
const confirmCleanup = process.argv.includes("--confirm-test-seat-cleanup");
const dryRunFlag = process.argv.includes("--dry-run");

/** Destructive writes only when BOTH execute flags are present. */
const isDestructive = wantsExecute && confirmCleanup;
const isDryRun = !isDestructive;

type Eligibility = {
  bookingId: number;
  bookingReference: string | null;
  eligible: boolean;
  reason: string;
  passengerIds: number[];
  seatAssignmentCount: number;
  bookingSegmentCount: number;
  paymentCount: number;
  guestAccessCodeCount: number;
  blockers: string[];
};

function missingEncrypted(value: string | null | undefined) {
  return !value?.trim();
}

async function assessBooking(bookingId: number): Promise<Eligibility> {
  const booking = await db.orm.public.Booking.select(
    "id",
    "bookingReference"
  )
    .where({ id: bookingId })
    .first();

  if (!booking) {
    return {
      bookingId,
      bookingReference: null,
      eligible: false,
      reason: "Booking not found.",
      passengerIds: [],
      seatAssignmentCount: 0,
      bookingSegmentCount: 0,
      paymentCount: 0,
      guestAccessCodeCount: 0,
      blockers: ["missing_booking"],
    };
  }

  const blockers: string[] = [];
  let eligible = true;
  let reason = "All safety checks passed; disposable SJ-SEAT test booking.";

  if (!CANDIDATE_BOOKING_IDS.has(booking.id)) {
    eligible = false;
    reason = "Booking ID is not in the approved candidate allowlist.";
    blockers.push("booking_id_not_allowlisted");
  }

  const reference = booking.bookingReference ?? "";
  if (!reference.toUpperCase().startsWith(TEST_BOOKING_PREFIX)) {
    eligible = false;
    reason = `Booking reference does not start with ${TEST_BOOKING_PREFIX}.`;
    blockers.push("booking_reference_prefix_mismatch");
  }

  const passengers = await db.orm.public.Passenger.select(
    "id",
    "bookingId",
    "passportNumberEncrypted"
  )
    .where({ bookingId: booking.id })
    .all();

  const segments = await db.orm.public.BookingSegment.select("id", "bookingId")
    .where({ bookingId: booking.id })
    .all();

  const seats = await db.orm.public.SeatAssignment.select(
    "id",
    "bookingId",
    "passengerId"
  )
    .where({ bookingId: booking.id })
    .all();

  const payments = await db.orm.public.Payment.select("id", "bookingId")
    .where({ bookingId: booking.id })
    .all();

  const guestCodes = await db.orm.public.GuestTripAccessCode.select(
    "id",
    "bookingId"
  )
    .where({ bookingId: booking.id })
    .all();

  if (passengers.length === 0) {
    eligible = false;
    reason = "No passengers on booking; unexpected for test-seat pattern.";
    blockers.push("no_passengers");
  }

  for (const passenger of passengers) {
    if (!CANDIDATE_PASSENGER_IDS.has(passenger.id)) {
      eligible = false;
      reason =
        "Booking has a passenger ID outside the approved candidate allowlist.";
      blockers.push(`passenger_not_allowlisted:${passenger.id}`);
    }

    if (!missingEncrypted(passenger.passportNumberEncrypted)) {
      eligible = false;
      reason =
        "A passenger on this booking has non-empty passportNumberEncrypted; refusing cleanup.";
      blockers.push(`passenger_has_ciphertext:${passenger.id}`);
    }
  }

  const allowlistedOnBooking = passengers.filter((passenger) =>
    CANDIDATE_PASSENGER_IDS.has(passenger.id)
  );

  if (allowlistedOnBooking.length === 0) {
    eligible = false;
    reason = "No allowlisted passenger IDs found on this booking.";
    blockers.push("no_allowlisted_passengers");
  }

  // Test-seat script creates 1–2 segments (OUTBOUND / RETURN).
  if (segments.length < 1 || segments.length > 2) {
    eligible = false;
    reason = `Segment count ${segments.length} does not match test-seat pattern (1–2).`;
    blockers.push(`unexpected_segment_count:${segments.length}`);
  }

  if (payments.length > 0) {
    eligible = false;
    reason = "Payment rows exist; refusing automatic cleanup.";
    blockers.push(`payments_present:${payments.length}`);
  }

  if (guestCodes.length > 0) {
    eligible = false;
    reason = "GuestTripAccessCode rows exist; requiring manual review.";
    blockers.push(`guest_access_codes_present:${guestCodes.length}`);
  }

  return {
    bookingId: booking.id,
    bookingReference: booking.bookingReference,
    eligible,
    reason,
    passengerIds: passengers.map((passenger) => passenger.id),
    seatAssignmentCount: seats.length,
    bookingSegmentCount: segments.length,
    paymentCount: payments.length,
    guestAccessCodeCount: guestCodes.length,
    blockers,
  };
}

async function deleteEligibleBooking(assessment: Eligibility) {
  // Re-validate immediately before writes.
  const rechecked = await assessBooking(assessment.bookingId);

  if (!rechecked.eligible) {
    return {
      bookingId: assessment.bookingId,
      deleted: false,
      reason: `Skipped at execute time: ${rechecked.reason}`,
      blockers: rechecked.blockers,
    };
  }

  await db.transaction(async (tx) => {
    await tx.orm.public.SeatAssignment.where({
      bookingId: rechecked.bookingId,
    }).delete();

    await tx.orm.public.Passenger.where({
      bookingId: rechecked.bookingId,
    }).delete();

    await tx.orm.public.BookingSegment.where({
      bookingId: rechecked.bookingId,
    }).delete();

    await tx.orm.public.Booking.where({
      id: rechecked.bookingId,
    }).delete();
  });

  return {
    bookingId: rechecked.bookingId,
    deleted: true,
    reason: "Deleted SeatAssignment → Passenger → BookingSegment → Booking.",
    blockers: [] as string[],
  };
}

async function postCleanupVerification() {
  const passengers = await db.orm.public.Passenger.select(
    "id",
    "passportNumberEncrypted"
  ).all();

  const missingEncryptedCount = passengers.filter((passenger) =>
    missingEncrypted(passenger.passportNumberEncrypted)
  ).length;

  const bookings = await db.orm.public.Booking.select(
    "id",
    "bookingReference"
  ).all();

  const remainingSeatTestBookings = bookings.filter((booking) =>
    (booking.bookingReference ?? "")
      .toUpperCase()
      .startsWith(TEST_BOOKING_PREFIX)
  ).length;

  return {
    remainingMissingEncryptedPassengers: missingEncryptedCount,
    remainingSjSeatBookings: remainingSeatTestBookings,
    schemaNotNullSafeToConsider:
      missingEncryptedCount === 0 && remainingSeatTestBookings === 0,
  };
}

async function main() {
  if (wantsExecute && !confirmCleanup) {
    console.error(
      "Refusing to run: --execute requires --confirm-test-seat-cleanup."
    );
    process.exitCode = 1;
    return;
  }

  if (!isDestructive && !dryRunFlag && wantsExecute === false) {
    // Default is dry-run even without the flag.
  }

  console.log(
    isDryRun
      ? "MODE: DRY RUN ONLY — NO DATA DELETED"
      : "MODE: DESTRUCTIVE EXECUTE (confirmed)"
  );
  console.log("");

  const assessments: Eligibility[] = [];

  for (const bookingId of [...CANDIDATE_BOOKING_IDS].sort((a, b) => a - b)) {
    const assessment = await assessBooking(bookingId);
    assessments.push(assessment);

    console.log(
      JSON.stringify(
        {
          bookingId: assessment.bookingId,
          bookingReference: assessment.bookingReference,
          passengerIds: assessment.passengerIds,
          seatAssignmentCount: assessment.seatAssignmentCount,
          bookingSegmentCount: assessment.bookingSegmentCount,
          eligible: assessment.eligible,
          reason: assessment.reason,
          blockers: assessment.blockers,
        },
        null,
        2
      )
    );
  }

  const eligible = assessments.filter((row) => row.eligible);
  const ineligible = assessments.filter((row) => !row.eligible);

  const totals = {
    eligibleBookings: eligible.length,
    eligiblePassengers: eligible.reduce(
      (sum, row) => sum + row.passengerIds.length,
      0
    ),
    seatAssignmentsToDelete: eligible.reduce(
      (sum, row) => sum + row.seatAssignmentCount,
      0
    ),
    bookingSegmentsToDelete: eligible.reduce(
      (sum, row) => sum + row.bookingSegmentCount,
      0
    ),
    bookingsToDelete: eligible.length,
    ineligibleBookings: ineligible.length,
  };

  console.log("\n--- TOTALS ---");
  console.log(`Eligible bookings: ${totals.eligibleBookings}`);
  console.log(`Eligible passengers: ${totals.eligiblePassengers}`);
  console.log(`SeatAssignments to delete: ${totals.seatAssignmentsToDelete}`);
  console.log(`BookingSegments to delete: ${totals.bookingSegmentsToDelete}`);
  console.log(`Bookings to delete: ${totals.bookingsToDelete}`);
  console.log(`Ineligible / blocked bookings: ${totals.ineligibleBookings}`);

  if (ineligible.length > 0) {
    console.log("\nBlocked bookings (manual review):");
    for (const row of ineligible) {
      console.log(
        `- booking ${row.bookingId}: ${row.reason} [${row.blockers.join(", ")}]`
      );
    }
  }

  if (isDryRun) {
    console.log("\nDRY RUN ONLY — NO DATA DELETED");
    return;
  }

  console.log("\nExecuting deletions for eligible bookings only...");
  const results = [];

  for (const assessment of eligible) {
    const result = await deleteEligibleBooking(assessment);
    results.push(result);
    console.log(JSON.stringify(result));
  }

  const verification = await postCleanupVerification();
  console.log("\n--- POST-CLEANUP VERIFICATION ---");
  console.log(JSON.stringify(verification, null, 2));
  console.log(
    verification.schemaNotNullSafeToConsider
      ? "passportNumberEncrypted could now be considered for NOT NULL (schema change still not applied)."
      : "passportNumberEncrypted should remain optional until remaining gaps are resolved."
  );
}

main()
  .catch((error) => {
    console.error(
      error instanceof Error
        ? error.message
        : "Test-seat passenger cleanup failed"
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.close();
  });
