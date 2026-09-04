import { getCurrentUser } from "../../../../../../lib/auth";
import {
  assignPassengerSeat,
  isSeatAssignmentError,
  seatAssignmentHttpStatus,
} from "../../../../../../lib/seat-assignments";

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ reference: string }> }
) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return jsonError("Not authenticated.", 401);
  }

  if (currentUser.role !== "CUSTOMER") {
    return jsonError("Forbidden.", 403);
  }

  const { reference: raw } = await context.params;
  const bookingReference = decodeURIComponent(raw).trim();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body.", 400);
  }

  const payload = (body ?? {}) as Record<string, unknown>;
  const bookingSegmentId = Number(payload.bookingSegmentId);
  const passengerId = Number(payload.passengerId);
  const seatNumber =
    typeof payload.seatNumber === "string" ? payload.seatNumber : "";

  // Ignore any client-supplied seatFeeCents / seatFeesTotal.
  if (
    !Number.isInteger(bookingSegmentId) ||
    bookingSegmentId <= 0 ||
    !Number.isInteger(passengerId) ||
    passengerId <= 0
  ) {
    return jsonError("Invalid seat assignment payload.", 400);
  }

  try {
    const result = await assignPassengerSeat({
      bookingReference,
      currentUserId: currentUser.id,
      bookingSegmentId,
      passengerId,
      seatNumber,
    });

    return Response.json({
      success: true,
      seatNumber: result.seatNumber,
      passengerId: result.passengerId,
      bookingSegmentId: result.bookingSegmentId,
      seatFeeCents: result.seatFeeCents,
      seatFeesTotal:
        "seatFeesTotal" in result ? result.seatFeesTotal : undefined,
    });
  } catch (error) {
    if (isSeatAssignmentError(error)) {
      return jsonError(error.message, seatAssignmentHttpStatus(error));
    }
    console.error("Seat assignment failed", error);
    return jsonError("Unable to assign that seat.", 500);
  }
}
