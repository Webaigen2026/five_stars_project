import {
  formatPassengerTypeLabel,
  parsePassengerType,
  type PassengerType,
} from "./passenger-composition";

const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export type CalendarYmd = {
  year: number;
  month: number;
  day: number;
};

export type PassengerAgeValidationResult = {
  valid: boolean;
  age: number | null;
  message?: string;
  expectedType?: PassengerType;
};

/**
 * Parse a calendar YYYY-MM-DD without timezone shifting.
 * Rejects impossible dates (e.g. 2026-02-30).
 */
export function parseCalendarDateOnly(
  value: string | null | undefined
): CalendarYmd | null {
  if (!value) {
    return null;
  }

  const match = DATE_ONLY_PATTERN.exec(value.trim());
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day)
  ) {
    return null;
  }

  // UTC probe validates day-of-month without local TZ drift.
  const probe = new Date(Date.UTC(year, month - 1, day));
  if (
    probe.getUTCFullYear() !== year ||
    probe.getUTCMonth() !== month - 1 ||
    probe.getUTCDate() !== day
  ) {
    return null;
  }

  return { year, month, day };
}

export function formatCalendarDateOnly(parts: CalendarYmd) {
  return `${String(parts.year).padStart(4, "0")}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

/**
 * Whole years completed on `referenceDate` (YYYY-MM-DD), calendar arithmetic only.
 * Birthday on the reference date counts as already attained.
 */
export function calculateAgeOnDate(
  dateOfBirth: string | Date,
  referenceDate: string | Date
): number {
  const birth =
    dateOfBirth instanceof Date
      ? {
          year: dateOfBirth.getUTCFullYear(),
          month: dateOfBirth.getUTCMonth() + 1,
          day: dateOfBirth.getUTCDate(),
        }
      : parseCalendarDateOnly(dateOfBirth);
  const reference =
    referenceDate instanceof Date
      ? {
          year: referenceDate.getUTCFullYear(),
          month: referenceDate.getUTCMonth() + 1,
          day: referenceDate.getUTCDate(),
        }
      : parseCalendarDateOnly(referenceDate);

  if (!birth || !reference) {
    throw new Error("Invalid calendar date for age calculation.");
  }

  let age = reference.year - birth.year;
  const birthdayReached =
    reference.month > birth.month ||
    (reference.month === birth.month && reference.day >= birth.day);

  if (!birthdayReached) {
    age -= 1;
  }

  return age;
}

export function expectedPassengerTypeForAge(age: number): PassengerType {
  if (age < 0) {
    return "INFANT_IN_SEAT";
  }

  if (age < 2) {
    return "INFANT_IN_SEAT";
  }

  if (age <= 15) {
    return "CHILD";
  }

  if (age <= 64) {
    return "ADULT";
  }

  return "SENIOR";
}

export function isAgeValidForPassengerType(
  age: number,
  passengerType: PassengerType
) {
  switch (passengerType) {
    case "INFANT_IN_SEAT":
      return age >= 0 && age < 2;
    case "CHILD":
      return age >= 2 && age <= 15;
    case "ADULT":
      return age >= 16 && age <= 64;
    case "SENIOR":
      return age >= 65;
    default:
      return false;
  }
}

function categoryRuleMessage(passengerType: PassengerType) {
  switch (passengerType) {
    case "INFANT_IN_SEAT":
      return "Infants in seat must be under age 2 on the departure date.";
    case "CHILD":
      return "Children must be age 2–15 on the departure date.";
    case "ADULT":
      return "Adults must be age 16–64 on the departure date.";
    case "SENIOR":
      return "Seniors must be age 65 or older on the departure date.";
    default:
      return "Passenger age does not match the selected traveler category.";
  }
}

function suggestedCategoryHint(expectedType: PassengerType) {
  switch (expectedType) {
    case "INFANT_IN_SEAT":
      return "Select Infant in seat for travelers under age 2.";
    case "CHILD":
      return "Select Child for travelers age 2–15.";
    case "ADULT":
      return "Select Adult for travelers age 16–64.";
    case "SENIOR":
      return "Select Senior for travelers age 65 or older.";
    default:
      return "Update passenger composition to match this traveler's age.";
  }
}

export function validatePassengerAgeForType(input: {
  dateOfBirth: string | Date;
  departureDate: string | Date;
  passengerType: string | PassengerType;
}): PassengerAgeValidationResult {
  const passengerType = parsePassengerType(input.passengerType);

  const birth =
    input.dateOfBirth instanceof Date
      ? formatCalendarDateOnly({
          year: input.dateOfBirth.getUTCFullYear(),
          month: input.dateOfBirth.getUTCMonth() + 1,
          day: input.dateOfBirth.getUTCDate(),
        })
      : String(input.dateOfBirth ?? "").trim();
  const departure =
    input.departureDate instanceof Date
      ? formatCalendarDateOnly({
          year: input.departureDate.getUTCFullYear(),
          month: input.departureDate.getUTCMonth() + 1,
          day: input.departureDate.getUTCDate(),
        })
      : String(input.departureDate ?? "").trim();

  if (!parseCalendarDateOnly(birth)) {
    return {
      valid: false,
      age: null,
      message: "Enter a valid date of birth.",
    };
  }

  if (!parseCalendarDateOnly(departure)) {
    return {
      valid: false,
      age: null,
      message: "Departure date is required to validate traveler age.",
    };
  }

  const age = calculateAgeOnDate(birth, departure);

  if (age < 0) {
    return {
      valid: false,
      age,
      message:
        "Date of birth cannot be after the outbound departure date.",
    };
  }

  if (isAgeValidForPassengerType(age, passengerType)) {
    return { valid: true, age };
  }

  const expectedType = expectedPassengerTypeForAge(age);

  return {
    valid: false,
    age,
    expectedType,
    message: `This traveler's age is ${age} on the departure date. ${categoryRuleMessage(passengerType)} ${suggestedCategoryHint(expectedType)}`,
  };
}

export function passengerTypeCategoryDescription(passengerType: PassengerType) {
  return categoryRuleMessage(passengerType);
}

export function formatPassengerTypeWithAgeHint(passengerType: PassengerType) {
  return `${formatPassengerTypeLabel(passengerType)} — ${categoryRuleMessage(passengerType).replace(/\.$/, "")}`;
}
