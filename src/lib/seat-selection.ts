/**
 * Seat selection presentation helpers (D12.5).
 */

import { formatMoney } from "./trip-formatting";
import { getSeatFeeCents, isStandardSeatIncluded } from "./seat-pricing";
import {
  findSeatInLayout,
  getSeatLayout,
  type SeatLayout,
  type SeatLayoutSeat,
} from "./seat-layouts";
import { parseFareFamily, type FareFamily } from "./fare-families";
import { formatPassengerTypeLabel } from "./passenger-composition";

export type SeatMapCellState =
  | "available"
  | "selected"
  | "occupied"
  | "blocked"
  | "aisle";

export type SeatMapCellView = {
  kind: "seat" | "aisle";
  seatNumber?: string;
  state: SeatMapCellState;
  zone?: SeatLayoutSeat["zone"];
  feeCents?: number;
  feeLabel?: string;
  ariaLabel: string;
  disabled: boolean;
};

export type SeatSelectionPassengerView = {
  id: number;
  displayName: string;
  passengerType: string;
  passengerTypeLabel: string;
  seatNumber: string | null;
  seatFeeCents: number | null;
};

export type SeatSelectionSegmentView = {
  bookingSegmentId: number;
  segmentType: "OUTBOUND" | "RETURN";
  segmentLabel: string;
  flightId: number;
  flightCode: string;
  originCode: string;
  destinationCode: string;
  departureLabel: string;
  aircraft: string | null;
  fareFamily: FareFamily;
  layoutAvailable: boolean;
  layout: SeatLayout | null;
  passengers: SeatSelectionPassengerView[];
  occupiedSeatNumbers: string[];
};

export function buildSeatAriaLabel(input: {
  seat: SeatLayoutSeat;
  state: SeatMapCellState;
  feeCents: number;
}) {
  const traits: string[] = [];
  if (input.seat.isWindow) traits.push("window");
  if (input.seat.isAisle) traits.push("aisle");
  if (input.seat.isExitRow) traits.push("exit row");
  if (input.seat.zone === "PREFERRED") traits.push("preferred");
  if (input.seat.zone === "EXTRA_LEGROOM") traits.push("extra legroom");

  const traitText = traits.length > 0 ? `, ${traits.join(", ")}` : "";

  if (input.state === "occupied") {
    return `Seat ${input.seat.seatNumber}${traitText}, occupied`;
  }
  if (input.state === "selected") {
    return `Seat ${input.seat.seatNumber}${traitText}, selected`;
  }
  if (input.state === "blocked") {
    return `Seat ${input.seat.seatNumber}${traitText}, unavailable`;
  }

  const feeText =
    input.feeCents > 0 ? `, ${formatMoney(input.feeCents)}` : ", included";
  return `Seat ${input.seat.seatNumber}${traitText}, available${feeText}`;
}

export function buildSeatMapRows(input: {
  layout: SeatLayout;
  fareFamily: FareFamily;
  occupiedSeatNumbers: Set<string>;
  selectedSeatNumber: string | null;
  activePassengerType: string;
}) {
  const { layout, fareFamily, occupiedSeatNumbers, selectedSeatNumber } = input;
  const restrictExit =
    input.activePassengerType === "CHILD" ||
    input.activePassengerType === "INFANT_IN_SEAT";

  return layout.rows.map((row) => {
    const cells: SeatMapCellView[] = [];

    for (const column of layout.columns) {
      if (column === layout.columns[layout.columns.indexOf(layout.aisleAfterColumn) + 1]) {
        cells.push({
          kind: "aisle",
          state: "aisle",
          ariaLabel: "Aisle",
          disabled: true,
        });
      }

      const seatNumber = `${row}${column}`;
      const seat = findSeatInLayout(layout, seatNumber);
      if (!seat) {
        continue;
      }

      const feeCents = getSeatFeeCents({ fareFamily, zone: seat.zone });
      let state: SeatMapCellState = "available";
      let disabled = false;

      if (occupiedSeatNumbers.has(seatNumber) && selectedSeatNumber !== seatNumber) {
        state = "occupied";
        disabled = true;
      } else if (selectedSeatNumber === seatNumber) {
        state = "selected";
      } else if (seat.isExitRow && restrictExit) {
        state = "blocked";
        disabled = true;
      }

      cells.push({
        kind: "seat",
        seatNumber,
        state,
        zone: seat.zone,
        feeCents,
        feeLabel:
          feeCents === 0
            ? isStandardSeatIncluded(fareFamily) && seat.zone === "STANDARD"
              ? "Included"
              : formatMoney(0)
            : formatMoney(feeCents),
        ariaLabel: buildSeatAriaLabel({ seat, state, feeCents }),
        disabled,
      });
    }

    return { row, cells };
  });
}

export function toSeatPassengerViews(
  passengers: Array<{
    id: number;
    firstName: string;
    lastName: string;
    passengerType: string;
  }>,
  assignments: Array<{
    passengerId: number;
    seatNumber: string;
    seatFeeCents: number;
  }>
): SeatSelectionPassengerView[] {
  const byPassenger = new Map(
    assignments.map((row) => [row.passengerId, row] as const)
  );

  return [...passengers]
    .sort((left, right) => left.id - right.id)
    .map((passenger) => {
      const assignment = byPassenger.get(passenger.id);
      return {
        id: passenger.id,
        displayName: `${passenger.firstName} ${passenger.lastName}`.trim(),
        passengerType: passenger.passengerType,
        passengerTypeLabel: formatPassengerTypeLabel(passenger.passengerType),
        seatNumber: assignment?.seatNumber ?? null,
        seatFeeCents: assignment?.seatFeeCents ?? null,
      };
    });
}
