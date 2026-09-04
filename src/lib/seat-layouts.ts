/**
 * Aircraft seat layout templates (D12.5).
 * Layouts live in code — not one DB row per physical seat.
 */

export type SeatZone = "STANDARD" | "PREFERRED" | "EXTRA_LEGROOM";

export type SeatLayoutSeat = {
  seatNumber: string;
  row: number;
  column: string;
  zone: SeatZone;
  isWindow: boolean;
  isAisle: boolean;
  isExitRow: boolean;
  /** Non-selectable structural positions are omitted from seats[]. */
};

export type SeatLayout = {
  layoutKey: string;
  label: string;
  columns: string[];
  aisleAfterColumn: string;
  rows: number[];
  exitRows: number[];
  seats: SeatLayoutSeat[];
};

const A320_COLUMNS = ["A", "B", "C", "D", "E", "F"] as const;
const A320_ROWS = Array.from({ length: 28 }, (_, index) => index + 1);
const A320_EXIT_ROWS = [12, 13];
const A320_PREFERRED_ROWS = [2, 3, 4, 5];
const A320_EXTRA_LEGROOM_ROWS = [12, 13];

function zoneForRow(row: number): SeatZone {
  if (A320_EXTRA_LEGROOM_ROWS.includes(row)) {
    return "EXTRA_LEGROOM";
  }
  if (A320_PREFERRED_ROWS.includes(row)) {
    return "PREFERRED";
  }
  return "STANDARD";
}

function buildA320Layout(): SeatLayout {
  const seats: SeatLayoutSeat[] = [];

  for (const row of A320_ROWS) {
    for (const column of A320_COLUMNS) {
      seats.push({
        seatNumber: `${row}${column}`,
        row,
        column,
        zone: zoneForRow(row),
        isWindow: column === "A" || column === "F",
        isAisle: column === "C" || column === "D",
        isExitRow: A320_EXIT_ROWS.includes(row),
      });
    }
  }

  return {
    layoutKey: "A320",
    label: "Airbus A320",
    columns: [...A320_COLUMNS],
    aisleAfterColumn: "C",
    rows: [...A320_ROWS],
    exitRows: [...A320_EXIT_ROWS],
    seats,
  };
}

const A320_LAYOUT = buildA320Layout();

const KNOWN_AIRCRAFT_ALIASES: Record<string, string> = {
  "airbus a320": "A320",
  "a320": "A320",
  "airbus-a320": "A320",
  "a-320": "A320",
};

/**
 * Normalize only clean known aliases. Malformed values like "Airbu23"
 * deliberately do NOT map to A320.
 */
export function resolveSeatLayoutKey(
  aircraft: string | null | undefined
): string | null {
  if (aircraft == null) {
    return null;
  }

  const trimmed = aircraft.trim();
  if (!trimmed) {
    return null;
  }

  const key = trimmed.toLowerCase().replace(/\s+/g, " ");
  return KNOWN_AIRCRAFT_ALIASES[key] ?? null;
}

export function getSeatLayout(
  aircraft: string | null | undefined
): SeatLayout | null {
  const layoutKey = resolveSeatLayoutKey(aircraft);
  if (layoutKey === "A320") {
    return A320_LAYOUT;
  }
  return null;
}

export function findSeatInLayout(
  layout: SeatLayout,
  seatNumber: string
): SeatLayoutSeat | null {
  const normalized = seatNumber.trim().toUpperCase();
  return layout.seats.find((seat) => seat.seatNumber === normalized) ?? null;
}

export function isSeatSelectionAvailable(
  aircraft: string | null | undefined
): boolean {
  return getSeatLayout(aircraft) != null;
}
