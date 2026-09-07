import "server-only";

import {
  ACCOUNT_LOCKOUT_THRESHOLD,
  lockoutUntilTimestamp,
  resultFromAttemptRow,
  type FailedAttemptResult,
  type FailedAttemptRow,
} from "./account-lockout";
import { db } from "../prisma/db";

type TransactionClient = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function collectRows<T>(result: unknown): Promise<T[]> {
  if (result == null) {
    return [];
  }

  if (typeof result === "object" && Symbol.asyncIterator in result) {
    const rows: T[] = [];

    for await (const row of result as AsyncIterable<T>) {
      rows.push(row);
    }

    return rows;
  }

  return (await result) as T[];
}

/**
 * Atomically record one failed password attempt for a user.
 *
 * Uses SQL expression update (same pattern as inventory seat decrement):
 *   failedLoginAttempts = failedLoginAttempts + 1
 *   lockedUntil = CASE WHEN new count >= threshold THEN now+15m ELSE NULL END
 *
 * Concurrent callers cannot overwrite each other's increments. The threshold
 * decision uses the post-increment value inside the same UPDATE, not a stale
 * application-side count.
 */
export async function recordFailedLoginAttempt(
  userId: number
): Promise<FailedAttemptResult> {
  const lockedUntilIso = lockoutUntilTimestamp();

  return db.transaction(async (tx) => {
    return atomicFailedAttemptUpdate(tx, userId, lockedUntilIso);
  });
}

async function atomicFailedAttemptUpdate(
  tx: TransactionClient,
  userId: number,
  lockedUntilIso: string
): Promise<FailedAttemptResult> {
  const plan = tx.sql.public.user
    .update((user, fns) => ({
      failedLoginAttempts: fns
        .raw`${user.failedLoginAttempts} + 1`
        .returns("pg/int4@1"),
      lockedUntil: fns
        .raw`CASE WHEN ${user.failedLoginAttempts} + 1 >= ${ACCOUNT_LOCKOUT_THRESHOLD} THEN ${lockedUntilIso}::timestamptz ELSE NULL END`
        .returns("pg/timestamptz-string@1"),
    }))
    .where((user, fns) => fns.eq(user.id, userId))
    .returning("failedLoginAttempts", "lockedUntil")
    .build();

  const rows = await collectRows<FailedAttemptRow>(tx.query(plan));

  if (rows.length !== 1) {
    throw new Error("Failed to record login attempt.");
  }

  return resultFromAttemptRow(rows[0]);
}
