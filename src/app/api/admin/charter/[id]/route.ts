import { getCurrentUser } from "../../../../../lib/auth";
import { isAdmin, isStaffOrAdmin } from "../../../../../lib/authorization";
import { parsePositiveInt } from "../../../../../lib/admin-bookings";
import {
  CharterRequestError,
  parseCharterAdminUpdate,
  parseCharterStatus,
  toSafeCharterRequest,
} from "../../../../../lib/charter";
import { db } from "../../../../../prisma/db";

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return jsonError("Not authenticated.", 401);
    }

    if (!isStaffOrAdmin(user.role)) {
      return jsonError("Forbidden.", 403);
    }

    const { id: rawId } = await params;
    const id = parsePositiveInt(rawId);

    if (id == null) {
      return jsonError("Charter request not found.", 404);
    }

    const existing = await db.orm.public.CharterRequest.where({ id }).first();

    if (!existing) {
      return jsonError("Charter request not found.", 404);
    }

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      throw new CharterRequestError("Invalid JSON body.", 400);
    }

    if (isAdmin(user.role)) {
      const input = parseCharterAdminUpdate(body);
      await db.orm.public.CharterRequest.where({ id }).update(input);
    } else {
      const status = parseCharterStatus(body);
      await db.orm.public.CharterRequest.where({ id }).update({ status });
    }

    const charterRequest = await db.orm.public.CharterRequest.select(
      "id",
      "userId",
      "reference",
      "fullName",
      "email",
      "phone",
      "origin",
      "destination",
      "departureDate",
      "returnDate",
      "passengerCount",
      "aircraftPreference",
      "budget",
      "notes",
      "status",
      "createdAt",
      "updatedAt"
    )
      .where({ id })
      .first();

    if (!charterRequest) {
      return jsonError("Charter request not found.", 404);
    }

    return Response.json({ request: toSafeCharterRequest(charterRequest) });
  } catch (error) {
    if (error instanceof CharterRequestError) {
      return jsonError(error.message, error.status);
    }

    console.error("Failed to update charter request:", error);
    return jsonError("Unable to update charter request.", 500);
  }
}
