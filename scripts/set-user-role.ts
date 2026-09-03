/**
 * Development-only helper to set a user's role in Neon.
 *
 * Usage:
 *   npx tsx scripts/set-user-role.ts user@example.com STAFF
 *   npx tsx scripts/set-user-role.ts user@example.com ADMIN
 *   npx tsx scripts/set-user-role.ts user@example.com CUSTOMER
 *
 * Do not expose this as an HTTP API.
 */
import { db } from "../src/prisma/db";

const ALLOWED_ROLES = ["CUSTOMER", "STAFF", "ADMIN"] as const;

async function main() {
  if (process.env.NODE_ENV === "production") {
    console.error("This script is development-only.");
    process.exit(1);
  }

  const email = process.argv[2]?.trim().toLowerCase();
  const role = process.argv[3]?.trim().toUpperCase();

  if (!email || !role) {
    console.error(
      "Usage: npx tsx scripts/set-user-role.ts <email> <CUSTOMER|STAFF|ADMIN>"
    );
    process.exit(1);
  }

  if (!ALLOWED_ROLES.includes(role as (typeof ALLOWED_ROLES)[number])) {
    console.error(`Role must be one of: ${ALLOWED_ROLES.join(", ")}`);
    process.exit(1);
  }

  const user = await db.orm.public.User.where({ email }).first();

  if (!user) {
    console.error("No user found for that email.");
    process.exit(1);
  }

  await db.orm.public.User.where({ id: user.id }).update({ role });

  console.log(`Updated ${email} to role ${role}.`);
}

main()
  .catch((error) => {
    console.error("Failed to update user role:");
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await db.close();
  });
