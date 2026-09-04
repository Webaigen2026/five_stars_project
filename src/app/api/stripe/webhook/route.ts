import { transitionBookingStatus } from "../../../../lib/booking-transitions";
import { isBookingDomainError } from "../../../../lib/booking-errors";
import { releaseSeatAssignmentsForBooking } from "../../../../lib/seat-assignments";
import {
  buildExpiredPaymentValues,
  buildSucceededPaymentValues,
  decideCheckoutSessionCompleted,
  decideCheckoutSessionExpired,
} from "../../../../lib/stripe-webhook";
import {
  StripeConfigurationError,
  getStripe,
} from "../../../../lib/stripe";
import { isStripeWebhookConfigured } from "../../../../lib/payments";
import { db } from "../../../../prisma/db";

export const runtime = "nodejs";

function readWebhookSecret() {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret) {
    throw new StripeConfigurationError(
      "Stripe webhook is not configured. Set STRIPE_WEBHOOK_SECRET."
    );
  }
  return secret;
}

async function loadBookingAndPayment(bookingId: number) {
  const [booking, payment] = await Promise.all([
    db.orm.public.Booking.where({ id: bookingId }).first(),
    db.orm.public.Payment.where({ bookingId }).first(),
  ]);

  return { booking, payment };
}

async function upsertPaymentForBooking(
  bookingId: number,
  values: Record<string, unknown>,
  existingPaymentId: number | undefined,
  fallbackAmount: number
) {
  if (existingPaymentId) {
    await db.orm.public.Payment.where({ id: existingPaymentId }).update(values);
    return;
  }

  await db.orm.public.Payment.create({
    bookingId,
    currency: "USD",
    amount:
      typeof values.amount === "number" ? values.amount : fallbackAmount,
    status: typeof values.status === "string" ? values.status : "PENDING",
    provider:
      typeof values.provider === "string" ? values.provider : "STRIPE",
    stripeCheckoutId:
      typeof values.stripeCheckoutId === "string"
        ? values.stripeCheckoutId
        : null,
    stripePaymentIntentId:
      typeof values.stripePaymentIntentId === "string"
        ? values.stripePaymentIntentId
        : null,
    paidAt:
      typeof values.paidAt === "string" || values.paidAt === null
        ? (values.paidAt as string | null)
        : null,
  });
}

export async function POST(request: Request) {
  if (!isStripeWebhookConfigured()) {
    return Response.json(
      { error: "Stripe webhook is not configured." },
      { status: 503 }
    );
  }

  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return Response.json({ error: "Missing Stripe signature." }, { status: 400 });
  }

  let event;

  try {
    const stripe = getStripe();
    const rawBody = await request.text();
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      readWebhookSecret()
    );
  } catch (error) {
    console.error("Stripe webhook signature verification failed");
    console.error(error);
    return Response.json({ error: "Invalid Stripe signature." }, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as {
        id: string;
        payment_status?: string | null;
        amount_total?: number | null;
        currency?: string | null;
        payment_intent?: string | { id: string } | null;
        metadata?: Record<string, string> | null;
      };

      const bookingId = Number(session.metadata?.bookingId ?? "");
      const { booking, payment } = Number.isInteger(bookingId) && bookingId > 0
        ? await loadBookingAndPayment(bookingId)
        : { booking: null, payment: null };

      const decision = decideCheckoutSessionCompleted({
        session,
        booking: booking
          ? {
              id: booking.id,
              bookingReference: booking.bookingReference,
              status: booking.status,
              total: booking.total,
              seatFeesTotal: booking.seatFeesTotal ?? 0,
              inventoryHeld: booking.inventoryHeld,
            }
          : null,
        payment: payment
          ? {
              id: payment.id,
              bookingId: payment.bookingId,
              amount: payment.amount,
              status: payment.status,
              stripeCheckoutId: payment.stripeCheckoutId,
              stripePaymentIntentId: payment.stripePaymentIntentId,
            }
          : null,
      });

      console.log("Stripe webhook checkout.session.completed", {
        eventId: event.id,
        sessionId: session.id,
        action: decision.action,
        bookingReference: booking?.bookingReference,
      });

      if (decision.action === "reject") {
        return Response.json({ error: decision.reason }, { status: 400 });
      }

      if (decision.action === "mark_paid") {
        await upsertPaymentForBooking(
          decision.bookingId,
          buildSucceededPaymentValues({
            amountCents: decision.amountCents,
            sessionId: decision.sessionId,
            paymentIntentId: decision.paymentIntentId,
            paidAt: new Date().toISOString(),
          }),
          payment?.id,
          decision.amountCents
        );

        try {
          await transitionBookingStatus({
            bookingId: decision.bookingId,
            toStatus: "PAID",
            source: "PAYMENT",
          });
        } catch (error) {
          if (
            !isBookingDomainError(error) ||
            error.code !== "INVALID_BOOKING_TRANSITION"
          ) {
            throw error;
          }

          const latest = await db.orm.public.Booking.where({
            id: decision.bookingId,
          }).first();
          if (latest?.status !== "PAID") {
            throw error;
          }
        }
      }

      return Response.json({ received: true });
    }

    if (event.type === "checkout.session.expired") {
      const session = event.data.object as {
        id: string;
        metadata?: Record<string, string> | null;
      };

      const bookingId = Number(session.metadata?.bookingId ?? "");
      const { booking, payment } = Number.isInteger(bookingId) && bookingId > 0
        ? await loadBookingAndPayment(bookingId)
        : { booking: null, payment: null };

      const decision = decideCheckoutSessionExpired({
        session,
        booking: booking
          ? {
              id: booking.id,
              bookingReference: booking.bookingReference,
              status: booking.status,
              total: booking.total,
              seatFeesTotal: booking.seatFeesTotal ?? 0,
              inventoryHeld: booking.inventoryHeld,
            }
          : null,
        payment: payment
          ? {
              id: payment.id,
              bookingId: payment.bookingId,
              amount: payment.amount,
              status: payment.status,
              stripeCheckoutId: payment.stripeCheckoutId,
              stripePaymentIntentId: payment.stripePaymentIntentId,
            }
          : null,
      });

      console.log("Stripe webhook checkout.session.expired", {
        eventId: event.id,
        sessionId: session.id,
        action: decision.action,
        bookingReference: booking?.bookingReference,
      });

      if (decision.action === "reject") {
        return Response.json({ error: decision.reason }, { status: 400 });
      }

      if (decision.action === "expire_unpaid") {
        await upsertPaymentForBooking(
          decision.bookingId,
          buildExpiredPaymentValues({ sessionId: decision.sessionId }),
          payment?.id,
          booking?.total ?? 0
        );

        try {
          await transitionBookingStatus({
            bookingId: decision.bookingId,
            toStatus: "FAILED",
            source: "SYSTEM",
          });
        } catch (error) {
          if (
            !isBookingDomainError(error) ||
            error.code !== "INVALID_BOOKING_TRANSITION"
          ) {
            throw error;
          }

          const latest = await db.orm.public.Booking.where({
            id: decision.bookingId,
          }).first();
          if (
            latest?.status !== "FAILED" &&
            latest?.status !== "CANCELLED" &&
            latest?.status !== "PAID"
          ) {
            throw error;
          }
        }

        // Idempotent: DELETE assignments + reset seatFeesTotal.
        await releaseSeatAssignmentsForBooking(decision.bookingId);
      }

      return Response.json({ received: true });
    }

    console.log("Stripe webhook ignored event", {
      eventId: event.id,
      type: event.type,
    });

    return Response.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook processing failed", {
      eventId: event.id,
      type: event.type,
    });
    console.error(error);
    return Response.json({ error: "Webhook handler failed." }, { status: 500 });
  }
}
