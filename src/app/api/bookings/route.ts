import { randomInt } from "node:crypto";

import { getCurrentUser } from "../../../lib/auth";
import {
  calculateBookingTotals,
  validateRoundTripFlights,
} from "../../../lib/booking-legs";
import { parseTripType } from "../../../lib/flight-search";
import { MAX_TRAVELERS, resolvePassengerTypesForBooking } from "../../../lib/passenger-composition";
import { rejectUntrustedMutation } from "../../../lib/request-security";
import { logServerError } from "../../../lib/sensitive-data";
import { passportWriteFields } from "../../../lib/traveler-encryption";
import { db } from "../../../prisma/db";

const MAX_PASSENGERS = MAX_TRAVELERS;
const BOOKING_REFERENCE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const PASSENGER_FIELDS = [
  "firstName",
  "lastName",
  "dateOfBirth",
  "gender",
  "nationality",
  "passportNumber",
  "passportCountry",
  "passportExpiry",
] as const;

type PassengerField = (typeof PASSENGER_FIELDS)[number];

type PassengerInput = Record<PassengerField, string> & {
  passengerType: string;
};

class BookingRequestError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
  }
}

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

function asTrimmedString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function parsePositiveInt(value: unknown) {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number.parseInt(value.trim(), 10);
    if (Number.isInteger(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return null;
}

function generateBookingReference() {
  let suffix = "";

  for (let index = 0; index < 6; index += 1) {
    suffix +=
      BOOKING_REFERENCE_ALPHABET[randomInt(BOOKING_REFERENCE_ALPHABET.length)];
  }

  return `SJ-${suffix}`;
}

function parsePassengers(
  value: unknown,
  compositionInput: {
    adults?: unknown;
    seniors?: unknown;
    children?: unknown;
    infants?: unknown;
  }
): PassengerInput[] {
  if (!Array.isArray(value)) {
    throw new BookingRequestError("At least 1 passenger is required.", 400);
  }

  if (value.length < 1) {
    throw new BookingRequestError("At least 1 passenger is required.", 400);
  }

  if (value.length > MAX_PASSENGERS) {
    throw new BookingRequestError(
      `A booking can include at most ${MAX_PASSENGERS} passengers.`,
      400
    );
  }

  const authoritativeTypes = resolvePassengerTypesForBooking({
    passengerCount: value.length,
    adults:
      typeof compositionInput.adults === "string" ||
      typeof compositionInput.adults === "number"
        ? compositionInput.adults
        : null,
    seniors:
      typeof compositionInput.seniors === "string" ||
      typeof compositionInput.seniors === "number"
        ? compositionInput.seniors
        : null,
    children:
      typeof compositionInput.children === "string" ||
      typeof compositionInput.children === "number"
        ? compositionInput.children
        : null,
    infants:
      typeof compositionInput.infants === "string" ||
      typeof compositionInput.infants === "number"
        ? compositionInput.infants
        : null,
  });

  return value.map((passenger, index) => {
    if (!passenger || typeof passenger !== "object") {
      throw new BookingRequestError(`Passenger ${index + 1} is invalid.`, 400);
    }

    const record = passenger as Record<string, unknown>;
    const parsed = {} as PassengerInput;

    for (const field of PASSENGER_FIELDS) {
      const fieldValue = asTrimmedString(record[field]);

      if (!fieldValue) {
        throw new BookingRequestError(
          `Passenger ${index + 1} is missing ${field}.`,
          400
        );
      }

      if (
        (field === "dateOfBirth" || field === "passportExpiry") &&
        !DATE_ONLY_PATTERN.test(fieldValue)
      ) {
        throw new BookingRequestError(
          `Passenger ${index + 1} has an invalid ${field}.`,
          400
        );
      }

      parsed[field] = fieldValue;
    }

    // Ignore any client-supplied passengerType; derive from trusted composition.
    parsed.passengerType = authoritativeTypes[index] ?? "ADULT";
    return parsed;
  });
}

async function createUniqueBookingReference() {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const bookingReference = generateBookingReference();
    const existing = await db.orm.public.Booking.where({
      bookingReference,
    }).first();

    if (!existing) {
      return bookingReference;
    }
  }

  throw new BookingRequestError(
    "Unable to generate a unique booking reference.",
    500
  );
}

async function createPassengerSnapshots(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  bookingId: number,
  passengers: PassengerInput[]
) {
  for (const passenger of passengers) {
    await tx.orm.public.Passenger.create({
      bookingId,
      firstName: passenger.firstName,
      lastName: passenger.lastName,
      dateOfBirth: passenger.dateOfBirth,
      gender: passenger.gender,
      nationality: passenger.nationality,
      passengerType: passenger.passengerType,
      ...passportWriteFields(passenger.passportNumber),
      passportCountry: passenger.passportCountry,
      passportExpiry: passenger.passportExpiry,
    });
  }
}

export async function POST(request: Request) {
  try {
    const rejected = rejectUntrustedMutation(request);

    if (rejected) {
      return rejected;
    }

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      throw new BookingRequestError("Invalid JSON body.", 400);
    }

    if (!body || typeof body !== "object") {
      throw new BookingRequestError("Invalid booking payload.", 400);
    }

    const payload = body as Record<string, unknown>;
    const tripType = parseTripType(
      typeof payload.tripType === "string" ? payload.tripType : undefined
    );
    const passengers = parsePassengers(payload.passengers, {
      adults: payload.adults,
      seniors: payload.seniors,
      children: payload.children,
      infants: payload.infants,
    });
    const passengerCount = passengers.length;
    const bookingReference = await createUniqueBookingReference();
    const currentUser = await getCurrentUser();

    if (tripType === "round-trip") {
      const outboundFlightId = parsePositiveInt(payload.outboundFlightId);
      const returnFlightId = parsePositiveInt(payload.returnFlightId);

      if (outboundFlightId == null || returnFlightId == null) {
        throw new BookingRequestError(
          "Outbound and return flights are required.",
          400
        );
      }

      const [outbound, returnFlight] = await Promise.all([
        db.orm.public.Flight.where({ id: outboundFlightId }).first(),
        db.orm.public.Flight.where({ id: returnFlightId }).first(),
      ]);

      if (!outbound || !returnFlight) {
        throw new BookingRequestError("Selected flight was not found.", 404);
      }

      const routeError = validateRoundTripFlights({
        outbound,
        returnFlight,
        passengerCount,
      });

      if (routeError) {
        throw new BookingRequestError(routeError, 400);
      }

      const { subtotal, taxesAndFees, total } = calculateBookingTotals({
        unitPricesCents: [outbound.price, returnFlight.price],
        passengerCount,
      });

      const booking = await db.transaction(async (tx) => {
        const createdBooking = await tx.orm.public.Booking.create({
          bookingReference,
          flightId: outbound.id,
          passengerCount,
          subtotal,
          taxesAndFees,
          total,
          status: "DRAFT",
          inventoryHeld: false,
          ...(currentUser ? { userId: currentUser.id } : {}),
        });

        await tx.orm.public.BookingSegment.create({
          bookingId: createdBooking.id,
          flightId: outbound.id,
          segmentType: "OUTBOUND",
          sequence: 1,
        });

        await tx.orm.public.BookingSegment.create({
          bookingId: createdBooking.id,
          flightId: returnFlight.id,
          segmentType: "RETURN",
          sequence: 2,
        });

        await createPassengerSnapshots(tx, createdBooking.id, passengers);

        return createdBooking;
      });

      return Response.json(
        {
          bookingReference: booking.bookingReference,
        },
        { status: 201 }
      );
    }

    const flightCode = asTrimmedString(payload.flightCode);

    if (!flightCode) {
      throw new BookingRequestError("A flight code is required.", 400);
    }

    const flight = await db.orm.public.Flight.where({
      code: flightCode,
    }).first();

    if (!flight) {
      throw new BookingRequestError("Selected flight was not found.", 404);
    }

    if (flight.status !== "SCHEDULED") {
      throw new BookingRequestError(
        "This flight is not available for booking.",
        400
      );
    }

    // UX-only check. DRAFT creation does not reserve or decrement seats.
    if (flight.availableSeats < passengerCount) {
      throw new BookingRequestError(
        "Not enough seats are available for this flight.",
        400
      );
    }

    const { subtotal, taxesAndFees, total } = calculateBookingTotals({
      unitPricesCents: [flight.price],
      passengerCount,
    });

    const booking = await db.transaction(async (tx) => {
      const createdBooking = await tx.orm.public.Booking.create({
        bookingReference,
        flightId: flight.id,
        passengerCount,
        subtotal,
        taxesAndFees,
        total,
        status: "DRAFT",
        inventoryHeld: false,
        ...(currentUser ? { userId: currentUser.id } : {}),
      });

      await tx.orm.public.BookingSegment.create({
        bookingId: createdBooking.id,
        flightId: flight.id,
        segmentType: "OUTBOUND",
        sequence: 1,
      });

      await createPassengerSnapshots(tx, createdBooking.id, passengers);

      return createdBooking;
    });

    return Response.json(
      {
        bookingReference: booking.bookingReference,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof BookingRequestError) {
      return jsonError(error.message, error.status);
    }

    logServerError("Failed to create booking.", error);
    return jsonError("Unable to create booking.", 500);
  }
}
