import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  ACCOUNT_LOCKOUT_MINUTES,
  ACCOUNT_LOCKOUT_THRESHOLD,
  applyFailedAttemptRow,
  clearedLockoutState,
  isAccountLocked,
  lockoutUntilTimestamp,
  nextFailedAttemptState,
  simulateConcurrentFailedAttempts,
} from "./account-lockout";

describe("account lockout policy", () => {
  it("uses threshold 5 and duration 15 minutes", () => {
    assert.equal(ACCOUNT_LOCKOUT_THRESHOLD, 5);
    assert.equal(ACCOUNT_LOCKOUT_MINUTES, 15);
  });

  it("detects active and expired locks", () => {
    assert.equal(isAccountLocked(null), false);
    assert.equal(
      isAccountLocked(new Date(Date.now() + 60_000).toISOString()),
      true
    );
    assert.equal(
      isAccountLocked(new Date(Date.now() - 60_000).toISOString()),
      false
    );
  });

  it("locks on the attempt that reaches threshold", () => {
    const below = nextFailedAttemptState(ACCOUNT_LOCKOUT_THRESHOLD - 2);
    assert.equal(below.isNowLocked, false);
    assert.equal(below.lockedUntil, null);

    const at = nextFailedAttemptState(ACCOUNT_LOCKOUT_THRESHOLD - 1);
    assert.equal(at.failedLoginAttempts, ACCOUNT_LOCKOUT_THRESHOLD);
    assert.equal(at.isNowLocked, true);
    assert.ok(at.lockedUntil);
  });

  it("clears lockout state on success", () => {
    assert.deepEqual(clearedLockoutState(), {
      failedLoginAttempts: 0,
      lockedUntil: null,
    });
  });
});

describe("atomic failed-attempt semantics", () => {
  it("two concurrent failures from 0 yield count 2", async () => {
    const result = await simulateConcurrentFailedAttempts({
      startingAttempts: 0,
      concurrentFailures: 2,
      lockedUntilIso: lockoutUntilTimestamp(1_700_000_000_000),
    });

    assert.equal(result.failedLoginAttempts, 2);
    assert.equal(result.isNowLocked, false);
    assert.equal(result.lockedUntil, null);
  });

  it("multiple concurrent failures never lose increments", async () => {
    const result = await simulateConcurrentFailedAttempts({
      startingAttempts: 0,
      concurrentFailures: 10,
      lockedUntilIso: "2030-01-01T00:00:00.000Z",
    });

    assert.equal(result.failedLoginAttempts, 10);
    assert.equal(result.isNowLocked, true);
    assert.equal(result.lockedUntil, "2030-01-01T00:00:00.000Z");
  });

  it("concurrent requests crossing the threshold establish lockout", async () => {
    const lockIso = "2030-06-01T12:00:00.000Z";
    const result = await simulateConcurrentFailedAttempts({
      startingAttempts: ACCOUNT_LOCKOUT_THRESHOLD - 2,
      concurrentFailures: 3,
      lockedUntilIso: lockIso,
    });

    assert.equal(result.failedLoginAttempts, ACCOUNT_LOCKOUT_THRESHOLD + 1);
    assert.equal(result.isNowLocked, true);
    assert.equal(result.lockedUntil, lockIso);
  });

  it("threshold decision uses post-increment count, not stale app count", () => {
    const lockIso = lockoutUntilTimestamp();
    const fromFour = applyFailedAttemptRow(
      { failedLoginAttempts: 4, lockedUntil: null },
      lockIso
    );
    assert.equal(fromFour.failedLoginAttempts, 5);
    assert.equal(fromFour.isNowLocked, true);
    assert.equal(fromFour.lockedUntil, lockIso);

    const fromThree = applyFailedAttemptRow(
      { failedLoginAttempts: 3, lockedUntil: null },
      lockIso
    );
    assert.equal(fromThree.failedLoginAttempts, 4);
    assert.equal(fromThree.isNowLocked, false);
    assert.equal(fromThree.lockedUntil, null);
  });

  it("login and passport routes both call shared atomic recorder", async () => {
    const { readFileSync } = await import("node:fs");
    const { fileURLToPath } = await import("node:url");
    const path = await import("node:path");
    const root = path.dirname(fileURLToPath(import.meta.url));

    const login = readFileSync(
      path.join(root, "../app/api/auth/login/route.ts"),
      "utf8"
    );
    const passport = readFileSync(
      path.join(root, "../app/api/admin/passengers/[id]/passport/route.ts"),
      "utf8"
    );
    const store = readFileSync(
      path.join(root, "account-lockout-db.ts"),
      "utf8"
    );

    assert.equal(login.includes("recordFailedLoginAttempt"), true);
    assert.equal(login.includes("nextFailedAttemptState"), false);
    assert.equal(passport.includes("recordFailedLoginAttempt"), true);
    assert.equal(passport.includes("nextFailedAttemptState"), false);
    assert.equal(store.includes("failedLoginAttempts} + 1"), true);
    assert.equal(store.includes("ACCOUNT_LOCKOUT_THRESHOLD"), true);
    assert.equal(store.includes("ELSE NULL"), true);
  });
});
