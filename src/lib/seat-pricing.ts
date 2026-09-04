/**
 * Five Stars seat-fee configuration (D12.5).
 * Centralized — change fees here, not in SeatMap UI.
 */

import type { FareFamily } from "./fare-families";
import type { SeatZone } from "./seat-layouts";

/** Initial Five Stars seat-fee schedule (cents). */
export const FIVE_STARS_SEAT_FEES = {
  /** BASIC fare — standard cabin seat selection fee. */
  BASIC_STANDARD_CENTS: 1500,
  /** STANDARD / FLEX — standard seats included. */
  INCLUDED_STANDARD_CENTS: 0,
  /** Preferred rows upgrade (all fare families). */
  PREFERRED_UPGRADE_CENTS: 2400,
  /** Extra-legroom / exit-row upgrade (all fare families). */
  EXTRA_LEGROOM_UPGRADE_CENTS: 2900,
} as const;

export function getBaseStandardSeatFeeCents(fareFamily: FareFamily) {
  if (fareFamily === "BASIC") {
    return FIVE_STARS_SEAT_FEES.BASIC_STANDARD_CENTS;
  }
  return FIVE_STARS_SEAT_FEES.INCLUDED_STANDARD_CENTS;
}

/**
 * Server-authoritative seat fee for a zone + fare family.
 * Client-supplied fees are ignored.
 */
export function getSeatFeeCents(input: {
  fareFamily: FareFamily;
  zone: SeatZone;
}) {
  const { fareFamily, zone } = input;

  if (zone === "STANDARD") {
    return getBaseStandardSeatFeeCents(fareFamily);
  }

  if (zone === "PREFERRED") {
    // Preferred always carries the upgrade fee; BASIC also pays base selection.
    if (fareFamily === "BASIC") {
      return (
        FIVE_STARS_SEAT_FEES.BASIC_STANDARD_CENTS +
        FIVE_STARS_SEAT_FEES.PREFERRED_UPGRADE_CENTS
      );
    }
    return FIVE_STARS_SEAT_FEES.PREFERRED_UPGRADE_CENTS;
  }

  // EXTRA_LEGROOM
  if (fareFamily === "BASIC") {
    return (
      FIVE_STARS_SEAT_FEES.BASIC_STANDARD_CENTS +
      FIVE_STARS_SEAT_FEES.EXTRA_LEGROOM_UPGRADE_CENTS
    );
  }
  return FIVE_STARS_SEAT_FEES.EXTRA_LEGROOM_UPGRADE_CENTS;
}

export function isStandardSeatIncluded(fareFamily: FareFamily) {
  return fareFamily === "STANDARD" || fareFamily === "FLEX";
}
