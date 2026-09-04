/**
 * Correct SJ604 arrival only (bad manual 02:00 instead of 14:00 local).
 *
 * Intended:
 *   PAP 2026-09-06 10:00 America/Port-au-Prince
 *   BOS 2026-09-06 14:00 America/New_York
 *
 * Usage:
 *   npx tsx --conditions=react-server scripts/fix-sj604-times.ts --dry-run
 *   npx tsx --conditions=react-server scripts/fix-sj604-times.ts
 */
import "dotenv/config";

import {
  elapsedDurationMinutes,
  wallClockInTimeZoneToUtcIso,
} from "../src/lib/airport-timezones";
import { db } from "../src/prisma/db";

const dryRun = process.argv.includes("--dry-run");

async function main() {
  const flight = await db.orm.public.Flight.where({ code: "SJ604" }).first();

  if (!flight) {
    console.error("SJ604 not found.");
    process.exitCode = 1;
    return;
  }

  const departureTime = wallClockInTimeZoneToUtcIso(
    "2026-09-06T10:00",
    "America/Port-au-Prince"
  );
  const arrivalTime = wallClockInTimeZoneToUtcIso(
    "2026-09-06T14:00",
    "America/New_York"
  );
  const durationMinutes = elapsedDurationMinutes(departureTime, arrivalTime);

  if (durationMinutes == null) {
    throw new Error("Computed duration is invalid.");
  }

  const before = {
    departureTime: flight.departureTime,
    arrivalTime: flight.arrivalTime,
    durationMinutes: flight.durationMinutes,
  };
  const after = { departureTime, arrivalTime, durationMinutes };

  console.log(JSON.stringify({ dryRun, before, after }, null, 2));

  if (dryRun) {
    return;
  }

  await db.orm.public.Flight.where({ id: flight.id }).update({
    departureTime,
    arrivalTime,
    durationMinutes,
  });

  const updated = await db.orm.public.Flight.where({ id: flight.id }).first();
  console.log(
    JSON.stringify(
      {
        updated: {
          departureTime: updated?.departureTime,
          arrivalTime: updated?.arrivalTime,
          durationMinutes: updated?.durationMinutes,
        },
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
