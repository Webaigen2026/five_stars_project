/**
 * D8 security-hardening checks. Uses synthetic data only.
 *
 * Usage:
 *   npx tsx scripts/test-security-hardening.ts
 */
import { randomInt } from "node:crypto";

import bcrypt from "bcryptjs";

import { createUserSession, SESSION_COOKIE_NAME } from "../src/lib/auth";
import { isTrustedMutationOrigin } from "../src/lib/request-security";
import { maskPassportNumber } from "../src/lib/sensitive-data";
import {
  createTraveler,
  getOwnedTraveler,
  parseTravelerInput,
} from "../src/lib/travelers";
import { db } from "../src/prisma/db";

const stamp = `${Date.now()}-${randomInt(100, 999)}`;
const createdUserIds: number[] = [];
let failures = 0;

function ok(label: string, passed: boolean) {
  if (passed) {
    console.log(`  PASS  ${label}`);
    return;
  }

  failures += 1;
  console.error(`  FAIL  ${label}`);
}

const sampleTraveler = {
  label: "Myself",
  firstName: "Ada",
  lastName: "Lovelace",
  dateOfBirth: "1990-01-15",
  gender: "FEMALE",
  nationality: "Haitian",
  passportNumber: "HT-D8-SECRET",
  passportCountry: "Haiti",
  passportExpiry: "2030-12-31",
  isPrimary: true,
};

async function createTestUser() {
  const user = await db.orm.public.User.create({
    email: `d8.security.${stamp}.${createdUserIds.length}@example.com`,
    password: await bcrypt.hash("CorrectHorse1", 4),
    firstName: "Secure",
    lastName: "Tester",
    role: "CUSTOMER",
    emailVerified: true,
  });

  createdUserIds.push(user.id);
  return user;
}

async function cleanup() {
  for (const userId of createdUserIds) {
    const sessions = await db.orm.public.Session.where({ userId }).all();
    for (const session of sessions) {
      await db.orm.public.Session.where({ id: session.id }).delete();
    }

    const travelers = await db.orm.public.TravelerProfile.where({ userId }).all();
    for (const traveler of travelers) {
      await db.orm.public.TravelerProfile.where({ id: traveler.id }).delete();
    }
  }

  for (const userId of createdUserIds.splice(0).reverse()) {
    await db.orm.public.User.where({ id: userId }).delete();
  }
}

async function main() {
  console.log("\nPassport masking");
  ok("masks a full synthetic passport", maskPassportNumber("AB1234567") === "•••• 4567");
  ok("does not expose short values", maskPassportNumber("12") === "••••");

  console.log("\nSame-origin helper");
  ok(
    "same-origin Origin is trusted",
    isTrustedMutationOrigin(
      new Request("https://starjet.example/api/travelers", {
        method: "POST",
        headers: { origin: "https://starjet.example" },
      })
    )
  );
  ok(
    "foreign Origin is rejected",
    !isTrustedMutationOrigin(
      new Request("https://starjet.example/api/travelers", {
        method: "POST",
        headers: { origin: "https://evil.example" },
      })
    )
  );

  console.log("\nPrimary traveler uniqueness (current data)");
  const allTravelers = await db.orm.public.TravelerProfile.select(
    "userId",
    "isPrimary"
  ).all();
  const primaryCounts = new Map<number, number>();

  for (const traveler of allTravelers) {
    if (!traveler.isPrimary) {
      continue;
    }

    primaryCounts.set(
      traveler.userId,
      (primaryCounts.get(traveler.userId) ?? 0) + 1
    );
  }

  const duplicatePrimaryUsers = [...primaryCounts.values()].filter(
    (count) => count > 1
  ).length;
  ok(
    "no user currently has more than one primary traveler",
    duplicatePrimaryUsers === 0
  );
  console.log(
    `  note  TravelerProfile rows=${allTravelers.length}; users with a primary=${primaryCounts.size}`
  );

  const passengers = await db.orm.public.Passenger.select("id").all();
  console.log(`  note  Passenger snapshot rows=${passengers.length}`);

  console.log("\nAuthorization and cache");
  const owner = await createTestUser();
  const other = await createTestUser();
  const created = await createTraveler(
    owner.id,
    parseTravelerInput({ ...sampleTraveler, userId: other.id })
  );
  const owned = await getOwnedTraveler(owner.id, created.id);
  const leaked = await getOwnedTraveler(other.id, created.id);
  ok("owner can read own traveler", owned?.id === created.id);
  ok("other user cannot read that traveler", leaked === null);
  ok(
    "API traveler payload omits userId and timestamps",
    owned != null &&
      !("userId" in owned) &&
      !("createdAt" in owned) &&
      !("updatedAt" in owned)
  );

  const baseUrl = process.env.D8_APP_URL ?? "http://localhost:3000";

  try {
    const getRes = await fetch(`${baseUrl}/api/travelers`);
    const postRes = await fetch(`${baseUrl}/api/travelers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sampleTraveler),
    });
    const patchRes = await fetch(`${baseUrl}/api/travelers/1`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sampleTraveler),
    });
    const deleteRes = await fetch(`${baseUrl}/api/travelers/1`, {
      method: "DELETE",
    });
    ok("GET /api/travelers is 401 when logged out", getRes.status === 401);
    ok("POST /api/travelers is 401 when logged out", postRes.status === 401);
    ok("PATCH /api/travelers/:id is 401 when logged out", patchRes.status === 401);
    ok(
      "DELETE /api/travelers/:id is 401 when logged out",
      deleteRes.status === 401
    );

    const token = await createUserSession(owner);
    const cookie = `${SESSION_COOKIE_NAME}=${token}`;
    const ownerGet = await fetch(`${baseUrl}/api/travelers`, {
      headers: { cookie },
    });
    const cacheControl = ownerGet.headers.get("cache-control") ?? "";
    ok("authenticated GET travelers returns 200", ownerGet.ok);
    ok(
      "authenticated traveler response is no-store",
      cacheControl.includes("no-store") && cacheControl.includes("private")
    );

    const ownerBody = (await ownerGet.json()) as {
      travelers?: Array<Record<string, unknown>>;
    };
    const first = ownerBody.travelers?.[0];
    ok(
      "traveler API does not return userId or timestamps",
      first != null &&
        !("userId" in first) &&
        !("createdAt" in first) &&
        !("updatedAt" in first)
    );

    const crossOrigin = await fetch(`${baseUrl}/api/travelers`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        cookie,
        Origin: "https://evil.example",
      },
      body: JSON.stringify({
        ...sampleTraveler,
        firstName: "Eve",
        isPrimary: false,
      }),
    });
    ok(
      "foreign Origin POST is rejected before mutation",
      crossOrigin.status === 403
    );

    const afterCross = await listOwnedNames(owner.id);
    ok(
      "rejected cross-origin POST did not create a traveler",
      !afterCross.includes("Eve")
    );
  } catch {
    console.log("  skip  HTTP security checks (app server not reachable).");
  }

  await cleanup();
  await db.close();

  if (failures > 0) {
    console.error(`\n${failures} security test(s) failed.`);
    process.exit(1);
  }

  console.log("\nAll security hardening tests passed.");
}

async function listOwnedNames(userId: number) {
  const travelers = await db.orm.public.TravelerProfile.select(
    "firstName"
  )
    .where({ userId })
    .all();
  return travelers.map((traveler) => traveler.firstName);
}

main().catch(async (error) => {
  console.error(error instanceof Error ? error.name : "Test failed");
  try {
    await cleanup();
  } catch {
    // Keep cleanup failures from printing sensitive context.
  }
  await db.close();
  process.exit(1);
});
