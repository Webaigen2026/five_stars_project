/**
 * Airport IANA timezones for airline-local flight display and admin entry.
 * Display and wall-clock interpretation must never use browser/server default TZ.
 */

export const FALLBACK_AIRPORT_TIME_ZONE = "UTC";

const AIRPORT_TIME_ZONES: Record<string, string> = {
  BOS: "America/New_York",
  JFK: "America/New_York",
  MIA: "America/New_York",
  FLL: "America/New_York",
  PAP: "America/Port-au-Prince",
  CAP: "America/Port-au-Prince",
};

export function getAirportTimeZone(code: string | null | undefined): string {
  if (!code) {
    return FALLBACK_AIRPORT_TIME_ZONE;
  }

  const normalized = code.trim().toUpperCase();
  return AIRPORT_TIME_ZONES[normalized] ?? FALLBACK_AIRPORT_TIME_ZONE;
}

type ZonedParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function getZonedParts(date: Date, timeZone: string): ZonedParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    // hourCycle h23 avoids engine-specific hour12:false quirks (0–23 vs 1–24).
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);

  const read = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "0";

  let hour = Number(read("hour"));
  // Some engines still report midnight as 24.
  if (hour === 24) {
    hour = 0;
  }

  return {
    year: Number(read("year")),
    month: Number(read("month")),
    day: Number(read("day")),
    hour,
    minute: Number(read("minute")),
    second: Number(read("second")),
  };
}

function zonedPartsAsUtcMs(parts: ZonedParts) {
  return Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second
  );
}

/**
 * Offset of `timeZone` at `utcMs`: zoned wall-clock as if UTC minus the UTC instant.
 */
function getTimeZoneOffsetMs(utcMs: number, timeZone: string) {
  const localAsUtc = zonedPartsAsUtcMs(getZonedParts(new Date(utcMs), timeZone));
  return localAsUtc - utcMs;
}

/**
 * Interpret a datetime-local wall clock (`YYYY-MM-DDTHH:mm[:ss]`) as local time
 * in `timeZone` and return a UTC ISO string for TimestamptzString storage.
 */
export function wallClockInTimeZoneToUtcIso(
  wallClock: string,
  timeZone: string
): string {
  const match = wallClock
    .trim()
    .match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/);

  if (!match) {
    return wallClock;
  }

  const intended: ZonedParts = {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: Number(match[4]),
    minute: Number(match[5]),
    second: Number(match[6] ?? "0"),
  };

  const asIfUtc = zonedPartsAsUtcMs(intended);
  const offset = getTimeZoneOffsetMs(asIfUtc, timeZone);
  let corrected = asIfUtc - offset;

  // DST boundary: recompute offset at the corrected instant.
  const offset2 = getTimeZoneOffsetMs(corrected, timeZone);
  if (offset2 !== offset) {
    corrected = asIfUtc - offset2;
  }

  return new Date(corrected).toISOString();
}

/**
 * Format a stored UTC instant as an HTML datetime-local value in `timeZone`.
 */
export function formatInstantAsDatetimeLocal(
  value: string,
  timeZone: string
): string {
  const parts = getZonedParts(new Date(value), timeZone);
  return `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}T${pad2(parts.hour)}:${pad2(parts.minute)}`;
}

/**
 * Calendar date `YYYY-MM-DD` for an instant in an explicit IANA timezone.
 */
export function calendarDateInTimeZone(value: string, timeZone: string): string {
  const parts = getZonedParts(new Date(value), timeZone);
  return `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}`;
}

/**
 * Elapsed block time in whole minutes from two stored UTC instants.
 * Returns null when chronology is invalid (arrival <= departure).
 */
export function elapsedDurationMinutes(
  departureTime: string,
  arrivalTime: string
): number | null {
  const departureMs = new Date(departureTime).getTime();
  const arrivalMs = new Date(arrivalTime).getTime();

  if (!Number.isFinite(departureMs) || !Number.isFinite(arrivalMs)) {
    return null;
  }

  if (arrivalMs <= departureMs) {
    return null;
  }

  return Math.round((arrivalMs - departureMs) / 60000);
}
