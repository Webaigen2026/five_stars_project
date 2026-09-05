/**
 * Booking email dispatch core (D14.3).
 * Store / Resend deps injected — no direct DB import (testable).
 */

import { joinAppPath, requireCanonicalAppUrl } from "../app-url";
import {
  bookingItineraryPath,
  bookingTripPath,
  buildBookingEmailContent,
  resolveBookingEmailRecipient,
  type BookingEmailContent,
  type BookingEmailLegInput,
  type BookingEmailSeatAssignmentInput,
  type BookingEmailSegmentInput,
  type BookingEmailTravelerInput,
} from "./booking-email-content";
import {
  bookingCreatedEmailIdempotencyKey,
  paymentReceivedEmailIdempotencyKey,
} from "./booking-email-keys";
import {
  sendBookingCreatedEmail,
  sendBookingPaymentReceivedEmail,
} from "./send-booking-emails";
import {
  EmailConfigurationError,
  EmailDeliveryError,
  type SendEmailFn,
} from "./resend";

export type BookingEmailDispatchResult =
  | { status: "sent"; messageId: string | null; recipient: string }
  | { status: "already_sent" }
  | { status: "skipped"; reason: string }
  | { status: "failed"; reason: string };

export type BookingEmailBundle = {
  booking: {
    id: number;
    bookingReference: string;
    status: string;
    userId: number | null;
    contactEmail: string | null;
    subtotal: number;
    taxesAndFees: number;
    total: number;
    seatFeesTotal: number | null;
    bookingCreatedEmailSentAt: string | null;
    paymentReceivedEmailSentAt: string | null;
  };
  passengers: BookingEmailTravelerInput[];
  segments: BookingEmailSegmentInput[];
  seatAssignments: BookingEmailSeatAssignmentInput[];
  legs: BookingEmailLegInput[];
  user: { id: number; email: string } | null;
};

export type BookingEmailStore = {
  loadBundle: (bookingId: number) => Promise<BookingEmailBundle | null>;
  markBookingCreatedSent: (
    bookingId: number,
    sentAt: string
  ) => Promise<void>;
  markPaymentReceivedSent: (
    bookingId: number,
    sentAt: string
  ) => Promise<void>;
};

export type BookingEmailDeps = {
  send?: SendEmailFn;
  env?: NodeJS.ProcessEnv;
  now?: () => Date;
  store: BookingEmailStore;
};

function buildContentFromBundle(
  bundle: BookingEmailBundle,
  env?: NodeJS.ProcessEnv
): BookingEmailContent {
  const appUrl = requireCanonicalAppUrl(env?.NEXT_PUBLIC_APP_URL);
  const tripPath = bookingTripPath(bundle.booking.bookingReference);

  return buildBookingEmailContent({
    bookingReference: bundle.booking.bookingReference,
    status: bundle.booking.status,
    userId: bundle.booking.userId,
    subtotal: bundle.booking.subtotal,
    taxesAndFees: bundle.booking.taxesAndFees,
    total: bundle.booking.total,
    seatFeesTotal: bundle.booking.seatFeesTotal,
    legs: bundle.legs,
    passengers: bundle.passengers,
    segments: bundle.segments,
    seatAssignments: bundle.seatAssignments,
    findTripUrl: joinAppPath(appUrl, "/find-trip"),
    tripUrl: joinAppPath(appUrl, tripPath),
    itineraryUrl: joinAppPath(
      appUrl,
      bookingItineraryPath(bundle.booking.bookingReference)
    ),
    myTripsUrl: joinAppPath(appUrl, "/my-trips"),
  });
}

function logBookingEmailFailure(input: {
  event: "booking_created" | "payment_received";
  bookingId: number;
  bookingReference?: string;
  reason: string;
}) {
  console.error("Booking email delivery failed", {
    event: input.event,
    bookingId: input.bookingId,
    bookingReference: input.bookingReference,
    reason: input.reason,
  });
}

export async function sendBookingCreatedEmailForBooking(
  bookingId: number,
  deps: BookingEmailDeps
): Promise<BookingEmailDispatchResult> {
  const bundle = await deps.store.loadBundle(bookingId);
  if (!bundle) {
    return { status: "skipped", reason: "booking_not_found" };
  }

  if (bundle.booking.bookingCreatedEmailSentAt) {
    return { status: "already_sent" };
  }

  const recipient = resolveBookingEmailRecipient({
    contactEmail: bundle.booking.contactEmail,
    userId: bundle.booking.userId,
    userEmail: bundle.user?.email,
  });

  if (!recipient.ok) {
    console.log("Booking created email skipped", {
      bookingId,
      bookingReference: bundle.booking.bookingReference,
      reason: recipient.reason,
    });
    return { status: "skipped", reason: recipient.reason };
  }

  const idempotencyKey = bookingCreatedEmailIdempotencyKey(bookingId);
  let content: BookingEmailContent;

  try {
    content = buildContentFromBundle(bundle, deps.env);
  } catch (error) {
    const reason =
      error instanceof Error ? error.message : "content_build_failed";
    logBookingEmailFailure({
      event: "booking_created",
      bookingId,
      bookingReference: bundle.booking.bookingReference,
      reason,
    });
    return { status: "failed", reason: "content_build_failed" };
  }

  try {
    const result = await sendBookingCreatedEmail({
      to: recipient.email,
      content,
      idempotencyKey,
      send: deps.send,
      env: deps.env,
    });

    const sentAt = (deps.now ?? (() => new Date()))().toISOString();
    await deps.store.markBookingCreatedSent(bookingId, sentAt);

    console.log("Booking created email sent", {
      bookingId,
      bookingReference: bundle.booking.bookingReference,
      messageId: result.id,
      recipientSource: recipient.source,
    });

    return {
      status: "sent",
      messageId: result.id,
      recipient: recipient.email,
    };
  } catch (error) {
    const reason =
      error instanceof EmailDeliveryError ||
      error instanceof EmailConfigurationError
        ? error.name
        : "unexpected";
    logBookingEmailFailure({
      event: "booking_created",
      bookingId,
      bookingReference: bundle.booking.bookingReference,
      reason,
    });
    return { status: "failed", reason };
  }
}

export async function sendPaymentReceivedEmailForBooking(
  bookingId: number,
  deps: BookingEmailDeps
): Promise<BookingEmailDispatchResult> {
  const bundle = await deps.store.loadBundle(bookingId);
  if (!bundle) {
    return { status: "skipped", reason: "booking_not_found" };
  }

  if (bundle.booking.paymentReceivedEmailSentAt) {
    return { status: "already_sent" };
  }

  const recipient = resolveBookingEmailRecipient({
    contactEmail: bundle.booking.contactEmail,
    userId: bundle.booking.userId,
    userEmail: bundle.user?.email,
  });

  if (!recipient.ok) {
    console.log("Payment received email skipped", {
      bookingId,
      bookingReference: bundle.booking.bookingReference,
      reason: recipient.reason,
    });
    return { status: "skipped", reason: recipient.reason };
  }

  const idempotencyKey = paymentReceivedEmailIdempotencyKey(bookingId);
  let content: BookingEmailContent;

  try {
    content = buildContentFromBundle(bundle, deps.env);
  } catch (error) {
    const reason =
      error instanceof Error ? error.message : "content_build_failed";
    logBookingEmailFailure({
      event: "payment_received",
      bookingId,
      bookingReference: bundle.booking.bookingReference,
      reason,
    });
    return { status: "failed", reason: "content_build_failed" };
  }

  try {
    const result = await sendBookingPaymentReceivedEmail({
      to: recipient.email,
      content,
      idempotencyKey,
      send: deps.send,
      env: deps.env,
    });

    const sentAt = (deps.now ?? (() => new Date()))().toISOString();
    await deps.store.markPaymentReceivedSent(bookingId, sentAt);

    console.log("Payment received email sent", {
      bookingId,
      bookingReference: bundle.booking.bookingReference,
      messageId: result.id,
      recipientSource: recipient.source,
    });

    return {
      status: "sent",
      messageId: result.id,
      recipient: recipient.email,
    };
  } catch (error) {
    const reason =
      error instanceof EmailDeliveryError ||
      error instanceof EmailConfigurationError
        ? error.name
        : "unexpected";
    logBookingEmailFailure({
      event: "payment_received",
      bookingId,
      bookingReference: bundle.booking.bookingReference,
      reason,
    });
    return { status: "failed", reason };
  }
}
