import { AdminBookingRequestError } from "./admin-bookings";
import { getDecryptedPassportNumber } from "./traveler-encryption";

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

export type PassengerWriteInput = Record<PassengerField, string>;

export type SafePassenger = {
  id: number;
  bookingId: number;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  nationality: string;
  passengerType: string;
  passportNumber: string;
  passportCountry: string;
  passportExpiry: string;
  createdAt: string;
  updatedAt: string;
};

function asTrimmedString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function toSafePassenger(
  passenger: Omit<SafePassenger, "passportNumber"> & {
    passportNumberEncrypted?: string | null;
    passengerType?: string | null;
  }
): SafePassenger {
  return {
    id: passenger.id,
    bookingId: passenger.bookingId,
    firstName: passenger.firstName,
    lastName: passenger.lastName,
    dateOfBirth: passenger.dateOfBirth,
    gender: passenger.gender,
    nationality: passenger.nationality,
    passengerType: passenger.passengerType ?? "ADULT",
    passportNumber: getDecryptedPassportNumber(passenger),
    passportCountry: passenger.passportCountry,
    passportExpiry: passenger.passportExpiry,
    createdAt: passenger.createdAt,
    updatedAt: passenger.updatedAt,
  };
}

export function parsePassengerWriteInput(body: unknown): PassengerWriteInput {
  if (!body || typeof body !== "object") {
    throw new AdminBookingRequestError("Invalid passenger payload.", 400);
  }

  const payload = body as Record<string, unknown>;
  const parsed = {} as PassengerWriteInput;

  for (const field of PASSENGER_FIELDS) {
    const value = asTrimmedString(payload[field]);

    if (!value) {
      throw new AdminBookingRequestError(`${field} is required.`, 400);
    }

    if (
      (field === "dateOfBirth" || field === "passportExpiry") &&
      !DATE_ONLY_PATTERN.test(value)
    ) {
      throw new AdminBookingRequestError(`${field} must be YYYY-MM-DD.`, 400);
    }

    parsed[field] = value;
  }

  return parsed;
}
