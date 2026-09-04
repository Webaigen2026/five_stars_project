/**
 * Shared presentation helpers for booking / trip surfaces.
 * Display only — no business logic or status mutations.
 */

export function formatMoney(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export function formatTripDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function formatTripDateShort(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function formatTripTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(value));
}

export function formatTripDateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return `${hours}h ${remainingMinutes}m`;
}

export function formatRoute(originCode: string, destinationCode: string) {
  return `${originCode} → ${destinationCode}`;
}

export function isSameCalendarDay(left: string, right: string) {
  const leftDate = new Date(left);
  const rightDate = new Date(right);

  return (
    leftDate.getFullYear() === rightDate.getFullYear() &&
    leftDate.getMonth() === rightDate.getMonth() &&
    leftDate.getDate() === rightDate.getDate()
  );
}

const TERMINAL_PAST_STATUSES = new Set([
  "COMPLETED",
  "CANCELLED",
  "REFUNDED",
]);

/**
 * Presentation-only grouping. Does not mutate booking state.
 */
export function isUpcomingTrip({
  status,
  departureTime,
  now = new Date(),
}: {
  status: string;
  departureTime: string | null | undefined;
  now?: Date;
}) {
  if (TERMINAL_PAST_STATUSES.has(status)) {
    return false;
  }

  if (!departureTime) {
    return true;
  }

  return new Date(departureTime).getTime() >= now.getTime();
}
