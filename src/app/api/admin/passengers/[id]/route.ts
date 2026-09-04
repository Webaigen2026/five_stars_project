import { getCurrentUser } from "../../../../../lib/auth";
import { isAdmin } from "../../../../../lib/authorization";
import {
  AdminBookingRequestError,
  parsePositiveInt,
} from "../../../../../lib/admin-bookings";
import {
  parsePassengerWriteInput,
  toSafePassenger,
} from "../../../../../lib/admin-passengers";
import {
  calendarDateInTimeZone,
  getAirportTimeZone,
} from "../../../../../lib/airport-timezones";
import { validatePassengerAgeForType } from "../../../../../lib/passenger-age";
import { rejectUntrustedMutation } from "../../../../../lib/request-security";
import { logServerError } from "../../../../../lib/sensitive-data";
import { passportWriteFields } from "../../../../../lib/traveler-encryption";
import { db } from "../../../../../prisma/db";

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rejected = rejectUntrustedMutation(request);

    if (rejected) {
      return rejected;
    }

    const user = await getCurrentUser();

    if (!user) {
      return jsonError("Not authenticated.", 401);
    }

    if (!isAdmin(user.role)) {
      return jsonError("Forbidden.", 403);
    }

    const { id: rawId } = await params;
    const id = parsePositiveInt(rawId);

    if (id == null) {
      return jsonError("Passenger not found.", 404);
    }

    const existing = await db.orm.public.Passenger.where({ id }).first();

    if (!existing) {
      return jsonError("Passenger not found.", 404);
    }

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      throw new AdminBookingRequestError("Invalid JSON body.", 400);
    }

    const input = parsePassengerWriteInput(body);

    const booking = await db.orm.public.Booking.where({
      id: existing.bookingId,
    }).first();

    if (!booking) {
      throw new AdminBookingRequestError("Booking not found.", 404);
    }

    const outboundSegment = await db.orm.public.BookingSegment.where({
      bookingId: booking.id,
      segmentType: "OUTBOUND",
    }).first();

    const outboundFlightId = outboundSegment?.flightId ?? booking.flightId;
    const outboundFlight = await db.orm.public.Flight.where({
      id: outboundFlightId,
    }).first();

    if (!outboundFlight) {
      throw new AdminBookingRequestError("Outbound flight not found.", 404);
    }

    const departureDate = calendarDateInTimeZone(
      outboundFlight.departureTime,
      getAirportTimeZone(outboundFlight.originCode)
    );

    const ageCheck = validatePassengerAgeForType({
      dateOfBirth: input.dateOfBirth,
      departureDate,
      passengerType: existing.passengerType,
    });

    if (!ageCheck.valid) {
      throw new AdminBookingRequestError(
        ageCheck.message ?? "Date of birth does not match passenger type.",
        400
      );
    }

    const { passportNumber, ...identityFields } = input;

    await db.orm.public.Passenger.where({ id }).update({
      ...identityFields,
      ...passportWriteFields(passportNumber),
    });

    const passenger = await db.orm.public.Passenger.select(
      "id",
      "bookingId",
      "firstName",
      "lastName",
      "dateOfBirth",
      "gender",
      "nationality",
      "passengerType",
      "passportNumberEncrypted",
      "passportCountry",
      "passportExpiry",
      "createdAt",
      "updatedAt"
    )
      .where({ id })
      .first();

    if (!passenger) {
      return jsonError("Passenger not found.", 404);
    }

    return Response.json({ passenger: toSafePassenger(passenger) });
  } catch (error) {
    if (error instanceof AdminBookingRequestError) {
      return jsonError(error.message, error.status);
    }

    logServerError("Failed to update passenger.", error);
    return jsonError("Unable to update passenger.", 500);
  }
}
