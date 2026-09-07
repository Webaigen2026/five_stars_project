/**
 * Development-only helper to grant/revoke sensitive traveler-data access.
 *
 * Usage:
 *   npx tsx --conditions=react-server scripts/set-sensitive-traveler-access.ts user@example.com true
 *   npx tsx --conditions=react-server scripts/set-sensitive-traveler-access.ts user@example.com false
 *
 * Granting true requires role === ADMIN.
 * CUSTOMER and STAFF are refused for true.
 * Only updates canViewSensitiveTravelerData — never role or password.
 *
 * Do not expose this as an HTTP API.
 */
import "dotenv/config";

import { db } from "../src/prisma/db";

function parseBoolFlag(raw: string | undefined) {
  const value = raw?.trim().toLowerCase();

  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  return null;
}

async function main() {
  if (process.env.NODE_ENV === "production") {
    console.error("This script is development-only.");
    process.exit(1);
  }

  const email = process.argv[2]?.trim().toLowerCase();
  const nextValue = parseBoolFlag(process.argv[3]);

  if (!email || nextValue === null) {
    console.error(
      "Usage: npx tsx --conditions=react-server scripts/set-sensitive-traveler-access.ts <email> <true|false>"
    );
    process.exit(1);
  }

  const user = await db.orm.public.User.select(
    "id",
    "email",
    "role",
    "canViewSensitiveTravelerData"
  )
    .where({ email })
    .first();

  if (!user) {
    console.error("No user found for that email.");
    process.exit(1);
  }

  if (user.email !== email) {
    console.error("Email mismatch after lookup. No write performed.");
    process.exit(1);
  }

  if (nextValue === true && user.role !== "ADMIN") {
    console.error(
      `Refusing to grant canViewSensitiveTravelerData=true to role ${user.role}. ADMIN required.`
    );
    process.exit(1);
  }

  const previous = user.canViewSensitiveTravelerData;

  if (previous === nextValue) {
    console.log(
      JSON.stringify(
        {
          userId: user.id,
          email: user.email,
          role: user.role,
          previousPermission: previous,
          newPermission: nextValue,
          changed: false,
        },
        null,
        2
      )
    );
    return;
  }

  await db.orm.public.User.where({ id: user.id }).update({
    canViewSensitiveTravelerData: nextValue,
  });

  console.log(
    JSON.stringify(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        previousPermission: previous,
        newPermission: nextValue,
        changed: true,
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error("Failed to update sensitive traveler access:");
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(async () => {
    await db.close();
  });
