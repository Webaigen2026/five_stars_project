import {
  getFareFamilyLabel,
  parseFareFamily,
  resolveSegmentFarePriceCents,
} from "./fare-families";
import { getBookingStatusPresentation } from "./booking-status";
import { formatPassengerTypeLabel } from "./passenger-composition";
import { isRoundTripLegs, type BookingLeg } from "./booking-legs";
import {
  canAccessBooking,
  type BookingAccessInput,
} from "./booking-access";

export type ConfirmationTravelerInput = {
  id: number;
  firstName: string;
  lastName: string;
  nationality: string | null;
  passengerType: string;
  /** Must never appear on confirmation view models. */
  passportNumber?: string | null;
  passportNumberEncrypted?: string | null;
  dateOfBirth?: string | null;
};

export type ConfirmationSegmentView = {
  segmentType: "OUTBOUND" | "RETURN";
  flightCode: string;
  originCode: string;
  destinationCode: string;
  fareFamily: string;
  fareLabel: string;
  farePriceCents: number;
  usedFareSnapshot: boolean;
};

export type ConfirmationTravelerView = {
  id: number;
  displayName: string;
  passengerTypeLabel: string;
  nationality: string | null;
};

export type ConfirmationPriceView = {
  subtotal: number;
  taxesAndFees: number;
  total: number;
  passengerCount: number;
};

export type BookingConfirmationViewModel = {
  bookingReference: string;
  statusLabel: string;
  statusDescription: string;
  heroEyebrow: string;
  heroTitle: string;
  supportingCopy: string;
  isRoundTrip: boolean;
  segments: ConfirmationSegmentView[];
  travelers: ConfirmationTravelerView[];
  price: ConfirmationPriceView;
  tripHref: string;
  itineraryHref: string;
  myTripsHref: string;
  flightsHref: string;
};

export function canAccessBookingConfirmation(input: BookingAccessInput) {
  return canAccessBooking(input);
}

/** @deprecated Use canAccessBookingConfirmation(BookingAccessInput). */
export function canAccessBookingConfirmationLegacy(
  bookingUserId: number | null,
  currentUserId: number | null
) {
  if (bookingUserId == null || currentUserId == null) {
    return false;
  }
  return bookingUserId === currentUserId;
}

export function buildConfirmationSegmentView(leg: {
  segmentType: string;
  fareFamily?: string | null;
  farePriceCents?: number | null;
  flight: {
    code: string;
    originCode: string;
    destinationCode: string;
    price: number;
  };
}): ConfirmationSegmentView {
  const family = parseFareFamily(leg.fareFamily) ?? "BASIC";
  const usedFareSnapshot =
    typeof leg.farePriceCents === "number" &&
    Number.isFinite(leg.farePriceCents) &&
    leg.farePriceCents >= 0;

  return {
    segmentType: leg.segmentType === "RETURN" ? "RETURN" : "OUTBOUND",
    flightCode: leg.flight.code,
    originCode: leg.flight.originCode,
    destinationCode: leg.flight.destinationCode,
    fareFamily: family,
    fareLabel: getFareFamilyLabel(family),
    farePriceCents: resolveSegmentFarePriceCents({
      farePriceCents: leg.farePriceCents,
      flightPriceCents: leg.flight.price,
    }),
    usedFareSnapshot,
  };
}

export function buildConfirmationTravelerViews(
  passengers: ConfirmationTravelerInput[]
): ConfirmationTravelerView[] {
  return [...passengers]
    .sort((left, right) => left.id - right.id)
    .map((passenger) => ({
      id: passenger.id,
      displayName: `${passenger.firstName} ${passenger.lastName}`.trim(),
      passengerTypeLabel: formatPassengerTypeLabel(passenger.passengerType),
      nationality: passenger.nationality?.trim() || null,
    }));
}

export function assertNoSensitiveTravelerFields(
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

export function buildBookingConfirmationViewModel(input: {
  bookingReference: string;
  status: string;
  subtotal: number;
  taxesAndFees: number;
  total: number;
  passengerCount: number;
  legs: Array<
    BookingLeg & {
      flight: {
        code: string;
        originCode: string;
        destinationCode: string;
        price: number;
      };
    }
  >;
  passengers: ConfirmationTravelerInput[];
}): BookingConfirmationViewModel {
  const status = getBookingStatusPresentation(input.status);
  const tripHref = `/my-trips/${encodeURIComponent(input.bookingReference)}`;

  return {
    bookingReference: input.bookingReference,
    statusLabel: status.label,
    statusDescription: status.description,
    heroEyebrow: "Booking created",
    heroTitle: "Your trip is saved",
    supportingCopy:
      "Your booking has been created. Online payment is not available yet.",
    isRoundTrip: isRoundTripLegs(input.legs),
    segments: input.legs.map((leg) => buildConfirmationSegmentView(leg)),
    travelers: buildConfirmationTravelerViews(input.passengers),
    price: {
      subtotal: input.subtotal,
      taxesAndFees: input.taxesAndFees,
      total: input.total,
      passengerCount: input.passengerCount,
    },
    tripHref,
    itineraryHref: `${tripHref}/itinerary`,
    myTripsHref: "/my-trips",
    flightsHref: "/flights",
  };
}

export function formatBookingReferenceDisplay(reference: string) {
  return reference.trim().toUpperCase();
}

/** Stable copy for missing confirmation pages (refresh-safe error UI). */
export const BOOKING_CONFIRMATION_NOT_FOUND = {
  title: "Booking not found.",
  message: "We could not find a booking with that reference.",
} as const;
