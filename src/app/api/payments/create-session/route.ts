import { getCurrentUser } from "../../../../lib/auth";
import {
  holdBookingInventory,
  releaseBookingInventory,
} from "../../../../lib/booking-transitions";
import { isBookingDomainError } from "../../../../lib/booking-errors";
import { loadBookingLegsWithFlights } from "../../../../lib/booking-segments";
import {
  buildCheckoutLineItem,
  buildCheckoutProductCopy,
  buildCheckoutSessionMetadata,
  shouldReuseOpenCheckoutSession,
  shouldReleaseSeatsOnCheckoutSessionFailure,
  validatePayableBookingForCheckout,
} from "../../../../lib/payment-checkout";
import {
  PAYMENT_CURRENCY,
  PAYMENT_PROVIDER,
  PaymentError,
  getStripeSecretMode,
  isReusablePaymentStatus,
  isStripeTestModeReady,
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

function mapInventoryError(error: unknown) {
  if (!isBookingDomainError(error)) {
    return null;
  }

  if (error.code === "INSUFFICIENT_INVENTORY") {
    return new PaymentError(
      "Seats are no longer available for this trip.",
      409
    );
  }

  return new PaymentError("We couldn't start payment. Please try again.", 409);
}

export async function POST(request: Request) {
  let heldBookingId: number | null = null;
  let holdApplied = false;

  try {
    if (!isStripeTestModeReady()) {
      if (getStripeSecretMode() === "live") {
        throw new StripeConfigurationError(
          "Live Stripe keys are disabled for this phase. Use a Stripe TEST mode secret key (sk_test_...)."
        );
      }
      throw new StripeConfigurationError();
    }

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

    const [legs, passengers, existingPayment] = await Promise.all([
      loadBookingLegsWithFlights(booking),
      db.orm.public.Passenger.select("id").where({ bookingId: booking.id }).all(),
      db.orm.public.Payment.where({ bookingId: booking.id }).first(),
    ]);

    if (
      existingPayment &&
      !isReusablePaymentStatus(existingPayment.status) &&
      existingPayment.status !== "SUCCEEDED"
    ) {
      throw new PaymentError("This booking is not eligible for payment.", 409);
    }

    const { amountCents } = validatePayableBookingForCheckout({
      booking: {
        ...booking,
        seatFeesTotal: booking.seatFeesTotal ?? 0,
      },
      currentUserId: currentUser.id,
      passengerRows: passengers.length,
      segmentCount: legs.length,
      existingPayment: existingPayment
        ? {
            id: existingPayment.id,
            status: existingPayment.status,
            amount: existingPayment.amount,
            stripeCheckoutId: existingPayment.stripeCheckoutId,
          }
        : null,
    });

    const stripe = getStripe();
    const appUrl = getStripeAppUrl();

    // Reuse an open Checkout Session when practical (idempotent retries).
    if (existingPayment?.stripeCheckoutId) {
      try {
        const existingSession = await stripe.checkout.sessions.retrieve(
          existingPayment.stripeCheckoutId
        );

        if (
          shouldReuseOpenCheckoutSession({
            paymentStatus: existingPayment.status,
            stripeCheckoutId: existingPayment.stripeCheckoutId,
            sessionStatus: existingSession.status,
            sessionUrl: existingSession.url,
          })
        ) {
          if (!booking.inventoryHeld) {
            const held = await holdBookingInventory(booking.id);
            heldBookingId = held.booking.id;
            holdApplied = !held.noop;
          }

          return Response.json({
            success: true,
            checkoutUrl: existingSession.url,
            sessionId: existingSession.id,
            reused: true,
          });
        }
      } catch (error) {
        console.error("Unable to reuse Stripe Checkout Session", {
          bookingReference: booking.bookingReference,
          stripeCheckoutId: existingPayment.stripeCheckoutId,
        });
        console.error(error);
      }
    }

    try {
      const held = await holdBookingInventory(booking.id);
      heldBookingId = held.booking.id;
      // Only compensate inventory if THIS request newly acquired seats.
      holdApplied = !held.noop;
    } catch (error) {
      const mapped = mapInventoryError(error);
      if (mapped) {
        throw mapped;
      }
      throw error;
    }

    const outbound =
      legs.find((leg) => leg.segmentType === "OUTBOUND") ?? legs[0];
    const returnLeg = legs.find((leg) => leg.segmentType === "RETURN");

    if (!outbound) {
      throw new PaymentError("Flight not found.", 404);
    }

    const { productName, productDescription } = buildCheckoutProductCopy({
      isRoundTrip: Boolean(returnLeg),
      outboundCode: outbound.flight.code,
      returnCode: returnLeg?.flight.code,
      originCode: outbound.flight.originCode,
      destinationCode: outbound.flight.destinationCode,
    });

    let checkoutSession;

    try {
      checkoutSession = await stripe.checkout.sessions.create(
        {
          mode: "payment",
          // Card-only MVP — async payment methods are not enabled.
          payment_method_types: ["card"],
          line_items: [
            buildCheckoutLineItem({
              bookingReference: booking.bookingReference,
              amountCents,
              productName,
              productDescription,
            }),
          ],
          success_url: `${appUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${appUrl}/payment/cancel?booking=${encodeURIComponent(booking.bookingReference)}`,
          metadata: buildCheckoutSessionMetadata({
            bookingId: booking.id,
            bookingReference: booking.bookingReference,
            userId: currentUser.id,
          }),
        },
        {
          idempotencyKey: `checkout_create_${booking.id}_${amountCents}_${existingPayment?.stripeCheckoutId ?? "init"}`,
        }
      );
    } catch (error) {
      console.error("Stripe Checkout Session creation failed", {
        bookingReference: booking.bookingReference,
        bookingId: booking.id,
      });
      console.error(error);

      // Compensate sale inventory only. Keep SeatAssignment rows so the
      // customer does not lose seat selections on a transient Stripe failure.
      if (heldBookingId != null && holdApplied) {
        try {
          await releaseBookingInventory(heldBookingId);
          if (shouldReleaseSeatsOnCheckoutSessionFailure()) {
            // Intentionally disabled for D13.2 — seats remain assigned.
          }
        } catch (releaseError) {
          console.error("Failed to compensate inventory after Stripe error", {
            bookingId: heldBookingId,
          });
          console.error(releaseError);
        }
      }

      throw new PaymentError(
        "We couldn't start payment. Please try again.",
        502
      );
    }

    if (!checkoutSession.url) {
      if (heldBookingId != null && holdApplied) {
        try {
          await releaseBookingInventory(heldBookingId);
        } catch (releaseError) {
          console.error(releaseError);
        }
      }
      throw new PaymentError("Unable to create payment session.", 500);
    }

    const stripePaymentIntentId = getStripePaymentIntentId(
      checkoutSession.payment_intent
    );

    try {
      await db.transaction(async (tx) => {
        const paymentValues = {
          amount: amountCents,
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

      try {
        await releaseBookingInventory(booking.id);
        if (shouldReleaseSeatsOnCheckoutSessionFailure()) {
          // Intentionally disabled — seats remain after persist failure.
        }
      } catch (releaseError) {
        console.error(releaseError);
      }

      throw new PaymentError(
        "Unable to save payment session. Please try again.",
        500
      );
    }

    return Response.json({
      success: true,
      checkoutUrl: checkoutSession.url,
      sessionId: checkoutSession.id,
      reused: false,
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
