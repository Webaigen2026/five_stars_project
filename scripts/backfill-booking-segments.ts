/**
 * Additive backfill: create one OUTBOUND BookingSegment for each Booking
 * that has no segment rows yet. Does not modify Booking.flightId or inventory.
 *
 * Usage:
 *   npx tsx --conditions=react-server scripts/backfill-booking-segments.ts --dry-run
 *   npx tsx --conditions=react-server scripts/backfill-booking-segments.ts
 */
import "dotenv/config";

import { db } from "../src/prisma/db";

const dryRun = process.argv.includes("--dry-run");

async function main() {
  const bookings = await db.orm.public.Booking.select("id", "flightId").all();
  let alreadySegmented = 0;
  let toCreate = 0;
  let created = 0;

  for (const booking of bookings) {
    const existing = await db.orm.public.BookingSegment.where({
      bookingId: booking.id,
    }).first();

    if (existing) {
      alreadySegmented += 1;
      continue;
    }

    toCreate += 1;

    if (dryRun) {
      continue;
    }

    await db.orm.public.BookingSegment.create({
      bookingId: booking.id,
      flightId: booking.flightId,
      segmentType: "OUTBOUND",
      sequence: 1,
    });
    created += 1;
  }

  console.log(
    JSON.stringify(
      {
        mode: dryRun ? "dry-run" : "apply",
        totalBookings: bookings.length,
        alreadySegmented,
        needingSegment: toCreate,
        created: dryRun ? 0 : created,
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.close());
