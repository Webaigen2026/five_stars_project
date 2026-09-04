/**
 * My Trips list presentation helpers (D12.3.1).
 * Display / grouping only — no booking mutations.
 */

import {
  formatAirportLabelFromCode,
  resolveAirportEndpointCode,
} from "../data/airports";
import { isRoundTripLegs, type BookingLeg } from "./booking-legs";
import { getBookingStatusPresentation } from "./booking-status";
import { getAirportTimeZone } from "./airport-timezones";
import {
  formatDepartureDate,
  formatMoney,
  formatTripDateShort,
  isUpcomingTrip,
} from "./trip-formatting";

export type MyTripListSection = "actionNeeded" | "upcoming" | "past";

export type MyTripFlightEndpoint = {
  origin?: string | null;
  originCode: string;
  destination?: string | null;
  destinationCode: string;
  departureTime: string;
  arrivalTime?: string;
};

export type MyTripLegInput = BookingLeg & {
  flight: MyTripFlightEndpoint & {
    code?: string;
    price?: number;
  };
};

export type MyTripBookingInput = {
  id: number;
  bookingReference: string;
  status: string;
  passengerCount: number;
  total: number;
  createdAt: string;
};

export type MyTripCardViewModel = {
  bookingId: number;
  bookingReference: string;
  status: string;
  statusLabel: string;
  statusDescription: string;
  isActionNeeded: boolean;
  isRoundTrip: boolean;
  tripTypeLabel: string;
  routeHeading: string;
  routeDetail: string | null;
  datesLabel: string;
  travelerCount: number;
  travelerLabel: string;
  totalLabel: string;
  tripHref: string;
  itineraryHref: string;
  outboundDepartureTime: string | null;
  travelEndTime: string | null;
  createdAt: string;
};

function canonicalEndpointLabel(input: {
  code: string;
  label?: string | null;
}) {
  const code = resolveAirportEndpointCode(input);
  return formatAirportLabelFromCode(code) || code;
}

export function formatTravelerCountLabel(count: number) {
  const safe = Number.isInteger(count) && count > 0 ? count : 0;
  return safe === 1 ? "1 traveler" : `${safe} travelers`;
}

export function formatMyTripRouteHeading(
  outbound: MyTripFlightEndpoint | null | undefined,
  isRoundTrip: boolean
) {
  if (!outbound) {
    return "Flight details unavailable";
  }

  const origin = canonicalEndpointLabel({
    code: outbound.originCode,
    label: outbound.origin,
  });
  const destination = canonicalEndpointLabel({
    code: outbound.destinationCode,
    label: outbound.destination,
  });

  return isRoundTrip
    ? `${origin} ⇄ ${destination}`
    : `${origin} → ${destination}`;
}

export function formatMyTripRouteCodes(
  outbound: MyTripFlightEndpoint | null | undefined,
  isRoundTrip: boolean
) {
  if (!outbound) {
    return null;
  }

  const originCode = resolveAirportEndpointCode({
    code: outbound.originCode,
    label: outbound.origin,
  });
  const destinationCode = resolveAirportEndpointCode({
    code: outbound.destinationCode,
    label: outbound.destination,
  });

  return isRoundTrip
    ? `${originCode} ⇄ ${destinationCode}`
    : `${originCode} → ${destinationCode}`;
}

export function getTripTravelEndInstant(
  legs: Array<{
    flight: Pick<MyTripFlightEndpoint, "departureTime" | "arrivalTime">;
  }>
) {
  if (legs.length === 0) {
    return null;
  }

  let latest: string | null = null;
  let latestMs = Number.NEGATIVE_INFINITY;

  for (const leg of legs) {
    const candidate = leg.flight.arrivalTime ?? leg.flight.departureTime;
    const ms = new Date(candidate).getTime();
    if (Number.isFinite(ms) && ms >= latestMs) {
      latestMs = ms;
      latest = candidate;
    }
  }

  return latest;
}

export function isActionNeededBookingStatus(status: string) {
  return getBookingStatusPresentation(status).paymentAvailable;
}

export function classifyMyTripSection(input: {
  status: string;
  outboundDepartureTime: string | null | undefined;
  travelEndTime: string | null | undefined;
  now?: Date;
}): MyTripListSection {
  if (isActionNeededBookingStatus(input.status)) {
    return "actionNeeded";
  }

  const now = input.now ?? new Date();
  const travelInstant = input.travelEndTime ?? input.outboundDepartureTime;

  if (
    !isUpcomingTrip({
      status: input.status,
      departureTime: travelInstant,
      now,
    })
  ) {
    return "past";
  }

  return "upcoming";
}

export function buildMyTripCardViewModel(input: {
  booking: MyTripBookingInput;
  legs: MyTripLegInput[];
  travelerCount: number;
}): MyTripCardViewModel {
  const legs = [...input.legs].sort((left, right) => left.sequence - right.sequence);
  const outbound =
    legs.find((leg) => leg.segmentType === "OUTBOUND") ?? legs[0] ?? null;
  const returnLeg = legs.find((leg) => leg.segmentType === "RETURN") ?? null;
  const isRoundTrip = isRoundTripLegs(legs);
  const status = getBookingStatusPresentation(input.booking.status);
  const travelerCount =
    Number.isInteger(input.travelerCount) && input.travelerCount > 0
      ? input.travelerCount
      : input.booking.passengerCount;
  const tripHref = `/my-trips/${encodeURIComponent(input.booking.bookingReference)}`;

  let datesLabel = "Dates unavailable";
  if (outbound && isRoundTrip && returnLeg) {
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
    datesLabel = `${startDay} – ${endDay}`;
  } else if (outbound) {
    datesLabel = formatDepartureDate(outbound.flight);
  }

  return {
    bookingId: input.booking.id,
    bookingReference: input.booking.bookingReference,
    status: input.booking.status,
    statusLabel: status.label,
    statusDescription: status.description,
    isActionNeeded: isActionNeededBookingStatus(input.booking.status),
    isRoundTrip,
    tripTypeLabel: isRoundTrip ? "Round trip" : "One way",
    routeHeading: formatMyTripRouteHeading(outbound?.flight, isRoundTrip),
    routeDetail: formatMyTripRouteCodes(outbound?.flight, isRoundTrip),
    datesLabel,
    travelerCount,
    travelerLabel: formatTravelerCountLabel(travelerCount),
    totalLabel: formatMoney(input.booking.total),
    tripHref,
    itineraryHref: `${tripHref}/itinerary`,
    outboundDepartureTime: outbound?.flight.departureTime ?? null,
    travelEndTime: getTripTravelEndInstant(legs),
    createdAt: input.booking.createdAt,
  };
}

export function groupMyTripCards(
  cards: MyTripCardViewModel[],
  now = new Date()
) {
  const actionNeeded: MyTripCardViewModel[] = [];
  const upcoming: MyTripCardViewModel[] = [];
  const past: MyTripCardViewModel[] = [];

  for (const card of cards) {
    const section = classifyMyTripSection({
      status: card.status,
      outboundDepartureTime: card.outboundDepartureTime,
      travelEndTime: card.travelEndTime,
      now,
    });

    if (section === "actionNeeded") {
      actionNeeded.push(card);
    } else if (section === "past") {
      past.push(card);
    } else {
      upcoming.push(card);
    }
  }

  actionNeeded.sort(
    (left, right) =>
      new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
  );

  upcoming.sort((left, right) => {
    const leftMs = new Date(left.outboundDepartureTime ?? left.createdAt).getTime();
    const rightMs = new Date(
      right.outboundDepartureTime ?? right.createdAt
    ).getTime();
    return leftMs - rightMs;
  });

  past.sort((left, right) => {
    const leftMs = new Date(
      left.travelEndTime ?? left.outboundDepartureTime ?? left.createdAt
    ).getTime();
    const rightMs = new Date(
      right.travelEndTime ?? right.outboundDepartureTime ?? right.createdAt
    ).getTime();
    return rightMs - leftMs;
  });

  return { actionNeeded, upcoming, past };
}
