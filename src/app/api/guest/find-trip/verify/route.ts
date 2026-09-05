import {
  GuestTripAccessError,
  verifyGuestTripAccessCode,
} from "../../../../../lib/guest-trip-access-service";
import { GUEST_TRIP_CODE_ERROR } from "../../../../../lib/guest-trip-access";
import {
  rejectUntrustedMutation,
  sensitiveJson,
} from "../../../../../lib/request-security";

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
      throw new GuestTripAccessError(GUEST_TRIP_CODE_ERROR, 400);
    }

    const payload =
      body && typeof body === "object"
        ? (body as Record<string, unknown>)
        : {};

    const rawCode = typeof payload.code === "string" ? payload.code : "";
    const code = rawCode.replace(/\D/g, "").slice(0, 6);

    const result = await verifyGuestTripAccessCode({ code });

    return sensitiveJson({
      success: true,
      bookingReference: result.bookingReference,
    });
  } catch (error) {
    if (error instanceof GuestTripAccessError) {
      return sensitiveJson(
        { error: error.message },
        { status: error.status }
      );
    }

    console.error("Find trip verify failed", {
      operation: "find-trip-verify",
      code: error instanceof Error ? error.name : "unexpected",
    });

    return sensitiveJson(
      { error: GUEST_TRIP_CODE_ERROR },
      { status: 400 }
    );
  }
}
