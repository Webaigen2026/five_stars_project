/**
 * Trip Detail presentation helpers (D12.3.2).
 * Display only — no booking mutations or payment enablement.
 */

import {
  buildConfirmationSegmentView,
  buildConfirmationTravelerViews,
  type ConfirmationSegmentView,
  type ConfirmationTravelerInput,
  type ConfirmationTravelerView,
} from "./booking-confirmation";
import { isRoundTripLegs, type BookingLeg } from "./booking-legs";
import { getBookingStatusPresentation } from "./booking-status";
import { getAirportTimeZone } from "./airport-timezones";
import { resolveAirportEndpointCode } from "../data/airports";
import {
  formatDepartureDate,
  formatMoney,
  formatTripDateShort,
  isUpcomingTrip,
} from "./trip-formatting";
import {
  formatMyTripRouteCodes,
  formatMyTripRouteHeading,
  formatTravelerCountLabel,
  getTripTravelEndInstant,
  isActionNeededBookingStatus,
  type MyTripFlightEndpoint,
} from "./my-trips";

export type TripDetailLegInput = BookingLeg & {
  flight: MyTripFlightEndpoint & {
    code: string;
    price: number;
    origin: string;
    destination: string;
    departureTime: string;
    arrivalTime: string;
  };
};

export type TripDetailPriceLine = {
  key: string;
  label: string;
  amountCents: number;
};

export type TripDetailViewModel = {
  bookingReference: string;
  status: string;
  statusLabel: string;
  statusDescription: string;
  isActionNeeded: boolean;
  showPaymentDisabledNotice: boolean;
  /** Explicitly false while Stripe is disabled — no Pay now / checkout CTA. */
  hasPayNowAction: boolean;
  isRoundTrip: boolean;
  tripTypeLabel: string;
  routeHeading: string;
  routeDetail: string | null;
  datesLabel: string;
  timingLabel: "Upcoming trip" | "Past trip" | null;
  travelerCount: number;
  travelerLabel: string;
  travelers: ConfirmationTravelerView[];
  segments: ConfirmationSegmentView[];
  segmentCount: number;
  priceLines: TripDetailPriceLine[];
  subtotal: number;
  taxesAndFees: number;
  total: number;
  tripHref: string;
  itineraryHref: string;
  myTripsHref: string;
  flightsHref: string;
};

export function formatTripDetailDatesLabel(
  legs: TripDetailLegInput[],
  isRoundTrip: boolean
) {
  const ordered = [...legs].sort((left, right) => left.sequence - right.sequence);
  const outbound =
    ordered.find((leg) => leg.segmentType === "OUTBOUND") ?? ordered[0] ?? null;
  const returnLeg =
    ordered.find((leg) => leg.segmentType === "RETURN") ?? null;

  if (!outbound) {
    return "Dates unavailable";
  }

  if (isRoundTrip && returnLeg) {
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

  return formatDepartureDate(outbound.flight);
}

export function canAccessTripDetail(
  bookingUserId: number | null,
  currentUserId: number | null
) {
  // Trip Detail requires a signed-in owner (stricter than guest checkout review).
  if (currentUserId == null || bookingUserId == null) {
    return false;
  }

  return bookingUserId === currentUserId;
}

export function buildTripDetailViewModel(input: {
  bookingReference: string;
  status: string;
  subtotal: number;
  taxesAndFees: number;
  total: number;
  passengerCount: number;
  legs: TripDetailLegInput[];
  passengers: ConfirmationTravelerInput[];
  now?: Date;
}): TripDetailViewModel {
  const legs = [...input.legs].sort((left, right) => left.sequence - right.sequence);
  const outbound =
    legs.find((leg) => leg.segmentType === "OUTBOUND") ?? legs[0] ?? null;
  const isRoundTrip = isRoundTripLegs(legs);
  const status = getBookingStatusPresentation(input.status);
  const travelers = buildConfirmationTravelerViews(input.passengers);
  const travelerCount =
    travelers.length > 0 ? travelers.length : input.passengerCount;
  const segments = legs.map((leg) => buildConfirmationSegmentView(leg));
  const tripHref = `/my-trips/${encodeURIComponent(input.bookingReference)}`;
  const travelEnd = getTripTravelEndInstant(legs);
  const outboundDeparture = outbound?.flight.departureTime ?? null;
  const now = input.now ?? new Date();

  let timingLabel: TripDetailViewModel["timingLabel"] = null;
  if (outboundDeparture || travelEnd) {
    timingLabel = isUpcomingTrip({
      status: input.status,
      departureTime: travelEnd ?? outboundDeparture,
      now,
    })
      ? "Upcoming trip"
      : "Past trip";
  }

  const priceLines: TripDetailPriceLine[] = segments.map((segment) => ({
    key: `${segment.segmentType}-${segment.flightCode}`,
    label: `${segment.flightCode} · ${segment.fareLabel}`,
    amountCents: segment.farePriceCents,
  }));

  return {
    bookingReference: input.bookingReference,
    status: input.status,
    statusLabel: status.label,
    statusDescription: status.description,
    isActionNeeded: isActionNeededBookingStatus(input.status),
    showPaymentDisabledNotice: status.paymentAvailable,
    hasPayNowAction: false,
    isRoundTrip,
    tripTypeLabel: isRoundTrip ? "Round trip" : "One way",
    routeHeading: formatMyTripRouteHeading(outbound?.flight, isRoundTrip),
    routeDetail: formatMyTripRouteCodes(outbound?.flight, isRoundTrip),
    datesLabel: formatTripDetailDatesLabel(legs, isRoundTrip),
    timingLabel,
    travelerCount,
    travelerLabel: formatTravelerCountLabel(travelerCount),
    travelers,
    segments,
    segmentCount: segments.length,
    priceLines,
    subtotal: input.subtotal,
    taxesAndFees: input.taxesAndFees,
    total: input.total,
    tripHref,
    itineraryHref: `${tripHref}/itinerary`,
    myTripsHref: "/my-trips",
    flightsHref: "/flights",
  };
}

export function assertNoSensitiveTripTravelerFields(
  travelers: ConfirmationTravelerView[]
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

export { formatMoney };
