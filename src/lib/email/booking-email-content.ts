/**
 * Pure booking email content builders (D14.3).
 * Presentation only — no DB / Resend I/O.
 */

import { CUSTOMER_BRAND, CUSTOMER_BRAND_MARK } from "../brand";
import {
  isValidBookingContactEmail,
  normalizeBookingContactEmail,
} from "../booking-access";
import { getBookingPriceBreakdown } from "../booking-amount";
import { isRoundTripLegs, type BookingLeg } from "../booking-legs";
import { getBookingStatusPresentation } from "../booking-status";
import {
  getPrintFareFamilyLabel,
  parseFareFamily,
  resolveSegmentFarePriceCents,
} from "../fare-families";
import {
  formatMyTripRouteCodes,
  formatMyTripRouteHeading,
} from "../my-trips";
import { formatPassengerTypeLabel } from "../passenger-composition";
import {
  formatAirportLabelFromCode,
  getAirportByCode,
  resolveAirportEndpointCode,
} from "../../data/airports";
import { getAirportTimeZone } from "../airport-timezones";
import {
  formatArrivalDate,
  formatArrivalTime,
  formatDepartureDate,
  formatDepartureTime,
  formatDuration,
  formatMoney,
  formatTripDateShort,
} from "../trip-formatting";

export type BookingEmailTravelerInput = {
  id: number;
  firstName: string;
  lastName: string;
  passengerType: string;
};

export type BookingEmailLegInput = BookingLeg & {
  fareFamily?: string | null;
  farePriceCents?: number | null;
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

export type BookingEmailSeatAssignmentInput = {
  bookingSegmentId: number;
  passengerId: number;
  seatNumber: string;
};

export type BookingEmailSegmentInput = {
  id: number;
  segmentType: string;
  flightId: number;
};

export type BookingEmailSegmentView = {
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
  stopsLabel: string;
  fareLabel: string;
  farePriceCents: number;
  farePriceLabel: string;
  usedFareSnapshot: boolean;
};

export type BookingEmailTravelerView = {
  id: number;
  displayName: string;
  passengerTypeLabel: string;
};

export type BookingEmailSeatLine = {
  segmentLabel: string;
  flightCode: string;
  passengerName: string;
  seatNumber: string;
};

export type BookingEmailCta = {
  label: string;
  url: string;
  secondaryLabel?: string;
  secondaryUrl?: string;
};

export type BookingEmailContent = {
  brand: string;
  brandMark: string;
  bookingReference: string;
  status: string;
  statusLabel: string;
  statusDescription: string;
  isGuest: boolean;
  isRoundTrip: boolean;
  routeHeading: string;
  routeDetail: string | null;
  datesLabel: string;
  segments: BookingEmailSegmentView[];
  travelers: BookingEmailTravelerView[];
  seatLines: BookingEmailSeatLine[];
  flightSubtotalLabel: string;
  taxesAndFeesLabel: string;
  seatFeesCents: number;
  seatFeesLabel: string;
  amountDueCents: number;
  amountDueLabel: string;
  currencyLabel: string;
  cta: BookingEmailCta;
};

function endpointCityLabel(code: string, label?: string | null) {
  const resolved = resolveAirportEndpointCode({ code, label });
  const airport = getAirportByCode(resolved);
  if (airport) {
    return airport.city;
  }
  return formatAirportLabelFromCode(resolved) || resolved;
}

function airportLabelWithCode(code: string, label?: string | null) {
  const resolved = resolveAirportEndpointCode({ code, label });
  const city = endpointCityLabel(code, label);
  return `${city} (${resolved})`;
}

export function resolveBookingEmailRecipient(input: {
  contactEmail: string | null | undefined;
  userId: number | null | undefined;
  userEmail?: string | null | undefined;
}):
  | { ok: true; email: string; source: "contactEmail" | "userEmail" }
  | { ok: false; reason: "missing_recipient" } {
  if (input.contactEmail) {
    const contactEmail = normalizeBookingContactEmail(input.contactEmail);
    if (isValidBookingContactEmail(contactEmail)) {
      return { ok: true, email: contactEmail, source: "contactEmail" };
    }
  }

  if (
    input.userId != null &&
    typeof input.userEmail === "string" &&
    input.userEmail.trim()
  ) {
    const userEmail = normalizeBookingContactEmail(input.userEmail);
    if (isValidBookingContactEmail(userEmail)) {
      return { ok: true, email: userEmail, source: "userEmail" };
    }
  }

  return { ok: false, reason: "missing_recipient" };
}

export function buildBookingEmailSegmentView(
  leg: BookingEmailLegInput
): BookingEmailSegmentView {
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
    originLabel: airportLabelWithCode(leg.flight.originCode, leg.flight.origin),
    destinationLabel: airportLabelWithCode(
      leg.flight.destinationCode,
      leg.flight.destination
    ),
    departureTimeLabel: formatDepartureTime(leg.flight),
    departureDateLabel: formatDepartureDate(leg.flight),
    arrivalTimeLabel: formatArrivalTime(leg.flight),
    arrivalDateLabel: formatArrivalDate(leg.flight),
    durationLabel: formatDuration(leg.flight.durationMinutes),
    stopsLabel: "Nonstop",
    fareLabel: getPrintFareFamilyLabel(family),
    farePriceCents,
    farePriceLabel: formatMoney(farePriceCents),
    usedFareSnapshot,
  };
}

export function buildBookingEmailTravelers(
  passengers: BookingEmailTravelerInput[]
): BookingEmailTravelerView[] {
  return [...passengers]
    .sort((left, right) => left.id - right.id)
    .map((passenger) => ({
      id: passenger.id,
      displayName: `${passenger.firstName} ${passenger.lastName}`.trim(),
      passengerTypeLabel: formatPassengerTypeLabel(passenger.passengerType),
    }));
}

export function buildBookingEmailSeatLines(input: {
  legs: BookingEmailLegInput[];
  segments: BookingEmailSegmentInput[];
  passengers: BookingEmailTravelerInput[];
  assignments: BookingEmailSeatAssignmentInput[];
}): BookingEmailSeatLine[] {
  if (input.assignments.length === 0) {
    return [];
  }

  const travelers = new Map(
    input.passengers.map((passenger) => [
      passenger.id,
      `${passenger.firstName} ${passenger.lastName}`.trim(),
    ])
  );
  const lines: BookingEmailSeatLine[] = [];

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
        segmentLabel: leg.segmentType === "RETURN" ? "Return" : "Outbound",
        flightCode: leg.flight.code,
        passengerName: travelers.get(assignment.passengerId) ?? "Traveler",
        seatNumber: assignment.seatNumber,
      });
    }
  }

  return lines;
}

function buildDatesLabel(input: {
  legs: BookingEmailLegInput[];
  isRoundTrip: boolean;
}) {
  const legs = [...input.legs].sort((left, right) => left.sequence - right.sequence);
  const outbound =
    legs.find((leg) => leg.segmentType === "OUTBOUND") ?? legs[0] ?? null;
  const returnLeg = legs.find((leg) => leg.segmentType === "RETURN") ?? null;

  if (outbound && input.isRoundTrip && returnLeg) {
    const startZone = getAirportTimeZone(
      resolveAirportEndpointCode({
        code: outbound.flight.originCode,
        label: outbound.flight.origin,
      }) || outbound.flight.originCode
    );
    const endZone = getAirportTimeZone(
      resolveAirportEndpointCode({
        code: returnLeg.flight.originCode,
        label: returnLeg.flight.origin,
      }) || returnLeg.flight.originCode
    );
    const startDay = new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      timeZone: startZone,
    }).format(new Date(outbound.flight.departureTime));
    const endDay = formatTripDateShort(returnLeg.flight.departureTime, endZone);
    return `${startDay} – ${endDay}`;
  }

  if (outbound) {
    return formatDepartureDate(outbound.flight);
  }

  return "Dates unavailable";
}

export function buildBookingEmailContent(input: {
  bookingReference: string;
  status: string;
  userId: number | null;
  subtotal: number;
  taxesAndFees: number;
  total: number;
  seatFeesTotal?: number | null;
  legs: BookingEmailLegInput[];
  passengers: BookingEmailTravelerInput[];
  segments: BookingEmailSegmentInput[];
  seatAssignments?: BookingEmailSeatAssignmentInput[];
  findTripUrl: string;
  tripUrl: string;
  itineraryUrl?: string;
  myTripsUrl?: string;
}): BookingEmailContent {
  const legs = [...input.legs].sort((left, right) => left.sequence - right.sequence);
  const outbound =
    legs.find((leg) => leg.segmentType === "OUTBOUND") ?? legs[0] ?? null;
  const isRoundTrip = isRoundTripLegs(legs);
  const status = getBookingStatusPresentation(input.status);
  const isGuest = input.userId == null;
  const breakdown = getBookingPriceBreakdown({
    subtotal: input.subtotal,
    taxesAndFees: input.taxesAndFees,
    total: input.total,
    seatFeesTotal: input.seatFeesTotal,
  });

  const cta: BookingEmailCta = isGuest
    ? {
        label: "Find My Trip",
        url: input.findTripUrl,
      }
    : {
        label: "View My Trip",
        url: input.tripUrl,
        secondaryLabel: "My Trips",
        secondaryUrl: input.myTripsUrl,
      };

  return {
    brand: CUSTOMER_BRAND,
    brandMark: CUSTOMER_BRAND_MARK,
    bookingReference: input.bookingReference,
    status: input.status,
    statusLabel: status.label,
    statusDescription: status.description,
    isGuest,
    isRoundTrip,
    routeHeading: formatMyTripRouteHeading(outbound?.flight, isRoundTrip),
    routeDetail: formatMyTripRouteCodes(outbound?.flight, isRoundTrip),
    datesLabel: buildDatesLabel({ legs, isRoundTrip }),
    segments: legs.map(buildBookingEmailSegmentView),
    travelers: buildBookingEmailTravelers(input.passengers),
    seatLines: buildBookingEmailSeatLines({
      legs,
      segments: input.segments,
      passengers: input.passengers,
      assignments: input.seatAssignments ?? [],
    }),
    flightSubtotalLabel: formatMoney(breakdown.flightSubtotalCents),
    taxesAndFeesLabel: formatMoney(breakdown.taxesAndFeesCents),
    seatFeesCents: breakdown.seatFeesCents,
    seatFeesLabel: formatMoney(breakdown.seatFeesCents),
    amountDueCents: breakdown.amountDueCents,
    amountDueLabel: formatMoney(breakdown.amountDueCents),
    currencyLabel: "USD",
    cta,
  };
}

/** Safe absolute trip URL for authenticated bookings only. */
export function bookingTripPath(bookingReference: string) {
  return `/my-trips/${encodeURIComponent(bookingReference)}`;
}

export function bookingItineraryPath(bookingReference: string) {
  return `/my-trips/${encodeURIComponent(bookingReference)}/itinerary`;
}
