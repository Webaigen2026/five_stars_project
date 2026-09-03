import { getCurrentUser } from "../../../../../lib/auth";
import { isAdmin, isStaffOrAdmin } from "../../../../../lib/authorization";
import { parsePositiveInt } from "../../../../../lib/admin-bookings";
import {
  CargoRequestError,
  parseCargoAdminUpdate,
  parseCargoStatus,
  toSafeCargoRequest,
} from "../../../../../lib/cargo";
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
      return jsonError("Cargo request not found.", 404);
    }

    const existing = await db.orm.public.CargoRequest.where({ id }).first();

    if (!existing) {
      return jsonError("Cargo request not found.", 404);
    }

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      throw new CargoRequestError("Invalid JSON body.", 400);
    }

    if (isAdmin(user.role)) {
      const input = parseCargoAdminUpdate(body);
      await db.orm.public.CargoRequest.where({ id }).update(input);
    } else {
      const status = parseCargoStatus(body);
      await db.orm.public.CargoRequest.where({ id }).update({ status });
    }

    const cargoRequest = await db.orm.public.CargoRequest.select(
      "id",
      "userId",
      "reference",
      "fullName",
      "email",
      "phone",
      "origin",
      "destination",
      "cargoType",
      "description",
      "quantity",
      "weight",
      "preferredDate",
      "status",
      "createdAt",
      "updatedAt"
    )
      .where({ id })
      .first();

    if (!cargoRequest) {
      return jsonError("Cargo request not found.", 404);
    }

    return Response.json({ request: toSafeCargoRequest(cargoRequest) });
  } catch (error) {
    if (error instanceof CargoRequestError) {
      return jsonError(error.message, error.status);
    }

    console.error("Failed to update cargo request:", error);
    return jsonError("Unable to update cargo request.", 500);
  }
}
