/**
 * Booking confirmation / payment email service (D14.3).
 * Wires durable DB markers + Resend delivery.
 */

import "server-only";

import { loadBookingLegsWithFlights } from "./booking-segments";
import {
  sendBookingCreatedEmailForBooking as dispatchBookingCreated,
  sendPaymentReceivedEmailForBooking as dispatchPaymentReceived,
  type BookingEmailBundle,
  type BookingEmailDeps,
  type BookingEmailDispatchResult,
  type BookingEmailStore,
} from "./email/booking-email-dispatch";
import type { SendEmailFn } from "./email/resend";
import { db } from "../prisma/db";

export type {
  BookingEmailBundle,
  BookingEmailDispatchResult,
  BookingEmailStore,
};

async function defaultLoadBundle(
  bookingId: number
): Promise<BookingEmailBundle | null> {
  const booking = await db.orm.public.Booking.where({ id: bookingId }).first();
  if (!booking) {
    return null;
  }

  const [passengers, segments, seatAssignments, legs, user] = await Promise.all([
    db.orm.public.Passenger.where({ bookingId }).all(),
    db.orm.public.BookingSegment.where({ bookingId }).all(),
    db.orm.public.SeatAssignment.where({ bookingId }).all(),
    loadBookingLegsWithFlights({
      id: booking.id,
      flightId: booking.flightId,
    }),
    booking.userId != null
      ? db.orm.public.User.select("id", "email")
          .where({ id: booking.userId })
          .first()
      : Promise.resolve(null),
  ]);

  return {
    booking: {
      id: booking.id,
      bookingReference: booking.bookingReference,
      status: booking.status,
      userId: booking.userId,
      contactEmail: booking.contactEmail,
      subtotal: booking.subtotal,
      taxesAndFees: booking.taxesAndFees,
      total: booking.total,
      seatFeesTotal: booking.seatFeesTotal,
      bookingCreatedEmailSentAt: booking.bookingCreatedEmailSentAt,
      paymentReceivedEmailSentAt: booking.paymentReceivedEmailSentAt,
    },
    passengers: [...passengers].map((passenger) => ({
      id: passenger.id,
      firstName: passenger.firstName,
      lastName: passenger.lastName,
      passengerType: passenger.passengerType,
    })),
    segments: [...segments].map((segment) => ({
      id: segment.id,
      segmentType: segment.segmentType,
      flightId: segment.flightId,
    })),
    seatAssignments: [...seatAssignments].map((assignment) => ({
      bookingSegmentId: assignment.bookingSegmentId,
      passengerId: assignment.passengerId,
      seatNumber: assignment.seatNumber,
    })),
    legs,
    user: user ? { id: user.id, email: user.email } : null,
  };
}

const defaultStore: BookingEmailStore = {
  loadBundle: defaultLoadBundle,
  markBookingCreatedSent: async (bookingId, sentAt) => {
    await db.orm.public.Booking.where({ id: bookingId }).update({
      bookingCreatedEmailSentAt: sentAt,
    });
  },
  markPaymentReceivedSent: async (bookingId, sentAt) => {
    await db.orm.public.Booking.where({ id: bookingId }).update({
      paymentReceivedEmailSentAt: sentAt,
    });
  },
};

type ServiceDeps = {
  send?: SendEmailFn;
  env?: NodeJS.ProcessEnv;
  now?: () => Date;
  store?: BookingEmailStore;
};

function withStore(deps?: ServiceDeps): BookingEmailDeps {
  return {
    send: deps?.send,
    env: deps?.env,
    now: deps?.now,
    store: deps?.store ?? defaultStore,
  };
}

export async function sendBookingCreatedEmailForBooking(
  bookingId: number,
  deps?: ServiceDeps
): Promise<BookingEmailDispatchResult> {
  return dispatchBookingCreated(bookingId, withStore(deps));
}

export async function sendPaymentReceivedEmailForBooking(
  bookingId: number,
  deps?: ServiceDeps
): Promise<BookingEmailDispatchResult> {
  return dispatchPaymentReceived(bookingId, withStore(deps));
}

/** Fire-and-forget wrapper — never throws into booking create path. */
export async function notifyBookingCreatedEmail(
  bookingId: number
): Promise<void> {
  try {
    await sendBookingCreatedEmailForBooking(bookingId);
  } catch (error) {
    console.error("Booking created email notify failed", {
      bookingId,
      errorName: error instanceof Error ? error.name : "unknown",
    });
  }
}

/** Fire-and-forget wrapper — never throws into Stripe webhook path. */
export async function notifyPaymentReceivedEmail(
  bookingId: number
): Promise<void> {
  try {
    await sendPaymentReceivedEmailForBooking(bookingId);
  } catch (error) {
    console.error("Payment received email notify failed", {
      bookingId,
      errorName: error instanceof Error ? error.name : "unknown",
    });
  }
}
