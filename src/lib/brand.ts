/**
 * Customer-facing brand presentation (D12.4).
 *
 * Does not mutate stored Flight.airline, fareFamily enums, booking references,
 * or flight codes. Legacy "StarJet" airline values map to "Five Stars" for UI.
 */

export const CUSTOMER_BRAND = "Five Stars";
export const CUSTOMER_BRAND_MARK = "FIVE STARS";

/** Normalized legacy product airline names that should display as Five Stars. */
const LEGACY_CUSTOMER_AIRLINE_ALIASES = new Set([
  "starjet",
  "star jet",
  "five stars",
  "fivestars",
]);

/**
 * Normalize a stored airline string for customer-facing display.
 *
 * - "StarJet" / case variants → "Five Stars"
 * - "Five Stars" → "Five Stars"
 * - Unknown carriers (e.g. "American Airlines") are returned unchanged
 * - Empty / null / undefined → "Five Stars" as the house carrier fallback
 */
export function getCustomerAirlineName(
  airline: string | null | undefined
): string {
  if (airline == null) {
    return CUSTOMER_BRAND;
  }

  const trimmed = airline.trim();
  if (!trimmed) {
    return CUSTOMER_BRAND;
  }

  const key = trimmed.toLowerCase().replace(/\s+/g, " ");
  if (LEGACY_CUSTOMER_AIRLINE_ALIASES.has(key)) {
    return CUSTOMER_BRAND;
  }

  return trimmed;
}

/** Alias for getCustomerAirlineName. */
export function formatAirlineBrand(airline: string | null | undefined) {
  return getCustomerAirlineName(airline);
}

export function normalizeCustomerBrand(airline: string | null | undefined) {
  return getCustomerAirlineName(airline);
}
