import { getCurrentUser } from "../../../../../../lib/auth";
import { clearedLockoutState } from "../../../../../../lib/account-lockout";
import { recordFailedLoginAttempt } from "../../../../../../lib/account-lockout-db";
import {
  PASSPORT_REVEAL_CACHE_HEADERS,
  PASSPORT_REVEALED_ACTION,
  handlePassportRevealRequest,
  parseRevealPassword,
} from "../../../../../../lib/admin-passport-reveal";
import { verifyUserPassword } from "../../../../../../lib/password-verify";
import { rejectUntrustedMutation } from "../../../../../../lib/request-security";
import { db } from "../../../../../../prisma/db";

function jsonResponse(body: unknown, status: number) {
  return Response.json(body, {
    status,
    headers: PASSPORT_REVEAL_CACHE_HEADERS,
  });
}

/**
 * Authorized ADMIN-only passport reveal with password re-authentication
 * and shared account lockout protection.
 *
 * POST /api/admin/passengers/[id]/passport
 * Body: { "password": "..." }
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const rejected = rejectUntrustedMutation(request);

  if (rejected) {
    return rejected;
  }

  const user = await getCurrentUser();
  const { id: rawId } = await params;

  let body: unknown = null;

  try {
    body = await request.json();
  } catch {
    body = null;
  }

  const password = parseRevealPassword(body);

  const result = await handlePassportRevealRequest({
    user,
    password,
    passengerIdRaw: rawId,
    loadAccountSecurity: async () => {
      if (!user) {
        return null;
      }

      const account = await db.orm.public.User.select(
        "id",
        "password",
        "failedLoginAttempts",
        "lockedUntil"
      )
        .where({ id: user.id })
        .first();

      if (!account?.password) {
        return null;
      }

      return {
        passwordHash: account.password,
        failedLoginAttempts: account.failedLoginAttempts,
        lockedUntil: account.lockedUntil,
      };
    },
    verifyPassword: verifyUserPassword,
    recordFailedAttempt: async () => {
      if (!user) {
        return { isNowLocked: false };
      }

      const next = await recordFailedLoginAttempt(user.id);
      return { isNowLocked: next.isNowLocked };
    },
    clearFailedAttempts: async () => {
      if (!user) {
        return;
      }

      await db.orm.public.User.where({ id: user.id }).update(
        clearedLockoutState()
      );
    },
    loadPassenger: async (id) =>
      db.orm.public.Passenger.select("id", "passportNumberEncrypted")
        .where({ id })
        .first(),
    writeAudit: async (event) => {
      await db.orm.public.AdminAuditLog.create({
        adminUserId: event.adminUserId,
        passengerId: event.passengerId,
        action: event.action ?? PASSPORT_REVEALED_ACTION,
      });
    },
  });

  return jsonResponse(result.body, result.status);
}

export async function GET() {
  return jsonResponse({ error: "Method not allowed." }, 405);
}
