export const FARE_FAMILIES = ["BASIC", "STANDARD", "FLEX"] as const;

export type FareFamily = (typeof FARE_FAMILIES)[number];

/** Fixed per-passenger add-ons on top of Flight.price (cents). */
const FARE_FAMILY_ADD_ON_CENTS: Record<FareFamily, number> = {
  BASIC: 0,
  STANDARD: 3500,
  FLEX: 8500,
};

const FARE_FAMILY_LABELS: Record<FareFamily, string> = {
  BASIC: "StarJet Basic",
  STANDARD: "StarJet Standard",
  FLEX: "StarJet Flex",
};

/** Print/PDF-only brand labels — does not change stored fareFamily values. */
const PRINT_FARE_FAMILY_LABELS: Record<FareFamily, string> = {
  BASIC: "Five Stars Basic",
  STANDARD: "Five Stars Standard",
  FLEX: "Five Stars Flex",
};

const FARE_FAMILY_DESCRIPTIONS: Record<FareFamily, string> = {
  BASIC: "Lowest fare",
  STANDARD: "Most popular",
  FLEX: "Most flexible",
};

const FARE_FAMILY_BENEFITS: Record<FareFamily, string[]> = {
  BASIC: [
    "Carry-on included",
    "Standard boarding",
    "Seat selection available for a fee",
    "Changes/cancellations may have a fee",
  ],
  STANDARD: [
    "Carry-on included",
    "Standard seat selection included",
    "Preferred boarding",
    "Reduced change/cancellation restrictions",
  ],
  FLEX: [
    "Carry-on included",
    "Standard seat selection included",
    "Priority boarding",
    "No change fee",
    "More flexible cancellation/refund conditions",
  ],
};

export function isFareFamily(value: string): value is FareFamily {
  return (FARE_FAMILIES as readonly string[]).includes(value);
}

/**
 * Parse a fare family from URL/client input.
 * Invalid values return null (caller decides reject vs fallback).
 */
export function parseFareFamily(
  value: string | null | undefined
): FareFamily | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toUpperCase();
  return isFareFamily(normalized) ? normalized : null;
}

/** Booking create: reject invalid; missing defaults to BASIC for legacy URLs. */
export function resolveFareFamilyForBooking(
  value: string | null | undefined
): FareFamily {
  const parsed = parseFareFamily(value);
  if (parsed) {
    return parsed;
  }

  if (value == null || String(value).trim() === "") {
    return "BASIC";
  }

  throw new Error(`Invalid fare family: ${value}`);
}

export function getFareFamilyLabel(family: FareFamily) {
  return FARE_FAMILY_LABELS[family];
}

/** Printable itinerary / PDF label (Five Stars). Screen booking UI still uses StarJet. */
export function getPrintFareFamilyLabel(family: FareFamily) {
  return PRINT_FARE_FAMILY_LABELS[family];
}

export function getFareFamilyDescription(family: FareFamily) {
  return FARE_FAMILY_DESCRIPTIONS[family];
}

export function getFareFamilyAddOnCents(family: FareFamily) {
  return FARE_FAMILY_ADD_ON_CENTS[family];
}

export function getFareFamilyBenefits(family: FareFamily) {
  return FARE_FAMILY_BENEFITS[family];
}

/**
 * Server-authoritative per-passenger fare for a family given Flight.price base.
 */
export function getFareFamilyPriceCents(
  basePriceCents: number,
  family: FareFamily
) {
  return basePriceCents + getFareFamilyAddOnCents(family);
}

/**
 * Display price for a persisted segment: prefer snapshot, else flight base.
 */
export function resolveSegmentFarePriceCents(input: {
  farePriceCents: number | null | undefined;
  flightPriceCents: number;
}) {
  if (
    typeof input.farePriceCents === "number" &&
    Number.isFinite(input.farePriceCents) &&
    input.farePriceCents >= 0
  ) {
    return input.farePriceCents;
  }

  return input.flightPriceCents;
}

export function resolveSegmentFareFamilyLabel(input: {
  fareFamily: string | null | undefined;
}) {
  const family = parseFareFamily(input.fareFamily) ?? "BASIC";
  return getFareFamilyLabel(family);
}

export function listFareFamilyOptions(basePriceCents: number) {
  return FARE_FAMILIES.map((family) => ({
    family,
    label: getFareFamilyLabel(family),
    description: getFareFamilyDescription(family),
    benefits: getFareFamilyBenefits(family),
    priceCents: getFareFamilyPriceCents(basePriceCents, family),
    highlighted: family === "STANDARD",
  }));
}

/**
 * Parse an admin-entered dollar string into base fare cents for preview.
 * Empty, non-finite, or non-positive values return null (no derived preview).
 */
export function parseBaseFareDollarsToCents(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return Math.round(parsed * 100);
}

/**
 * Compact admin fare-family preview rows from Flight.price base cents.
 * Reuses listFareFamilyOptions / getFareFamilyPriceCents — no duplicate add-ons.
 */
export function buildAdminFareFamilyPreview(basePriceCents: number) {
  if (!Number.isFinite(basePriceCents) || basePriceCents <= 0) {
    return null;
  }

  return listFareFamilyOptions(basePriceCents).map((option) => ({
    family: option.family,
    label: option.label,
    priceCents: option.priceCents,
  }));
}
