import { getCurrentUser } from "../../../../lib/auth";
import { loadBookingLegsWithFlights } from "../../../../lib/booking-segments";
import {
  PAYMENT_CURRENCY,
  PAYMENT_PROVIDER,
  PaymentError,
  isPayableBookingStatus,
  isReusablePaymentStatus,
  parseCreateSessionInput,
} from "../../../../lib/payments";
import {
  StripeConfigurationError,
  getStripe,
  getStripeAppUrl,
  getStripePaymentIntentId,
} from "../../../../lib/stripe";
import { db } from "../../../../prisma/db";

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return jsonError("Not authenticated.", 401);
    }

    if (currentUser.role !== "CUSTOMER") {
      return jsonError("Forbidden.", 403);
    }

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      throw new PaymentError("Invalid JSON body.", 400);
    }

    const { bookingReference } = parseCreateSessionInput(body);

    const booking = await db.orm.public.Booking.where({
      bookingReference,
    }).first();

    if (!booking) {
      throw new PaymentError("Booking not found.", 404);
    }

    if (booking.userId == null) {
      throw new PaymentError("Sign in is required before payment.", 403);
    }

    if (booking.userId !== currentUser.id) {
      throw new PaymentError("Forbidden.", 403);
    }

    if (!isPayableBookingStatus(booking.status)) {
      throw new PaymentError("This booking is not eligible for payment.", 409);
    }

    if (!Number.isInteger(booking.total) || booking.total <= 0) {
      throw new PaymentError("This booking is not eligible for payment.", 409);
    }

    const legs = await loadBookingLegsWithFlights(booking);
    const outbound =
      legs.find((leg) => leg.segmentType === "OUTBOUND") ?? legs[0];
    const returnLeg = legs.find((leg) => leg.segmentType === "RETURN");

    if (!outbound) {
      throw new PaymentError("Flight not found.", 404);
    }

    const productName = returnLeg
      ? `StarJet Round Trip ${outbound.flight.code}/${returnLeg.flight.code}`
      : `StarJet Flight ${outbound.flight.code}`;
    const productDescription = returnLeg
      ? `${outbound.flight.originCode} ⇄ ${outbound.flight.destinationCode}`
      : `${outbound.flight.originCode} → ${outbound.flight.destinationCode}`;

    const existingPayment = await db.orm.public.Payment.where({
      bookingId: booking.id,
    }).first();

    if (existingPayment?.status === "SUCCEEDED") {
      throw new PaymentError("This booking has already been paid.", 409);
    }

    if (
      existingPayment &&
      !isReusablePaymentStatus(existingPayment.status)
    ) {
      throw new PaymentError("This booking is not eligible for payment.", 409);
    }

    const stripe = getStripe();
    const appUrl = getStripeAppUrl();

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: PAYMENT_CURRENCY.toLowerCase(),
            unit_amount: booking.total,
            product_data: {
              name: productName,
              description: productDescription,
            },
          },
        },
      ],
      success_url: `${appUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/checkout?booking=${encodeURIComponent(booking.bookingReference)}`,
      metadata: {
        bookingId: String(booking.id),
        bookingReference: booking.bookingReference,
        userId: String(currentUser.id),
      },
    });

    if (!checkoutSession.url) {
      throw new PaymentError("Unable to create payment session.", 500);
    }

    const stripePaymentIntentId = getStripePaymentIntentId(
      checkoutSession.payment_intent
    );

    try {
      await db.transaction(async (tx) => {
        const paymentValues = {
          amount: booking.total,
          currency: PAYMENT_CURRENCY,
          status: "PENDING",
          provider: PAYMENT_PROVIDER,
          stripeCheckoutId: checkoutSession.id,
          stripePaymentIntentId,
          paidAt: null,
        };

        if (existingPayment) {
          await tx.orm.public.Payment.where({ id: existingPayment.id }).update(
            paymentValues
          );
        } else {
          await tx.orm.public.Payment.create({
            bookingId: booking.id,
            ...paymentValues,
          });
        }

        if (booking.status === "DRAFT") {
          await tx.orm.public.Booking.where({ id: booking.id }).update({
            status: "PENDING_PAYMENT",
          });
        }
      });
    } catch (error) {
      console.error(
        "Failed to persist payment after Stripe Checkout Session creation.",
        {
          bookingId: booking.id,
          bookingReference: booking.bookingReference,
          stripeCheckoutId: checkoutSession.id,
        }
      );
      console.error(error);
      throw new PaymentError(
        "Unable to save payment session. Please try again.",
        500
      );
    }

    return Response.json({
      success: true,
      checkoutUrl: checkoutSession.url,
      sessionId: checkoutSession.id,
    });
  } catch (error) {
    if (error instanceof PaymentError) {
      return jsonError(error.message, error.status);
    }

    if (error instanceof StripeConfigurationError) {
      return jsonError(error.message, 503);
    }

    console.error("Failed to create payment session:", error);
    return jsonError("Unable to create payment session.", 500);
  }
}
