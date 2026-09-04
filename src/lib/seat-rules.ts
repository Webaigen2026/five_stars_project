/**
 * Pure seat-selection rules (D12.5).
 * No server/DB dependency — safe for unit tests.
 */

export function isExitRowRestrictedForPassenger(passengerType: string) {
  return passengerType === "CHILD" || passengerType === "INFANT_IN_SEAT";
}

/**
 * MVP only: CHILD and INFANT_IN_SEAT cannot select exit-row seats.
 * Full regulatory exit-row eligibility is a future enhancement.
 */
export function isPassengerEligibleForSeat(input: {
  isExitRow: boolean;
  passengerType: string;
}) {
  if (input.isExitRow && isExitRowRestrictedForPassenger(input.passengerType)) {
    return false;
  }
  return true;
}

export function sumSeatFeeCents(rows: Array<{ seatFeeCents: number }>) {
  return rows.reduce((sum, row) => sum + row.seatFeeCents, 0);
}

/**
 * Models an atomic seat change under UNIQUE(flightId, seatNumber).
 * If the target seat is already taken by another assignment, keep the
 * current seat (rollback semantics without deleting first).
 */
export function planSeatChange(input: {
  currentSeatNumber: string;
  targetSeatNumber: string;
  occupiedByOther: boolean;
}) {
  if (input.currentSeatNumber === input.targetSeatNumber) {
    return {
      outcome: "noop" as const,
      seatNumber: input.currentSeatNumber,
    };
  }

  if (input.occupiedByOther) {
    return {
      outcome: "conflict" as const,
      seatNumber: input.currentSeatNumber,
    };
  }

  return {
    outcome: "changed" as const,
    seatNumber: input.targetSeatNumber,
  };
}
