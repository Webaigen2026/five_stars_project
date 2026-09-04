/**
 * Admin Date + Time picker value helpers (D12.3.1.2).
 * Pure wall-clock splitting/composition for datetime-local strings.
 * Does NOT interpret airport timezones — that remains in airport-timezones.ts.
 */

export type AdminTimePeriod = "AM" | "PM";

export type AdminWallClockParts = {
  date: string; // YYYY-MM-DD
  hour12: number; // 1–12
  minute: number; // 0–59
  period: AdminTimePeriod;
  hour24: number; // 0–23
};

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

export function hour24To12(hour24: number): {
  hour12: number;
  period: AdminTimePeriod;
} {
  const normalized = ((hour24 % 24) + 24) % 24;
  const period: AdminTimePeriod = normalized >= 12 ? "PM" : "AM";
  const hour12 = normalized % 12 === 0 ? 12 : normalized % 12;
  return { hour12, period };
}

export function hour12To24(hour12: number, period: AdminTimePeriod): number {
  const clamped = Math.min(12, Math.max(1, Math.trunc(hour12)));
  if (period === "AM") {
    return clamped === 12 ? 0 : clamped;
  }
  return clamped === 12 ? 12 : clamped + 12;
}

/**
 * Parse `YYYY-MM-DDTHH:mm` (or with seconds) into date + 24h time parts.
 */
export function parseDatetimeLocalValue(value: string): {
  date: string;
  hour24: number;
  minute: number;
} | null {
  const match = value
    .trim()
    .match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}):(\d{2})(?::\d{2})?$/);

  if (!match) {
    return null;
  }

  const date = match[1]!;
  const hour24 = Number(match[2]);
  const minute = Number(match[3]);

  if (
    !Number.isInteger(hour24) ||
    !Number.isInteger(minute) ||
    hour24 < 0 ||
    hour24 > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return null;
  }

  return { date, hour24, minute };
}

export function splitDatetimeLocalForAdmin(
  value: string
): AdminWallClockParts | null {
  const parsed = parseDatetimeLocalValue(value);
  if (!parsed) {
    return null;
  }

  const { hour12, period } = hour24To12(parsed.hour24);
  return {
    date: parsed.date,
    hour12,
    minute: parsed.minute,
    period,
    hour24: parsed.hour24,
  };
}

/**
 * Compose the datetime-local wall-clock string expected by D11.4 conversion.
 */
export function composeDatetimeLocalValue(
  date: string,
  hour24: number,
  minute: number
): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return null;
  }

  if (
    !Number.isInteger(hour24) ||
    !Number.isInteger(minute) ||
    hour24 < 0 ||
    hour24 > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return null;
  }

  return `${date}T${pad2(hour24)}:${pad2(minute)}`;
}

export function combineAdminDateAndTime(input: {
  date: string | null | undefined;
  hour12: number | null | undefined;
  minute: number | null | undefined;
  period: AdminTimePeriod | null | undefined;
}): string | null {
  if (
    !input.date ||
    input.hour12 == null ||
    input.minute == null ||
    input.period == null
  ) {
    return null;
  }

  const hour24 = hour12To24(input.hour12, input.period);
  return composeDatetimeLocalValue(input.date, hour24, input.minute);
}

/** Admin-facing date label: Sep 6, 2026 (calendar parts only; not browser TZ). */
export function formatAdminDateLabel(date: string): string {
  const match = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return date;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  // Noon UTC avoids DST edge quirks when formatting a pure calendar date.
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day, 12, 0, 0)));
}

export function formatAdminTimeLabel(hour24: number, minute: number): string {
  const { hour12, period } = hour24To12(hour24);
  return `${hour12}:${pad2(minute)} ${period}`;
}

export function isValidAdminCalendarDate(date: string) {
  const match = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const probe = new Date(Date.UTC(year, month - 1, day));
  return (
    probe.getUTCFullYear() === year &&
    probe.getUTCMonth() === month - 1 &&
    probe.getUTCDate() === day
  );
}
