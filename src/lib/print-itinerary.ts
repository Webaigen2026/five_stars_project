/**
 * Printable itinerary presentation (D12.3.3).
 * Print/PDF brand: Five Stars. Does not mutate booking data.
 */

import {
  formatAirportLabelFromCode,
  getAirportByCode,
  resolveAirportEndpointCode,
} from "../data/airports";
import { FALLBACK_AIRPORT_TIME_ZONE } from "./airport-timezones";
import { getBookingAmountDueCents } from "./booking-amount";
import { isRoundTripLegs, type BookingLeg } from "./booking-legs";
import { getBookingStatusPresentation } from "./booking-status";
import {
  getPrintFareFamilyLabel,
  parseFareFamily,
  resolveSegmentFarePriceCents,
} from "./fare-families";
import {
  formatMyTripRouteCodes,
  formatMyTripRouteHeading,
  formatTravelerCountLabel,
} from "./my-trips";
import { formatPassengerTypeLabel } from "./passenger-composition";
import {
  formatArrivalDate,
  formatArrivalTime,
  formatDepartureDate,
  formatDepartureTime,
  formatDuration,
  formatMoney,
  formatTripDateTime,
} from "./trip-formatting";

export const PRINT_ITINERARY_BRAND = "Five Stars";
export const PRINT_ITINERARY_BRAND_MARK = "FIVE STARS";
export const PRINT_ITINERARY_DOCUMENT_TITLE = "FLIGHT ITINERARY";

export type PrintItineraryTravelerInput = {
  id: number;
  firstName: string;
  lastName: string;
  nationality: string | null;
  passengerType: string;
  passportNumber?: string | null;
  passportNumberEncrypted?: string | null;
  dateOfBirth?: string | null;
};

export type PrintItineraryLegInput = BookingLeg & {
  flight: {
    code: string;
    origin: string;
    originCode: string;
    destination: string;
    destinationCode: string;
    departureTime: string;
    arrivalTime: string;
    durationMinutes: number;
    price: number;
  };
};

export type PrintItinerarySegmentView = {
  segmentType: "OUTBOUND" | "RETURN";
  segmentLabel: string;
  flightCode: string;
  originCode: string;
  destinationCode: string;
  originLabel: string;
  destinationLabel: string;
  departureTimeLabel: string;
  departureDateLabel: string;
  arrivalTimeLabel: string;
  arrivalDateLabel: string;
  durationLabel: string;
  fareLabel: string;
  farePriceCents: number;
  farePriceLabel: string;
  usedFareSnapshot: boolean;
};

export type PrintItineraryTravelerView = {
  id: number;
  displayName: string;
  passengerTypeLabel: string;
  nationality: string | null;
};

export type PrintItineraryPriceLine = {
  key: string;
  label: string;
  amountCents: number;
};

export type PrintItinerarySeatAssignmentInput = {
  bookingSegmentId: number;
  passengerId: number;
  seatNumber: string;
};

export type PrintItinerarySeatLine = {
  segmentLabel: string;
  flightCode: string;
  passengerName: string;
  seatNumber: string;
};

export type PrintItineraryViewModel = {
  brand: string;
  brandMark: string;
  documentTitle: string;
  documentSubtitle: string;
  pageTitle: string;
  bookingReference: string;
  status: string;
  statusLabel: string;
  statusDescription: string;
  confirmationSummary: string;
  createdAtLabel: string;
  generatedAtLabel: string;
  isRoundTrip: boolean;
  routeHeading: string;
  routeDetail: string | null;
  travelerCount: number;
  travelerLabel: string;
  travelers: PrintItineraryTravelerView[];
  segments: PrintItinerarySegmentView[];
  seatLines: PrintItinerarySeatLine[];
  priceLines: PrintItineraryPriceLine[];
  subtotal: number;
  taxesAndFees: number;
  seatFeesTotal: number;
  /** Airfare total (Booking.total) — does not include seat fees. */
  total: number;
  /** Authoritative amount due including seat fees. */
  amountDueCents: number;
  paymentNotice: string | null;
  footerNote: string;
  importantNotes: string[];
};

function endpointLabel(code: string, label?: string | null) {
  const resolved = resolveAirportEndpointCode({ code, label });
  const airport = getAirportByCode(resolved);
  if (airport) {
    return airport.city;
  }
  return formatAirportLabelFromCode(resolved) || resolved;
}

export function buildPrintItinerarySegmentView(
  leg: PrintItineraryLegInput
): PrintItinerarySegmentView {
  const family = parseFareFamily(leg.fareFamily) ?? "BASIC";
  const usedFareSnapshot =
    typeof leg.farePriceCents === "number" &&
    Number.isFinite(leg.farePriceCents) &&
    leg.farePriceCents >= 0;
  const farePriceCents = resolveSegmentFarePriceCents({
    farePriceCents: leg.farePriceCents,
    flightPriceCents: leg.flight.price,
  });
  const originCode = resolveAirportEndpointCode({
    code: leg.flight.originCode,
    label: leg.flight.origin,
  });
  const destinationCode = resolveAirportEndpointCode({
    code: leg.flight.destinationCode,
    label: leg.flight.destination,
  });

  return {
    segmentType: leg.segmentType === "RETURN" ? "RETURN" : "OUTBOUND",
    segmentLabel: leg.segmentType === "RETURN" ? "RETURN" : "OUTBOUND",
    flightCode: leg.flight.code,
    originCode,
    destinationCode,
    originLabel: endpointLabel(leg.flight.originCode, leg.flight.origin),
    destinationLabel: endpointLabel(
      leg.flight.destinationCode,
      leg.flight.destination
    ),
    departureTimeLabel: formatDepartureTime(leg.flight),
    departureDateLabel: formatDepartureDate(leg.flight),
    arrivalTimeLabel: formatArrivalTime(leg.flight),
    arrivalDateLabel: formatArrivalDate(leg.flight),
    durationLabel: formatDuration(leg.flight.durationMinutes),
    fareLabel: getPrintFareFamilyLabel(family),
    farePriceCents,
    farePriceLabel: formatMoney(farePriceCents),
    usedFareSnapshot,
  };
}

export function buildPrintItineraryTravelers(
  passengers: PrintItineraryTravelerInput[]
): PrintItineraryTravelerView[] {
  return [...passengers]
    .sort((left, right) => left.id - right.id)
    .map((passenger) => ({
      id: passenger.id,
      displayName: `${passenger.firstName} ${passenger.lastName}`.trim(),
      passengerTypeLabel: formatPassengerTypeLabel(passenger.passengerType),
      nationality: passenger.nationality?.trim() || null,
    }));
}

export function assertNoSensitivePrintTravelerFields(
  travelers: PrintItineraryTravelerView[]
) {
  for (const traveler of travelers) {
    const keys = Object.keys(traveler);
    if (
      keys.some(
        (key) =>
          key.toLowerCase().includes("passport") ||
          key.toLowerCase().includes("dob") ||
          key === "dateOfBirth"
      )
    ) {
      return false;
    }
  }
  return true;
}

export function buildPrintItinerarySeatLines(input: {
  legs: PrintItineraryLegInput[];
  segments: Array<{
    id: number;
    segmentType: string;
    flightId: number;
  }>;
  passengers: PrintItineraryTravelerInput[];
  assignments: PrintItinerarySeatAssignmentInput[];
}): PrintItinerarySeatLine[] {
  if (input.assignments.length === 0) {
    return [];
  }

  const travelers = new Map(
    input.passengers.map((passenger) => [
      passenger.id,
      `${passenger.firstName} ${passenger.lastName}`.trim(),
    ])
  );
  const lines: PrintItinerarySeatLine[] = [];

  for (const leg of [...input.legs].sort(
    (left, right) => left.sequence - right.sequence
  )) {
    const segment = input.segments.find(
      (row) =>
        row.flightId === leg.flightId && row.segmentType === leg.segmentType
    );
    if (!segment) {
      continue;
    }
    const segmentAssignments = input.assignments.filter(
      (row) => row.bookingSegmentId === segment.id
    );
    for (const assignment of segmentAssignments) {
      lines.push({
        segmentLabel: leg.segmentType === "RETURN" ? "RETURN" : "OUTBOUND",
        flightCode: leg.flight.code,
        passengerName: travelers.get(assignment.passengerId) ?? "Traveler",
        seatNumber: assignment.seatNumber,
      });
    }
  }

  return lines;
}

export function buildPrintItineraryViewModel(input: {
  bookingReference: string;
  status: string;
  createdAt: string;
  subtotal: number;
  taxesAndFees: number;
  total: number;
  seatFeesTotal?: number | null;
  passengerCount: number;
  legs: PrintItineraryLegInput[];
  passengers: PrintItineraryTravelerInput[];
  segments?: Array<{
    id: number;
    segmentType: string;
    flightId: number;
  }>;
  seatAssignments?: PrintItinerarySeatAssignmentInput[];
  generatedAt?: string;
}): PrintItineraryViewModel {
  const legs = [...input.legs].sort((left, right) => left.sequence - right.sequence);
  const outbound =
    legs.find((leg) => leg.segmentType === "OUTBOUND") ?? legs[0] ?? null;
  const isRoundTrip = isRoundTripLegs(legs);
  const status = getBookingStatusPresentation(input.status);
  const travelers = buildPrintItineraryTravelers(input.passengers);
  const travelerCount =
    travelers.length > 0 ? travelers.length : input.passengerCount;
  const segments = legs.map(buildPrintItinerarySegmentView);
  const seatFeesTotal =
    typeof input.seatFeesTotal === "number" &&
    Number.isInteger(input.seatFeesTotal) &&
    input.seatFeesTotal >= 0
      ? input.seatFeesTotal
      : 0;
  const seatLines = buildPrintItinerarySeatLines({
    legs,
    segments: input.segments ?? [],
    passengers: input.passengers,
    assignments: input.seatAssignments ?? [],
  });
  const generatedAt = input.generatedAt ?? new Date().toISOString();

  return {
    brand: PRINT_ITINERARY_BRAND,
    brandMark: PRINT_ITINERARY_BRAND_MARK,
    documentTitle: PRINT_ITINERARY_DOCUMENT_TITLE,
    documentSubtitle: "Booking confirmation and travel summary",
    pageTitle: `${PRINT_ITINERARY_BRAND} - Itinerary - ${input.bookingReference}`,
    bookingReference: input.bookingReference,
    status: input.status,
    statusLabel: status.label,
    statusDescription: status.description,
    confirmationSummary: status.confirmationSummary,
    createdAtLabel: formatTripDateTime(
      input.createdAt,
      FALLBACK_AIRPORT_TIME_ZONE
    ),
    generatedAtLabel: formatTripDateTime(
      generatedAt,
      FALLBACK_AIRPORT_TIME_ZONE
    ),
    isRoundTrip,
    routeHeading: formatMyTripRouteHeading(outbound?.flight, isRoundTrip),
    routeDetail: formatMyTripRouteCodes(outbound?.flight, isRoundTrip),
    travelerCount,
    travelerLabel: formatTravelerCountLabel(travelerCount),
    travelers,
    segments,
    seatLines,
    priceLines: segments.map((segment) => ({
      key: `${segment.segmentType}-${segment.flightCode}`,
      label: `${segment.flightCode} · ${segment.fareLabel}`,
      amountCents: segment.farePriceCents,
    })),
    subtotal: input.subtotal,
    taxesAndFees: input.taxesAndFees,
    seatFeesTotal,
    total: input.total,
    amountDueCents: getBookingAmountDueCents({
      total: input.total,
      seatFeesTotal,
    }),
    paymentNotice: status.paymentAvailable
      ? "Online payment is not available yet."
      : null,
    footerNote:
      "This itinerary confirms a saved booking record. Payment has not been completed.",
    importantNotes: [
      "Arrive early for check-in and security.",
      "Bring valid travel documents for every traveler.",
      "Verify entry, visa, and health requirements before departure.",
    ],
  };
}

export { formatMoney };
