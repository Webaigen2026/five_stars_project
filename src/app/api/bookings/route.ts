import { randomInt } from "node:crypto";

import { getCurrentUser } from "../../../lib/auth";
import { rejectUntrustedMutation } from "../../../lib/request-security";
import { logServerError } from "../../../lib/sensitive-data";
import { passportWriteFields } from "../../../lib/traveler-encryption";
import { db } from "../../../prisma/db";

const TAXES_AND_FEES_PER_PASSENGER = 6800;
const MAX_PASSENGERS = 6;
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

type PassengerInput = Record<PassengerField, string>;

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

function generateBookingReference() {
  let suffix = "";

  for (let index = 0; index < 6; index += 1) {
    suffix += BOOKING_REFERENCE_ALPHABET[randomInt(BOOKING_REFERENCE_ALPHABET.length)];
  }

  return `SJ-${suffix}`;
}

function parsePassengers(value: unknown): PassengerInput[] {
  if (!Array.isArray(value)) {
    throw new BookingRequestError(
      "At least 1 passenger is required.",
      400
    );
  }

  if (value.length < 1) {
    throw new BookingRequestError(
      "At least 1 passenger is required.",
      400
    );
  }

  if (value.length > MAX_PASSENGERS) {
    throw new BookingRequestError(
      "A booking can include at most 6 passengers.",
      400
    );
  }

  return value.map((passenger, index) => {
    if (!passenger || typeof passenger !== "object") {
      throw new BookingRequestError(
        `Passenger ${index + 1} is invalid.`,
        400
      );
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
    const flightCode = asTrimmedString(payload.flightCode);

    if (!flightCode) {
      throw new BookingRequestError("A flight code is required.", 400);
    }

    const passengers = parsePassengers(payload.passengers);
    const passengerCount = passengers.length;

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

    const subtotal = flight.price * passengerCount;
    const taxesAndFees = TAXES_AND_FEES_PER_PASSENGER * passengerCount;
    const total = subtotal + taxesAndFees;
    const bookingReference = await createUniqueBookingReference();
    const currentUser = await getCurrentUser();

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

      for (const passenger of passengers) {
        await tx.orm.public.Passenger.create({
          bookingId: createdBooking.id,
          firstName: passenger.firstName,
          lastName: passenger.lastName,
          dateOfBirth: passenger.dateOfBirth,
          gender: passenger.gender,
          nationality: passenger.nationality,
          ...passportWriteFields(passenger.passportNumber),
          passportCountry: passenger.passportCountry,
          passportExpiry: passenger.passportExpiry,
        });
      }

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
