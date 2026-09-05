import {
  GuestTripAccessError,
  requestGuestTripAccessCode,
} from "../../../../lib/guest-trip-access-service";
import { GUEST_TRIP_GENERIC_MESSAGE } from "../../../../lib/guest-trip-access";
import {
  rejectUntrustedMutation,
  sensitiveJson,
} from "../../../../lib/request-security";

export async function POST(request: Request) {
  const rejected = rejectUntrustedMutation(request);
  if (rejected) {
    return rejected;
  }

  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const payload =
      body && typeof body === "object"
        ? (body as Record<string, unknown>)
        : {};

    const bookingReference =
      typeof payload.bookingReference === "string"
        ? payload.bookingReference
        : "";
    const email = typeof payload.email === "string" ? payload.email : "";

    const result = await requestGuestTripAccessCode({
      bookingReference,
      email,
    });

    return sensitiveJson({
      success: true,
      message: result.message,
    });
  } catch (error) {
    if (error instanceof GuestTripAccessError) {
      return sensitiveJson({
        success: true,
        message: GUEST_TRIP_GENERIC_MESSAGE,
      });
    }

    console.error("Find trip request failed", {
      operation: "find-trip",
      code: error instanceof Error ? error.name : "unexpected",
    });

    return sensitiveJson({
      success: true,
      message: GUEST_TRIP_GENERIC_MESSAGE,
    });
  }
}
