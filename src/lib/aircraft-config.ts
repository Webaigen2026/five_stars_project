/**
 * Admin-selectable aircraft options (D12.5.1).
 * Seat-layout resolution remains authoritative in seat-layouts.ts.
 */

import { isSeatSelectionAvailable } from "./seat-layouts";

export const CANONICAL_AIRBUS_A320 = "Airbus A320";

export type AdminAircraftOption = {
  value: string;
  label: string;
  seatMapSupported: boolean;
};

/**
 * Controlled Admin options only. Do not expose resolver aliases here.
 * New Admin writes must store these canonical values.
 */
export const ADMIN_AIRCRAFT_OPTIONS: readonly AdminAircraftOption[] = [
  {
    value: CANONICAL_AIRBUS_A320,
    label: "Airbus A320",
    seatMapSupported: true,
  },
] as const;

const CANONICAL_VALUES = new Set(
  ADMIN_AIRCRAFT_OPTIONS.map((option) => option.value)
);

export function isCanonicalAdminAircraft(value: string): boolean {
  return CANONICAL_VALUES.has(value.trim());
}

export function getAdminAircraftOption(
  value: string
): AdminAircraftOption | null {
  const trimmed = value.trim();
  return ADMIN_AIRCRAFT_OPTIONS.find((option) => option.value === trimmed) ?? null;
}

/** Uses the existing seat-layout resolver — do not reimplement support rules. */
export function getSeatMapSupportLabel(aircraft: string | null | undefined): {
  supported: boolean;
  label: string;
} {
  const supported = isSeatSelectionAvailable(aircraft);
  return {
    supported,
    label: supported ? "Seat map supported" : "Seat map unavailable",
  };
}

/**
 * Display helper for Admin lists/forms.
 * Shows the stored value as-is; support comes from the seat-layout resolver.
 */
export function describeFlightAircraft(aircraft: string | null | undefined): {
  displayValue: string;
  supported: boolean;
  supportLabel: string;
  isCanonical: boolean;
  isLegacyUnsupported: boolean;
} {
  const raw = typeof aircraft === "string" ? aircraft.trim() : "";
  const displayValue = raw || "—";
  const { supported, label: supportLabel } = getSeatMapSupportLabel(
    raw || null
  );
  const isCanonical = raw !== "" && isCanonicalAdminAircraft(raw);

  return {
    displayValue,
    supported,
    supportLabel,
    isCanonical,
    isLegacyUnsupported: raw !== "" && !supported,
  };
}
