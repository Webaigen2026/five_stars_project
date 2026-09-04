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
