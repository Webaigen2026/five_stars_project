/**
 * Shared account password lockout policy (login + sensitive re-auth).
 * Threshold and duration must stay identical across call sites.
 *
 * Failed-attempt persistence is concurrency-safe via atomic SQL increment
 * in `recordFailedLoginAttempt` (account-lockout-db.ts).
 */

export const ACCOUNT_LOCKOUT_THRESHOLD = 5;
export const ACCOUNT_LOCKOUT_MINUTES = 15;

/** Login-facing lockout copy (existing). */
export const ACCOUNT_LOCKED_LOGIN_MESSAGE =
  "Account temporarily locked. Please try again later.";

/** Passport re-auth lockout copy. */
export const ACCOUNT_LOCKED_REAUTH_MESSAGE =
  "Too many failed attempts. Please try again later.";

/** HTTP status used by login for active lockout. */
export const ACCOUNT_LOCKED_STATUS = 423;

export type FailedAttemptRow = {
  failedLoginAttempts: number;
  lockedUntil: string | null;
};

export type FailedAttemptResult = FailedAttemptRow & {
  isNowLocked: boolean;
};

export function isAccountLocked(lockedUntil: string | null | undefined) {
  if (!lockedUntil) {
    return false;
  }

  const lockedUntilDate = new Date(lockedUntil);

  if (Number.isNaN(lockedUntilDate.getTime())) {
    return false;
  }

  return lockedUntilDate.getTime() > Date.now();
}

export function lockoutUntilTimestamp(nowMs = Date.now()) {
  return new Date(
    nowMs + ACCOUNT_LOCKOUT_MINUTES * 60 * 1000
  ).toISOString();
}

/**
 * Pure model of one atomic DB failed-attempt update.
 * Matches: failedLoginAttempts = failedLoginAttempts + 1, then
 * lockedUntil = now+15m iff the new count reaches the threshold, else null.
 *
 * Prefer this over nextFailedAttemptState for concurrency reasoning — callers
 * must not write a stale application-side count.
 */
export function applyFailedAttemptRow(
  row: FailedAttemptRow,
  lockedUntilIso: string,
  threshold = ACCOUNT_LOCKOUT_THRESHOLD
): FailedAttemptResult {
  const failedLoginAttempts = row.failedLoginAttempts + 1;
  const isNowLocked = failedLoginAttempts >= threshold;

  return {
    failedLoginAttempts,
    lockedUntil: isNowLocked ? lockedUntilIso : null,
    isNowLocked,
  };
}

/**
 * @deprecated Prefer applyFailedAttemptRow / recordFailedLoginAttempt.
 * Kept for policy unit tests that assert threshold math from a known count.
 */
export function nextFailedAttemptState(currentAttempts: number) {
  return applyFailedAttemptRow(
    { failedLoginAttempts: currentAttempts, lockedUntil: null },
    lockoutUntilTimestamp()
  );
}

export function clearedLockoutState() {
  return {
    failedLoginAttempts: 0,
    lockedUntil: null as string | null,
  };
}

export function resultFromAttemptRow(row: FailedAttemptRow): FailedAttemptResult {
  return {
    failedLoginAttempts: row.failedLoginAttempts,
    lockedUntil: row.lockedUntil,
    isNowLocked:
      row.failedLoginAttempts >= ACCOUNT_LOCKOUT_THRESHOLD &&
      isAccountLocked(row.lockedUntil),
  };
}

/**
 * Simulate N concurrent atomic applies under DB-style serialization.
 * Proves increments are never lost when each apply is atomic.
 */
export async function simulateConcurrentFailedAttempts(input: {
  startingAttempts: number;
  concurrentFailures: number;
  lockedUntilIso?: string;
}): Promise<FailedAttemptResult> {
  let row: FailedAttemptRow = {
    failedLoginAttempts: input.startingAttempts,
    lockedUntil: null,
  };

  const lockedUntilIso = input.lockedUntilIso ?? lockoutUntilTimestamp();
  let chain: Promise<void> = Promise.resolve();

  const tasks = Array.from({ length: input.concurrentFailures }, () => {
    const run = chain.then(() => {
      row = applyFailedAttemptRow(row, lockedUntilIso);
    });
    // Serialize critical sections the way Postgres serializes row updates.
    chain = run.then(
      () => undefined,
      () => undefined
    );
    return run;
  });

  await Promise.all(tasks);
  return resultFromAttemptRow(row);
}
