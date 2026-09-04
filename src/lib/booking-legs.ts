import { flightReversesRoute } from "../data/airports";

export const BOOKING_SEGMENT_TYPES = ["OUTBOUND", "RETURN"] as const;

export type BookingSegmentType = (typeof BOOKING_SEGMENT_TYPES)[number];

export type BookingLeg = {
  sequence: number;
  segmentType: BookingSegmentType;
  flightId: number;
  fareFamily?: string;
  farePriceCents?: number | null;
};

function asSegmentType(value: string): BookingSegmentType | null {
  return BOOKING_SEGMENT_TYPES.includes(value as BookingSegmentType)
    ? (value as BookingSegmentType)
    : null;
}

/**
 * Normalize stored segments or legacy Booking.flightId into ordered legs.
 */
export function normalizeBookingLegs(input: {
  flightId: number;
  segments: Array<{
    flightId: number;
    segmentType: string;
    sequence: number;
    fareFamily?: string | null;
    farePriceCents?: number | null;
  }>;
}): BookingLeg[] {
  if (input.segments.length === 0) {
    return [
      {
        sequence: 1,
        segmentType: "OUTBOUND",
        flightId: input.flightId,
        fareFamily: "BASIC",
        farePriceCents: null,
      },
    ];
  }

  return [...input.segments]
    .map((segment) => {
      const segmentType = asSegmentType(segment.segmentType);

      if (!segmentType) {
        return null;
      }

      const leg: BookingLeg = {
        sequence: segment.sequence,
        segmentType,
        flightId: segment.flightId,
        fareFamily: segment.fareFamily ?? "BASIC",
        farePriceCents:
          typeof segment.farePriceCents === "number"
            ? segment.farePriceCents
            : null,
      };

      return leg;
    })
    .filter((leg): leg is BookingLeg => leg != null)
    .sort((left, right) => left.sequence - right.sequence);
}

export function isRoundTripLegs(legs: BookingLeg[]) {
  return (
    legs.length >= 2 &&
    legs.some((leg) => leg.segmentType === "OUTBOUND") &&
    legs.some((leg) => leg.segmentType === "RETURN")
  );
}

export function validateRoundTripFlights(input: {
  outbound: {
    id: number;
    origin?: string | null;
    originCode: string;
    destination?: string | null;
    destinationCode: string;
    departureTime: string;
    arrivalTime: string;
    status: string;
    availableSeats: number;
  };
  returnFlight: {
    id: number;
    origin?: string | null;
    originCode: string;
    destination?: string | null;
    destinationCode: string;
    departureTime: string;
    arrivalTime: string;
    status: string;
    availableSeats: number;
  };
  passengerCount: number;
}): string | null {
  const { outbound, returnFlight, passengerCount } = input;

  if (outbound.id === returnFlight.id) {
    return "Outbound and return flights must be different.";
  }

  if (outbound.status !== "SCHEDULED") {
    return "The outbound flight is not available for booking.";
  }

  if (returnFlight.status !== "SCHEDULED") {
    return "The return flight is not available for booking.";
  }

  if (outbound.availableSeats < passengerCount) {
    return "Not enough seats are available on the outbound flight.";
  }

  if (returnFlight.availableSeats < passengerCount) {
    return "Not enough seats are available on the return flight.";
  }

  if (!flightReversesRoute(outbound, returnFlight)) {
    return "Return flight must reverse the outbound route.";
  }

  const outboundArrival = new Date(outbound.arrivalTime).getTime();
  const returnDeparture = new Date(returnFlight.departureTime).getTime();

  if (
    !Number.isFinite(outboundArrival) ||
    !Number.isFinite(returnDeparture) ||
    returnDeparture <= outboundArrival
  ) {
    return "Return departure must be after outbound arrival.";
  }

  return null;
}

export const TAXES_AND_FEES_PER_PASSENGER = 6800;

export function calculateBookingTotals(input: {
  unitPricesCents: number[];
  passengerCount: number;
}) {
  const subtotal = input.unitPricesCents.reduce(
    (sum, price) => sum + price * input.passengerCount,
    0
  );
  const taxesAndFees = TAXES_AND_FEES_PER_PASSENGER * input.passengerCount;
  const total = subtotal + taxesAndFees;

  return { subtotal, taxesAndFees, total };
}
