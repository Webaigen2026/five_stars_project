export const TRAVELER_GENDERS = ["MALE", "FEMALE", "OTHER"] as const;

export type TravelerGender = (typeof TRAVELER_GENDERS)[number];

export type TravelerInput = {
  label: string | null;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  nationality: string;
  passportNumber: string;
  passportCountry: string;
  passportExpiry: string;
  isPrimary: boolean;
};

export type SafeTraveler = {
  id: number;
  label: string | null;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  nationality: string;
  passportNumber: string;
  passportCountry: string;
  passportExpiry: string;
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
};

export class TravelerError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
  }
}

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MAX_LABEL_LENGTH = 80;
const MAX_NAME_LENGTH = 100;
const MAX_NATIONALITY_LENGTH = 80;
const MAX_COUNTRY_LENGTH = 80;
const MAX_PASSPORT_LENGTH = 30;

function asTrimmedString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asOptionalLabel(value: unknown) {
  const label = asTrimmedString(value);
  return label.length > 0 ? label : null;
}

export function isTravelerGender(value: string): value is TravelerGender {
  return (TRAVELER_GENDERS as readonly string[]).includes(value);
}

export function parsePositiveInt(value: string) {
  if (!/^\d+$/.test(value)) {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

export function maskPassportNumber(value: string) {
  const trimmed = value.trim();

  if (trimmed.length <= 4) {
    return "••••";
  }

  return `•••• ${trimmed.slice(-4)}`;
}

export function travelerDisplayName(traveler: {
  label: string | null;
  firstName: string;
  lastName: string;
}) {
  const name = `${traveler.firstName} ${traveler.lastName}`.trim();
  const label = traveler.label?.trim();

  if (label && label.toLowerCase() !== name.toLowerCase()) {
    return `${label} — ${name}`;
  }

  return name || "Saved traveler";
}

export function toSafeTraveler(traveler: SafeTraveler): SafeTraveler {
  return {
    id: traveler.id,
    label: traveler.label,
    firstName: traveler.firstName,
    lastName: traveler.lastName,
    dateOfBirth: traveler.dateOfBirth,
    gender: traveler.gender,
    nationality: traveler.nationality,
    passportNumber: traveler.passportNumber,
    passportCountry: traveler.passportCountry,
    passportExpiry: traveler.passportExpiry,
    isPrimary: traveler.isPrimary,
    createdAt: traveler.createdAt,
    updatedAt: traveler.updatedAt,
  };
}

export function sortTravelers<
  T extends { isPrimary: boolean; lastName: string; firstName: string },
>(travelers: T[]) {
  return [...travelers].sort((left, right) => {
    if (left.isPrimary !== right.isPrimary) {
      return left.isPrimary ? -1 : 1;
    }

    const last = left.lastName.localeCompare(right.lastName);
    return last !== 0 ? last : left.firstName.localeCompare(right.firstName);
  });
}

function parseRequiredField(
  payload: Record<string, unknown>,
  field: string,
  label: string,
  maxLength: number
) {
  const value = asTrimmedString(payload[field]);

  if (!value) {
    throw new TravelerError(`${label} is required.`, 400);
  }

  if (value.length > maxLength) {
    throw new TravelerError(`${label} is too long.`, 400);
  }

  return value;
}

function parseDateField(
  payload: Record<string, unknown>,
  field: string,
  label: string
) {
  const value = parseRequiredField(payload, field, label, 10);

  if (!DATE_ONLY_PATTERN.test(value)) {
    throw new TravelerError(`${label} is invalid.`, 400);
  }

  return value;
}

export function parseTravelerInput(body: unknown): TravelerInput {
  if (!body || typeof body !== "object") {
    throw new TravelerError("Invalid traveler payload.", 400);
  }

  const payload = body as Record<string, unknown>;
  const label = asOptionalLabel(payload.label);

  if (label && label.length > MAX_LABEL_LENGTH) {
    throw new TravelerError("Label is too long.", 400);
  }

  const firstName = parseRequiredField(
    payload,
    "firstName",
    "First name",
    MAX_NAME_LENGTH
  );
  const lastName = parseRequiredField(
    payload,
    "lastName",
    "Last name",
    MAX_NAME_LENGTH
  );
  const dateOfBirth = parseDateField(payload, "dateOfBirth", "Date of birth");
  const gender = parseRequiredField(payload, "gender", "Gender", 20).toUpperCase();
  const nationality = parseRequiredField(
    payload,
    "nationality",
    "Nationality",
    MAX_NATIONALITY_LENGTH
  );
  const passportNumber = parseRequiredField(
    payload,
    "passportNumber",
    "Passport number",
    MAX_PASSPORT_LENGTH
  ).toUpperCase();
  const passportCountry = parseRequiredField(
    payload,
    "passportCountry",
    "Passport issuing country",
    MAX_COUNTRY_LENGTH
  );
  const passportExpiry = parseDateField(
    payload,
    "passportExpiry",
    "Passport expiration"
  );

  if (!isTravelerGender(gender)) {
    throw new TravelerError("Gender is invalid.", 400);
  }

  return {
    label,
    firstName,
    lastName,
    dateOfBirth,
    gender,
    nationality,
    passportNumber,
    passportCountry,
    passportExpiry,
    isPrimary: payload.isPrimary === true,
  };
}
