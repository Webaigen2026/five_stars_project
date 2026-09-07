import { getCurrentUser } from "../../../../../../lib/auth";
import { clearedLockoutState } from "../../../../../../lib/account-lockout";
import { recordFailedLoginAttempt } from "../../../../../../lib/account-lockout-db";
import {
  PASSENGER_MANIFEST_CACHE_HEADERS,
  PASSENGER_MANIFEST_CONTENT_TYPE,
  PASSENGER_MANIFEST_UNABLE_MESSAGE,
  buildManifestAuditEvent,
  buildManifestFilename,
  handlePassengerManifestRequest,
  isManifestEligibleBookingStatus,
  parseManifestExportBody,
  uniqueBookingIds,
  type ManifestPassengerRow,
} from "../../../../../../lib/passenger-manifest";
import { buildPassengerManifestWorkbook } from "../../../../../../lib/passenger-manifest-xlsx";
import { verifyUserPassword } from "../../../../../../lib/password-verify";
import { rejectUntrustedMutation } from "../../../../../../lib/request-security";
import { db } from "../../../../../../prisma/db";

function jsonError(error: string, status: number) {
  return Response.json(
    { error },
    {
      status,
      headers: PASSENGER_MANIFEST_CACHE_HEADERS,
    }
  );
}

async function loadPassengersForFlight(
  flightId: number
): Promise<ManifestPassengerRow[]> {
  const [segments, legacyBookings] = await Promise.all([
    db.orm.public.BookingSegment.select("bookingId")
      .where({ flightId })
      .all(),
    db.orm.public.Booking.select("id", "status").where({ flightId }).all(),
  ]);

  const candidateIds = uniqueBookingIds([
    ...segments.map((segment) => segment.bookingId),
    ...legacyBookings.map((booking) => booking.id),
  ]);

  if (candidateIds.length === 0) {
    return [];
  }

  const statusById = new Map(
    legacyBookings.map((booking) => [booking.id, booking.status] as const)
  );

  const missingIds = candidateIds.filter((id) => !statusById.has(id));

  if (missingIds.length > 0) {
    const extras = await Promise.all(
      missingIds.map((id) =>
        db.orm.public.Booking.select("id", "status").where({ id }).first()
      )
    );

    for (const booking of extras) {
      if (booking) {
        statusById.set(booking.id, booking.status);
      }
    }
  }

  const eligibleIds = candidateIds.filter((id) => {
    const status = statusById.get(id);
    return status != null && isManifestEligibleBookingStatus(status);
  });

  if (eligibleIds.length === 0) {
    return [];
  }

  const passengerGroups = await Promise.all(
    eligibleIds.map((bookingId) =>
      db.orm.public.Passenger.select(
        "id",
        "bookingId",
        "firstName",
        "lastName",
        "dateOfBirth",
        "gender",
        "nationality",
        "passportCountry",
        "passportNumberEncrypted",
        "passportExpiry"
      )
        .where({ bookingId })
        .all()
    )
  );

  return passengerGroups
    .flat()
    .map((passenger) => ({
      id: passenger.id,
      firstName: passenger.firstName,
      lastName: passenger.lastName,
      dateOfBirth: passenger.dateOfBirth,
      gender: passenger.gender,
      nationality: passenger.nationality,
      passportCountry: passenger.passportCountry,
      passportNumberEncrypted: passenger.passportNumberEncrypted,
      passportExpiry: passenger.passportExpiry,
    }))
    .sort((left, right) => {
      const byLast = left.lastName.localeCompare(right.lastName);
      if (byLast !== 0) {
        return byLast;
      }
      return left.firstName.localeCompare(right.firstName);
    });
}

/**
 * Authorized sensitive-data ADMIN passenger manifest export.
 *
 * POST /api/admin/flights/[id]/passenger-manifest
 * Body: { "passportMode": "masked" | "full", "password": "..." }
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

  const { passportMode, password } = parseManifestExportBody(body);

  const result = await handlePassengerManifestRequest({
    user,
    password,
    passportMode,
    flightIdRaw: rawId,
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
    loadFlight: async (id) =>
      db.orm.public.Flight.select("id", "code", "departureTime")
        .where({ id })
        .first(),
    loadPassengersForFlight,
  });

  if (!result.ok) {
    return jsonError(result.error, result.status);
  }

  const flightId = Number(rawId);
  const auditEvent = buildManifestAuditEvent({
    adminUserId: user!.id,
    flightId,
    passportMode: passportMode!,
  });

  try {
    await db.orm.public.AdminAuditLog.create({
      adminUserId: auditEvent.adminUserId,
      flightId: auditEvent.flightId,
      action: auditEvent.action,
    });
  } catch {
    console.error("Passenger manifest audit write failed", {
      flightId: auditEvent.flightId,
      adminUserId: auditEvent.adminUserId,
      action: auditEvent.action,
    });
    return jsonError("Unable to complete request.", 500);
  }

  let workbook: Buffer;

  try {
    workbook = await buildPassengerManifestWorkbook(result.rows);
  } catch {
    console.error("Passenger manifest workbook generation failed", {
      flightId: auditEvent.flightId,
      adminUserId: auditEvent.adminUserId,
      code: "WORKBOOK_ERROR",
    });
    return jsonError(PASSENGER_MANIFEST_UNABLE_MESSAGE, 500);
  }

  const filename = buildManifestFilename({
    flightCode: result.flightCode,
    departureDate: result.departureDate,
  });

  return new Response(new Uint8Array(workbook), {
    status: 200,
    headers: {
      ...PASSENGER_MANIFEST_CACHE_HEADERS,
      "Content-Type": PASSENGER_MANIFEST_CONTENT_TYPE,
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

export async function GET() {
  return jsonError("Method not allowed.", 405);
}
